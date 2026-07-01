import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import {
  NotificationFeedClient,
  HEALTHY_CONNECTION_MS,
  buildFeedSessionMessage,
  dedupeById,
  urlBase64ToUint8Array,
  isPushSupported,
  type FeedItem,
} from '../notification-feed-client';

// ── test doubles ──────────────────────────────────────────────────────────

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const ADDR = 'ak_me';
const BASE = 'http://api.test';

function feedItem(id: number, over: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    type: 'debug-test',
    title: `t${id}`,
    body: `b${id}`,
    data: null,
    read_at: null,
    created_at: new Date(2026, 0, 1, 0, 0, id).toISOString(),
    ...over,
  };
}

/** Stateful fake backend behind an injectable `fetch`. */
type BackendInit = Partial<{ items: FeedItem[]; unread: number; vapidKey: string | null }>;

function makeBackend(init: BackendInit = {}) {
  const state = {
    items: init.items ?? [],
    unread: init.unread ?? 0,
    vapidKey: init.vapidKey ?? null,
    token: 'tok-ABCDEF',
    nonce: 'nonce-1',
  };
  // The request init is part of the signature so assertions can index
  // mock.calls[n][1] (body/headers) without fighting the tuple type.
  const fetchMock = vi.fn(async (input: RequestInfo | URL, req?: RequestInit) => {
    const url = String(input);
    const method = req?.method ?? 'GET';
    if (url.endsWith('/feed/challenge')) {
      return jsonRes({ nonce: state.nonce, expiresAt: new Date(Date.now() + 3e5).toISOString() });
    }
    if (url.endsWith('/feed/session')) {
      const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
      return jsonRes({ token: state.token, expiresAt });
    }
    if (url.includes('/feed/unread-count')) return jsonRes({ count: state.unread });
    if (url.includes('/feed?')) return jsonRes({ items: state.items, nextCursor: null });
    if (url.endsWith('/feed/read')) return jsonRes({ count: state.unread });
    if (url.endsWith('/vapid-public-key')) return jsonRes({ publicKey: state.vapidKey });
    // POST registers an endpoint, DELETE unsubscribes it; both just acknowledge.
    if (url.endsWith('/web-push/subscription')) return jsonRes({ ok: true, method });
    return jsonRes({}, 404);
  });
  return { state, fetchMock };
}

/**
 * A backend that can hold ONE response open, so a request can be parked across a
 * stop()/start() and released afterwards — the only way to land inside the awaits
 * where a restart makes `stopped` false again.
 */
function deferrableBackend(
  match: string,
  init: Parameters<typeof makeBackend>[0] = {},
) {
  const backend = makeBackend(init);
  const respond = backend.fetchMock.getMockImplementation()!;
  let resume: (() => void) | null = null;
  let armed = false;
  backend.fetchMock.mockImplementation(async (input: RequestInfo | URL, req?: RequestInit) => {
    if (armed && String(input).includes(match)) {
      armed = false;
      // Snapshot the response BEFORE parking, so the held call returns the data it
      // would have returned then — not whatever the state became while it waited.
      const res = await respond(input, req);
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      return res;
    }
    return respond(input, req);
  });
  return {
    ...backend,
    /** Hold the next matching request. */
    arm: () => { armed = true; },
    release: () => {
      const go = resume;
      // Cleared so `held` reads false again — a test that waits for the release to
      // be consumed needs the flag to fall, not just to have risen.
      resume = null;
      go?.();
    },
    get held() { return resume !== null; },
  };
}

/** Pre-seed a valid session so start() needs no wallet signature. */
function seedSession(token = 'cached-tok') {
  window.localStorage.setItem(
    `sh:notif:session:${BASE}:${ADDR}`,
    JSON.stringify({ token, expiresAt: Date.now() + 6e5 }),
  );
}

/** Fake socket.io factory that lets tests drive server events. */
function makeIo(opts: { transports?: unknown } = {}) {
  const ctl: {
    socket?: any;
    lastUrl?: string;
    lastOpts?: any;
    /** Fire a socket-level event (connect, disconnect, connect_error, …). */
    emit: (ev: string, ...args: unknown[]) => void;
    /** Fire a MANAGER-level event (reconnect_failed, error, …) on socket.io. */
    emitManager: (ev: string, ...args: unknown[]) => void;
    calls: number;
  } = { emit: () => {}, emitManager: () => {}, calls: 0 };
  const factory = vi.fn((url: string, o?: Record<string, unknown>) => {
    ctl.calls += 1;
    const handlers: Record<string, Array<(...a: unknown[]) => void>> = {};
    const mgrHandlers: Record<string, Array<(...a: unknown[]) => void>> = {};
    const socket: any = {
      connected: false,
      id: 'sock-1',
      // socket.io keeps this true while the manager is still retrying by itself,
      // and clears it when it destroys the socket (server-denied handshake).
      active: false,
      io: {
        on: vi.fn((ev: string, cb: (...a: unknown[]) => void) => {
          (mgrHandlers[ev] ||= []).push(cb);
        }),
        opts: { transports: o?.transports ?? opts.transports, upgrade: o?.upgrade },
        engine: { transport: { name: 'polling' }, readyState: 'open' },
      },
      on: (ev: string, cb: (...a: unknown[]) => void) => {
        (handlers[ev] ||= []).push(cb);
      },
      connect: vi.fn(() => {
        socket.connected = true;
      }),
      disconnect: vi.fn(() => {
        socket.connected = false;
      }),
    };
    ctl.socket = socket;
    ctl.lastUrl = url;
    ctl.lastOpts = o;
    ctl.emit = (ev, ...args) => (handlers[ev] || []).forEach((h) => h(...args));
    ctl.emitManager = (ev, ...args) => (mgrHandlers[ev] || []).forEach((h) => h(...args));
    return socket;
  });
  return { factory, ctl };
}

function makeClient(over: {
  backend?: ReturnType<typeof makeBackend>;
  io?: ReturnType<typeof makeIo>;
  signMessage?: ReturnType<typeof vi.fn>;
  maxItems?: number;
  /** Passed through so a test can wait on a specific internal milestone. */
  log?: (msg: string, err?: unknown) => void;
} = {}) {
  const backend = over.backend ?? makeBackend();
  const io = over.io ?? makeIo();
  const signMessage = over.signMessage ?? vi.fn(async () => 'sg_sig');
  const onItems = vi.fn();
  const onUnreadCount = vi.fn();
  const onNotification = vi.fn();
  const client = new NotificationFeedClient({
    baseUrl: BASE,
    address: ADDR,
    signMessage,
    onItems,
    onUnreadCount,
    onNotification,
    log: over.log ?? (() => {}),
    fetch: backend.fetchMock,
    io: io.factory,
    maxItems: over.maxItems,
  });
  return {
    client, backend, io, signMessage, onItems, onUnreadCount, onNotification,
  };
}

// ── pure helpers ────────────────────────────────────────────────────────────

describe('pure helpers', () => {
  it('buildFeedSessionMessage produces the exact 3-line message the server rebuilds', () => {
    expect(buildFeedSessionMessage('ak_x', 'n1')).toBe(
      'Superhero Notifications\nOpen notification feed session for ak_x\nnonce: n1',
    );
  });

  it('dedupeById keeps the first occurrence and preserves order', () => {
    const out = dedupeById([feedItem(3), feedItem(2), feedItem(3), feedItem(1)]);
    expect(out.map((i) => i.id)).toEqual([3, 2, 1]);
  });

  it('urlBase64ToUint8Array decodes base64url (padding + -/_)', () => {
    // 'AQID' -> [1,2,3]; base64url with a '-' and '_' round-trips too.
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
    expect(urlBase64ToUint8Array('AQID').length).toBe(3);
  });

  it('isPushSupported is false in a plain jsdom env (no serviceWorker)', () => {
    expect(isPushSupported()).toBe(false);
  });
});

// ── session bootstrap / caching / 401 ─────────────────────────────────────

describe('session', () => {
  afterEach(() => window.localStorage.clear());

  it('start() signs exactly once then fetches feed + unread-count', async () => {
    const { client, signMessage, backend } = makeClient();
    await client.start();
    expect(signMessage).toHaveBeenCalledTimes(1);
    const urls = backend.fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.endsWith('/feed/challenge'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/feed/session'))).toBe(true);
    expect(urls.some((u) => u.includes('/feed?'))).toBe(true);
    expect(urls.some((u) => u.includes('/feed/unread-count'))).toBe(true);
    client.stop();
  });

  it('reuses the in-memory token without re-signing on subsequent requests', async () => {
    const { client, signMessage } = makeClient();
    await client.start();
    await client.markRead([1]);
    await client.refresh();
    expect(signMessage).toHaveBeenCalledTimes(1);
    client.stop();
  });

  it('reuses a valid cached token from localStorage (no signature)', async () => {
    window.localStorage.setItem(
      `sh:notif:session:${BASE}:${ADDR}`,
      JSON.stringify({ token: 'cached-tok', expiresAt: Date.now() + 6e5 }),
    );
    const { client, signMessage, backend } = makeClient();
    await client.refresh();
    expect(signMessage).not.toHaveBeenCalled();
    // the bearer used should be the cached token
    const feedCall = backend.fetchMock.mock.calls.find((c) => String(c[0]).includes('/feed?'));
    expect((feedCall?.[1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer cached-tok',
    });
  });

  it('ignores a cached token within the 30s expiry skew and re-signs', async () => {
    window.localStorage.setItem(
      `sh:notif:session:${BASE}:${ADDR}`,
      JSON.stringify({ token: 'about-to-expire', expiresAt: Date.now() + 10_000 }),
    );
    const { client, signMessage } = makeClient();
    await client.refresh();
    expect(signMessage).toHaveBeenCalledTimes(1);
  });

  it('a start() after stop() re-bootstraps instead of adopting the stopped one', async () => {
    // Otherwise the second start() resolves having done nothing — the first one's
    // refresh refused to publish and its connectSocket refused to connect — while
    // the caller reports "connected" over an empty feed and no socket.
    let releaseSignature: (sig: string) => void = () => {};
    const signMessage = vi.fn(() => new Promise<string>((res) => {
      releaseSignature = res;
    }));
    const { client, io, onItems } = makeClient({
      backend: makeBackend({ items: [feedItem(1)], unread: 1 }),
      signMessage: signMessage as unknown as ReturnType<typeof vi.fn>,
    });

    const first = client.start();
    await vi.waitFor(() => expect(signMessage).toHaveBeenCalled()); // parked on the wallet
    client.stop(); // e.g. the account-change effect tearing this client down
    const second = client.start(); // reconnect while the first is still parked
    releaseSignature('sg_sig');
    await Promise.all([first, second]);

    // The second start must do the work itself. Adopting the first would resolve
    // having done nothing at all, while the caller reports "connected".
    expect(io.ctl.calls).toBe(1); // exactly one socket — no zombie from the first
    expect(onItems).toHaveBeenCalled();
    expect(signMessage).toHaveBeenCalledTimes(1); // and only one wallet prompt
    client.stop();
  });

  it('collapses concurrent bootstraps into ONE signature', async () => {
    const { client, signMessage } = makeClient();
    await Promise.all([client.refresh(), client.markRead([1])]);
    expect(signMessage).toHaveBeenCalledTimes(1);
  });

  it('on 401 clears the session, re-signs once, retries once, and succeeds', async () => {
    const backend = makeBackend();
    let feedHits = 0;
    backend.fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/feed/challenge')) return jsonRes({ nonce: 'n', expiresAt: new Date(Date.now() + 3e5).toISOString() });
      if (url.endsWith('/feed/session')) return jsonRes({ token: 't', expiresAt: new Date(Date.now() + 6e5).toISOString() });
      if (url.includes('/feed/unread-count')) return jsonRes({ count: 0 });
      if (url.includes('/feed?')) {
        feedHits += 1;
        return feedHits === 1 ? jsonRes({}, 401) : jsonRes({ items: [], nextCursor: null });
      }
      return jsonRes({}, 404);
    });
    const { client, signMessage } = makeClient({ backend });
    await client.refresh();
    expect(signMessage).toHaveBeenCalledTimes(2); // initial + re-sign after 401
    expect(feedHits).toBe(2); // retried once
  });

  it('a 401 on a stopped client never prompts the wallet or bins the session', async () => {
    // An account switch can land while any authed request is in flight; re-signing
    // then would pop a signature prompt for the account the user just left.
    const backend = makeBackend();
    const { client, signMessage } = makeClient({ backend });
    await client.start();
    signMessage.mockClear();
    backend.fetchMock.mockImplementation(async () => jsonRes({}, 401));
    client.stop();

    await expect(client.refresh()).rejects.toThrow(/401/);
    expect(signMessage).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(`sh:notif:session:${BASE}:${ADDR}`)).toBeTruthy();
  });

  it('reports a reusable session, which is what lets the UI auto-connect', async () => {
    // The bell auto-connects on this: start() then reuses the cached token with no
    // wallet interaction at all, so the no-prompt-on-load rule is not in play.
    const { client } = makeClient();
    expect(client.hasCachedSession()).toBe(false);
    await client.start();
    expect(client.hasCachedSession()).toBe(true);
    client.stop();
    // stop() drops the in-memory token but keeps the localStorage cache — exactly
    // the state a page reload lands in.
    expect(client.hasCachedSession()).toBe(true);
  });

  it('reports no reusable session for a token inside the expiry skew', () => {
    window.localStorage.setItem(
      `sh:notif:session:${BASE}:${ADDR}`,
      JSON.stringify({ token: 'about-to-expire', expiresAt: Date.now() + 10_000 }),
    );
    // Claiming this one is reusable would make the UI auto-connect straight into a
    // wallet prompt, which is the thing it exists to avoid.
    expect(makeClient().client.hasCachedSession()).toBe(false);
  });

  it('does NOT retry a second consecutive 401 — throws', async () => {
    const backend = makeBackend();
    backend.fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/feed/challenge')) return jsonRes({ nonce: 'n', expiresAt: new Date(Date.now() + 3e5).toISOString() });
      if (url.endsWith('/feed/session')) return jsonRes({ token: 't', expiresAt: new Date(Date.now() + 6e5).toISOString() });
      return jsonRes({}, 401); // everything 401s
    });
    const { client } = makeClient({ backend });
    await expect(client.refresh()).rejects.toThrow(/401/);
  });
});

// ── markRead optimistic update ────────────────────────────────────────────

describe('markRead', () => {
  afterEach(() => window.localStorage.clear());

  it('stamps read_at only on the targeted unread ids', async () => {
    const items = [feedItem(3), feedItem(2), feedItem(1)];
    const { client, onItems } = makeClient({ backend: makeBackend({ items, unread: 3 }) });
    await client.refresh();
    onItems.mockClear();
    await client.markRead([2]);
    const published = onItems.mock.calls.at(-1)![0] as FeedItem[];
    expect(published.find((i) => i.id === 2)!.read_at).toBeTruthy();
    expect(published.find((i) => i.id === 3)!.read_at).toBeNull();
    expect(published.find((i) => i.id === 1)!.read_at).toBeNull();
  });

  it('marks ALL unread read when no ids are given', async () => {
    const items = [feedItem(2), feedItem(1)];
    const { client, onItems } = makeClient({ backend: makeBackend({ items, unread: 2 }) });
    await client.refresh();
    onItems.mockClear();
    await client.markRead();
    const published = onItems.mock.calls.at(-1)![0] as FeedItem[];
    expect(published.every((i) => i.read_at)).toBe(true);
  });

  it('a mark-read abandoned by a restart never publishes its count', async () => {
    seedSession();
    const backend = deferrableBackend('/feed/read', { items: [feedItem(1)], unread: 3 });
    const { client, onUnreadCount } = makeClient({ backend });
    await client.start();

    backend.arm();
    const marking = client.markRead([1]); // parks mid-POST
    await vi.waitFor(() => expect(backend.held).toBe(true));
    client.stop();

    backend.state.items = [feedItem(2)];
    backend.state.unread = 9;
    await client.start(); // fresh run publishes 9

    backend.release();
    await marking;

    expect(onUnreadCount).toHaveBeenLastCalledWith(9); // not the stale 3
    client.stop();
  });

  it('publishes the server-returned unread count', async () => {
    const backend = makeBackend({ items: [feedItem(1)], unread: 5 });
    const { client, onUnreadCount } = makeClient({ backend });
    await client.refresh();
    backend.state.unread = 4;
    await client.markRead([1]);
    expect(onUnreadCount).toHaveBeenLastCalledWith(4);
  });
});

// ── refresh coalescing + item cap ─────────────────────────────────────────

describe('refresh', () => {
  afterEach(() => window.localStorage.clear());

  it('coalesces concurrent refresh() calls into one round of fetches', async () => {
    const backend = makeBackend({ items: [feedItem(1)], unread: 0 });
    const { client } = makeClient({ backend });
    await client.start(); // establishes token; start() calls refresh once
    const before = backend.fetchMock.mock.calls.filter((c) => String(c[0]).includes('/feed?')).length;
    await Promise.all([client.refresh(), client.refresh(), client.refresh()]);
    const after = backend.fetchMock.mock.calls.filter((c) => String(c[0]).includes('/feed?')).length;
    expect(after - before).toBe(1); // three concurrent → one fetch
    client.stop();
  });

  it('a refresh abandoned by a restart never overwrites the new run\'s feed', async () => {
    // If the stale snapshot lands last it sticks: the badge is wrong, and an item
    // it drops from `items` is no longer deduped — the next echo of that item
    // toasts again and inflates the count further.
    seedSession();
    const backend = deferrableBackend('/feed?', { items: [feedItem(1)], unread: 1 });
    const { client, onItems, onUnreadCount } = makeClient({ backend });

    backend.arm();
    const first = client.start(); // parks holding the pre-restart snapshot
    await vi.waitFor(() => expect(backend.held).toBe(true));
    client.stop();

    backend.state.items = [feedItem(2)];
    backend.state.unread = 5;
    await client.start(); // the new run publishes the fresh snapshot

    backend.release(); // ...and only now does the stale one resolve
    await first;

    expect((onItems.mock.calls.at(-1)![0] as FeedItem[]).map((i) => i.id)).toEqual([2]);
    expect(onUnreadCount).toHaveBeenLastCalledWith(5);
    expect(client.getItems().map((i) => i.id)).toEqual([2]);
    client.stop();
  });

  it('caps the in-memory list to maxItems', async () => {
    const items = Array.from({ length: 10 }, (_, i) => feedItem(10 - i));
    const { client, onItems } = makeClient({ backend: makeBackend({ items }), maxItems: 3 });
    await client.refresh();
    expect((onItems.mock.calls.at(-1)![0] as FeedItem[]).length).toBe(3);
  });
});

// ── socket layer ──────────────────────────────────────────────────────────

describe('socket', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('connects with the auth token and polling-only/forceNew options', async () => {
    const { client, io } = makeClient();
    await client.start();
    expect(io.ctl.lastUrl).toBe(`${BASE}/notifications`);
    expect(io.ctl.lastOpts).toMatchObject({
      auth: { token: 'tok-ABCDEF' },
      transports: ['polling'],
      upgrade: false,
      forceNew: true,
    });
    client.stop();
  });

  it('re-fetches the source of truth on every (re)connect', async () => {
    const { client, io, onUnreadCount } = makeClient({ backend: makeBackend({ unread: 7 }) });
    await client.start();
    onUnreadCount.mockClear();
    io.ctl.socket.connected = true;
    io.ctl.emit('connect');
    await vi.waitFor(() => expect(onUnreadCount).toHaveBeenCalledWith(7));
    client.stop();
  });

  it('prepends a live notification and fires callbacks; ignores duplicate ids', async () => {
    const {
      client, io, onNotification, onItems,
    } = makeClient();
    await client.start();
    onItems.mockClear();
    onNotification.mockClear();
    io.ctl.emit('notification', feedItem(99, { title: 'live' }));
    expect(onNotification).toHaveBeenCalledTimes(1);
    expect((onItems.mock.calls.at(-1)![0] as FeedItem[])[0].id).toBe(99);
    onNotification.mockClear();
    io.ctl.emit('notification', feedItem(99)); // echo of same id
    expect(onNotification).not.toHaveBeenCalled();
    client.stop();
  });

  it('ignores a malformed "unread-count" payload instead of throwing', async () => {
    // Untrusted wire data, and destructuring it threw INSIDE the handler rather
    // than being ignored. The badge resyncs from REST anyway, so dropping a
    // nonsense event costs nothing.
    const { client, io, onUnreadCount } = makeClient({ backend: makeBackend({ unread: 3 }) });
    await client.start();
    onUnreadCount.mockClear();

    expect(() => io.ctl.emit('unread-count')).not.toThrow();
    expect(() => io.ctl.emit('unread-count', null)).not.toThrow();
    expect(() => io.ctl.emit('unread-count', {})).not.toThrow();
    expect(() => io.ctl.emit('unread-count', { count: 'seven' })).not.toThrow();
    expect(onUnreadCount).not.toHaveBeenCalled();

    io.ctl.emit('unread-count', { count: 8 }); // and a real one still lands
    expect(onUnreadCount).toHaveBeenLastCalledWith(8);
    client.stop();
  });

  it('on "io server disconnect" first reconnects reusing the token (no re-sign)', async () => {
    vi.useFakeTimers();
    const { client, io, signMessage } = makeClient();
    await client.start();
    signMessage.mockClear();
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1100);
    expect(io.ctl.socket.connect).toHaveBeenCalled();
    expect(signMessage).not.toHaveBeenCalled(); // reused token, no signature
    client.stop();
  });

  it('re-signs on a second server disconnect when the server says the token is dead', async () => {
    vi.useFakeTimers();
    const backend = makeBackend();
    let sessionExpired = false;
    backend.fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/feed/challenge')) return jsonRes({ nonce: 'n', expiresAt: new Date(Date.now() + 3e5).toISOString() });
      if (url.endsWith('/feed/session')) {
        sessionExpired = false; // the fresh token works again
        return jsonRes({ token: 'fresh-tok', expiresAt: new Date(Date.now() + 6e5).toISOString() });
      }
      if (sessionExpired) return jsonRes({}, 401);
      if (url.includes('/feed/unread-count')) return jsonRes({ count: 0 });
      if (url.includes('/feed?')) return jsonRes({ items: [], nextCursor: null });
      return jsonRes({}, 404);
    });
    const { client, io, signMessage } = makeClient({ backend });
    await client.start();
    signMessage.mockClear();
    sessionExpired = true;

    io.ctl.emit('disconnect', 'io server disconnect'); // #1 → reconnect, no prompt
    await vi.advanceTimersByTimeAsync(1100);
    expect(signMessage).not.toHaveBeenCalled();
    io.ctl.emit('disconnect', 'io server disconnect'); // #2 → revalidate → 401 → re-sign
    await vi.advanceTimersByTimeAsync(1600);

    expect(signMessage).toHaveBeenCalledTimes(1);
    // and the rebuilt socket carries the token that signature minted
    expect(io.ctl.calls).toBe(2);
    expect(io.ctl.lastOpts).toMatchObject({ auth: { token: 'fresh-tok' } });
    client.stop();
  });

  it('revalidates WITHOUT a wallet prompt when the token is still good', async () => {
    // The gateway also kicks for reasons no signature can fix (per-address cap,
    // failed join). REST still accepting the token proves it, so recovery is just
    // a socket rebuild — asking the wallet to re-sign here is pure annoyance.
    vi.useFakeTimers();
    const { client, io, signMessage } = makeClient();
    await client.start();
    signMessage.mockClear();
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1100);
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1600);
    expect(signMessage).not.toHaveBeenCalled();
    expect(io.ctl.calls).toBe(2); // socket rebuilt with the same token
    client.stop();
  });

  it('keeps the cached session when the API is unreachable during revalidation', async () => {
    // Blindly clearing the token here would destroy a perfectly good session and
    // prompt the wallet every time the network blipped.
    vi.useFakeTimers();
    const {
      client, io, signMessage, backend,
    } = makeClient();
    await client.start();
    signMessage.mockClear();
    backend.fetchMock.mockRejectedValue(new Error('offline'));
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1100);
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1600);
    expect(signMessage).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(`sh:notif:session:${BASE}:${ADDR}`)!).token)
      .toBe('tok-ABCDEF');
    client.stop();
  });

  it('escalates even when each rejected attempt fires "connect" first', async () => {
    // The gateway authorises in handleConnection, which Nest runs AFTER socket.io
    // has sent the namespace CONNECT — so every rejected attempt looks like
    // connect-then-kick. Treating that 'connect' as success reset the ladder and
    // looped token reuse forever, never reaching revalidation.
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    const kick = () => {
      io.ctl.socket.connected = true;
      io.ctl.emit('connect');
      io.ctl.socket.connected = false;
      io.ctl.emit('disconnect', 'io server disconnect');
    };

    kick(); // failure #1 → token-reuse reconnect
    await vi.advanceTimersByTimeAsync(1100);
    expect(io.ctl.socket.connect).toHaveBeenCalled();
    expect(io.ctl.calls).toBe(1);

    kick(); // failure #2 → revalidate + rebuild (unreachable before the fix)
    await vi.advanceTimersByTimeAsync(1600);
    expect(io.ctl.calls).toBe(2);
    client.stop();
  });

  it('gives up after the revalidated socket is rejected again', async () => {
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    const kick = () => {
      io.ctl.emit('connect');
      io.ctl.emit('disconnect', 'io server disconnect');
    };
    kick();
    await vi.advanceTimersByTimeAsync(1100);
    kick();
    await vi.advanceTimersByTimeAsync(1600);
    expect(io.ctl.calls).toBe(2);
    io.ctl.socket.connect.mockClear();
    kick(); // third failure → stop; REST remains the source of truth
    await vi.advanceTimersByTimeAsync(5000);
    expect(io.ctl.calls).toBe(2); // no further rebuild
    expect(io.ctl.socket.connect).not.toHaveBeenCalled();
    client.stop();
  });

  it('a connection that HELD starts a clean episode on its next drop', async () => {
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    // Burn the ladder down to "already revalidated once".
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1100);
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1600);
    expect(io.ctl.calls).toBe(2);

    // Now a real session: connected, holds past the healthy threshold, then drops.
    io.ctl.emit('connect');
    await vi.advanceTimersByTimeAsync(HEALTHY_CONNECTION_MS + 1000);
    io.ctl.socket.connect.mockClear();
    io.ctl.emit('disconnect', 'io server disconnect');
    await vi.advanceTimersByTimeAsync(1100);
    // Back at rung 1 — a plain token-reuse reconnect, not "giving up".
    expect(io.ctl.socket.connect).toHaveBeenCalled();
    client.stop();
  });

  it('ignores connect_error while socket.io is still retrying on its own', async () => {
    vi.useFakeTimers();
    const { client, io, signMessage } = makeClient();
    await client.start();
    io.ctl.socket.connect.mockClear();
    signMessage.mockClear(); // ignore start()'s own bootstrap signature
    io.ctl.socket.active = true; // manager will retry by itself
    io.ctl.emit('connect_error', new Error('xhr poll error'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(io.ctl.socket.connect).not.toHaveBeenCalled();
    expect(signMessage).not.toHaveBeenCalled();
    client.stop();
  });

  it('recovers from a denied handshake (connect_error with nothing left retrying)', async () => {
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    io.ctl.socket.active = false; // socket.io destroyed it — no auto-retry
    io.ctl.emit('connect_error', new Error('unauthorized'));
    await vi.advanceTimersByTimeAsync(1100);
    expect(io.ctl.socket.connect).toHaveBeenCalled();
    io.ctl.emit('connect_error', new Error('unauthorized'));
    await vi.advanceTimersByTimeAsync(1600);
    expect(io.ctl.calls).toBe(2); // revalidated + rebuilt
    client.stop();
  });

  it('recovers when socket.io exhausts its reconnection attempts', async () => {
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    io.ctl.socket.connect.mockClear();
    io.ctl.emitManager('reconnect_failed');
    await vi.advanceTimersByTimeAsync(1100);
    expect(io.ctl.socket.connect).toHaveBeenCalled();
    client.stop();
  });

  /** Drive the ladder to the rung after which we give up. */
  async function exhaustRecovery(io: ReturnType<typeof makeIo>) {
    const kick = () => {
      io.ctl.emit('connect');
      io.ctl.emit('disconnect', 'io server disconnect');
    };
    kick(); // rung 1 → reconnect reusing the token
    await vi.advanceTimersByTimeAsync(1100);
    kick(); // rung 2 → revalidate + rebuild
    await vi.advanceTimersByTimeAsync(1600);
    kick(); // rung 3 → give up
    await vi.advanceTimersByTimeAsync(1600);
    return kick;
  }

  it('reconnects with the existing token when the tab becomes visible again', async () => {
    // Returning to a tab must never surprise the user with a wallet prompt for
    // what is only a resumed connection.
    vi.useFakeTimers();
    const { client, io, signMessage } = makeClient();
    await client.start();
    signMessage.mockClear();
    io.ctl.socket.connected = false;
    io.ctl.socket.connect.mockClear();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(io.ctl.socket.connect).toHaveBeenCalled();
    expect(signMessage).not.toHaveBeenCalled();
    client.stop();
  });

  const feedFetches = (backend: ReturnType<typeof makeBackend>) => backend.fetchMock.mock.calls
    .filter((c) => String(c[0]).includes('/feed?')).length;

  it('re-syncs the feed from REST on tab-return when the socket is down', async () => {
    // REST is the source of truth and the live layer is deliberately bounded, so
    // this is what keeps the feed from sitting frozen until a reload.
    const backend = makeBackend({ items: [feedItem(1)], unread: 1 });
    const { client, io, onUnreadCount } = makeClient({ backend });
    await client.start();
    io.ctl.socket.connected = false;
    backend.state.items = [feedItem(2), feedItem(1)];
    backend.state.unread = 4;
    onUnreadCount.mockClear();

    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(onUnreadCount).toHaveBeenLastCalledWith(4));
    expect(client.getItems().map((i) => i.id)).toEqual([2, 1]);
    client.stop();
  });

  it('does NOT re-fetch on tab-return while the socket is healthy', async () => {
    // The live layer is already carrying the feed; spending two requests per tab
    // focus on top of it is pure waste.
    const backend = makeBackend();
    const { client, io } = makeClient({ backend });
    await client.start();
    io.ctl.socket.connected = true;
    const before = feedFetches(backend);

    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();

    expect(feedFetches(backend)).toBe(before);
    client.stop();
  });

  it('still re-syncs from REST after the live layer has given up for good', async () => {
    // The scenario the give-up rung is only acceptable in: no socket will ever
    // reconnect, and the feed has to keep updating anyway.
    vi.useFakeTimers();
    const backend = makeBackend({ unread: 0 });
    const { client, io, onUnreadCount } = makeClient({ backend });
    await client.start();
    await exhaustRecovery(io);
    vi.useRealTimers();

    io.ctl.socket.connected = false;
    backend.state.unread = 6;
    onUnreadCount.mockClear();

    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(onUnreadCount).toHaveBeenLastCalledWith(6));
    client.stop();
  });

  it('a tab-return re-opens only the cheap rung, not the re-sign budget', async () => {
    // Otherwise tab switching mints a fresh wallet prompt every time, which is
    // exactly what the bounded ladder exists to prevent.
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    const kick = await exhaustRecovery(io);
    expect(io.ctl.calls).toBe(2); // one rebuild, from the single revalidation

    io.ctl.socket.connected = false;
    io.ctl.socket.connect.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(io.ctl.socket.connect).toHaveBeenCalled(); // cheap retry allowed

    kick(); // → reconnect (the cheap rung was re-opened)
    await vi.advanceTimersByTimeAsync(1100);
    kick(); // → give up, because the re-sign was already spent
    await vi.advanceTimersByTimeAsync(1600);
    expect(io.ctl.calls).toBe(2); // no second revalidation, no rebuild
    client.stop();
  });

  it('stop() unregisters the visibility handler', async () => {
    vi.useFakeTimers();
    const { client, io } = makeClient();
    await client.start();
    client.stop();
    io.ctl.socket.connect.mockClear();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(io.ctl.socket.connect).not.toHaveBeenCalled();
  });

  it('ignores transport-level disconnects (socket.io auto-reconnects)', async () => {
    vi.useFakeTimers();
    const { client, io, signMessage } = makeClient();
    await client.start();
    signMessage.mockClear();
    io.ctl.socket.connect.mockClear();
    io.ctl.emit('disconnect', 'transport close');
    await vi.advanceTimersByTimeAsync(2000);
    expect(io.ctl.socket.connect).not.toHaveBeenCalled();
    expect(signMessage).not.toHaveBeenCalled();
    client.stop();
  });

  it('a live event after stop() never publishes onto the next account', async () => {
    // NotificationsProvider runs ONE useNotifications for the app, so every client
    // instance shares the same React setters — a stopped instance that still
    // published would overwrite whichever account is on screen now.
    const {
      client, io, onItems, onUnreadCount, onNotification,
    } = makeClient({ backend: makeBackend({ items: [feedItem(1)], unread: 1 }) });
    await client.start();
    client.stop();
    onItems.mockClear();
    onUnreadCount.mockClear();
    onNotification.mockClear();

    io.ctl.emit('notification', feedItem(99, { title: 'previous account' }));
    io.ctl.emit('unread-count', { count: 42 });

    expect(onItems).not.toHaveBeenCalled();
    expect(onUnreadCount).not.toHaveBeenCalled();
    expect(onNotification).not.toHaveBeenCalled();
    // and the local mirrors stayed put, so a later markRead() can't resurrect it
    expect(client.getItems().some((i) => i.id === 99)).toBe(false);
  });

  it('a bootstrap that outlives a restart does not open a second socket', async () => {
    // The gap this closes: doStart proved it owned the run before the refresh, then
    // connected unconditionally after it. A stop()+start() in between leaves
    // isRunning true, so `stopped` alone waves the zombie through.
    seedSession();
    const backend = deferrableBackend('/feed?');
    const { client, io } = makeClient({ backend });

    backend.arm();
    const first = client.start(); // parks on the initial feed load
    await vi.waitFor(() => expect(backend.held).toBe(true));
    client.stop();
    await client.start(); // the new run connects
    expect(io.ctl.calls).toBe(1);

    backend.release();
    await first;

    expect(io.ctl.calls).toBe(1); // still one socket — the zombie stood down
    client.stop();
  });

  it('a revalidation that outlives a restart does not rebuild the socket', async () => {
    // Same trap one level down: stop() cancels a PENDING recovery timer, but one
    // that already fired is sitting inside the probe when the restart happens.
    vi.useFakeTimers();
    seedSession();
    const backend = deferrableBackend('/feed/unread-count');
    const { client, io } = makeClient({ backend });
    await client.start();

    // Disconnect-only kicks: a 'connect' would trigger a refresh whose own
    // unread-count fetch would consume the hold meant for the probe.
    io.ctl.emit('disconnect', 'io server disconnect'); // rung 1 → reconnect
    await vi.advanceTimersByTimeAsync(1100);
    backend.arm(); // hold the revalidation probe
    io.ctl.emit('disconnect', 'io server disconnect'); // rung 2 → revalidate
    await vi.advanceTimersByTimeAsync(1600);
    await vi.waitFor(() => expect(backend.held).toBe(true));

    client.stop();
    await client.start(); // new run, new socket
    const socketsAfterRestart = io.ctl.calls;
    backend.release();
    await vi.advanceTimersByTimeAsync(100);

    expect(io.ctl.calls).toBe(socketsAfterRestart);
    client.stop();
  });

  it('a recovery timer from a previous run leaves the new run\'s socket alone', async () => {
    // stop() cancels a pending timer, so the reachable path is a plain restart:
    // enablePush() calls start() whenever the UI believes it is disconnected, which
    // can happen with a reconnect already scheduled.
    vi.useFakeTimers();
    seedSession();
    const { client, io } = makeClient();
    await client.start();
    io.ctl.emit('disconnect', 'io server disconnect'); // rung 1 → reconnect in 1s

    await client.start(); // new run, new socket
    expect(io.ctl.calls).toBe(2);
    io.ctl.socket.connect.mockClear();

    await vi.advanceTimersByTimeAsync(1100); // the stale timer fires

    expect(io.ctl.socket.connect).not.toHaveBeenCalled();
    client.stop();
  });

  it('stop() disconnects the socket; the cached session survives for a later refresh', async () => {
    const { client, io, signMessage } = makeClient();
    await client.start();
    client.stop();
    expect(io.ctl.socket.disconnect).toHaveBeenCalled();
    // stop() drops the in-memory token but leaves the localStorage cache intact,
    // so a later refresh reuses it without prompting the wallet again.
    signMessage.mockClear();
    await client.refresh();
    expect(signMessage).not.toHaveBeenCalled();
    client.stop();
  });
});

// ── web push ──────────────────────────────────────────────────────────────

describe('web push', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // vi.unstubAllGlobals() does NOT undo defineProperty, so the fake
    // navigator.serviceWorker below outlives the block that installed it and makes
    // isPushSupported() lie for everything that runs after — see the hygiene check
    // at the end of this file.
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
    window.localStorage.clear();
  });

  function stubPushEnv(permission: NotificationPermission, existingSub: unknown = null) {
    const subscribe = vi.fn(async () => ({
      endpoint: 'https://push.example/x',
      options: { applicationServerKey: null },
      toJSON: () => ({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }),
      unsubscribe: vi.fn(async () => true),
    }));
    /**
     * A browser call a test can hold open, so a stop() can land INSIDE it — the
     * only way to reach the state where an abandoned account is still mid-flight.
     */
    function parkable<T>(result: () => T) {
      let armed = false;
      let resume: (() => void) | null = null;
      const fn = vi.fn(async () => {
        if (armed) {
          armed = false;
          await new Promise<void>((resolve) => { resume = resolve; });
        }
        return result();
      });
      return {
        fn,
        arm: () => { armed = true; },
        release: () => {
          const go = resume;
          resume = null; // so `held` falls again once released
          go?.();
        },
        get held() { return resume !== null; },
      };
    }

    const getSubscription = parkable(() => existingSub);
    const reg = {
      pushManager: {
        getSubscription: getSubscription.fn,
        subscribe,
      },
    };
    // The OS permission prompt is by far the widest window an account switch can
    // land in — it can sit unanswered for minutes.
    const prompt = parkable(() => permission);
    vi.stubGlobal('Notification', { permission, requestPermission: prompt.fn });
    vi.stubGlobal('PushManager', () => {});
    // Captures the client's 'message' listener so tests can post what the service
    // worker sends on pushsubscriptionchange.
    const swListeners: Record<string, Array<(e: MessageEvent) => void>> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn(async () => reg),
        getRegistration: vi.fn(async () => reg),
        ready: Promise.resolve(reg),
        addEventListener: (ev: string, cb: (e: MessageEvent) => void) => {
          (swListeners[ev] ||= []).push(cb);
        },
        removeEventListener: (ev: string, cb: (e: MessageEvent) => void) => {
          swListeners[ev] = (swListeners[ev] || []).filter((h) => h !== cb);
        },
      },
    });
    const postFromSw = (data: unknown) => {
      (swListeners.message || []).forEach((h) => h({ data } as MessageEvent));
    };
    return {
      reg,
      subscribe,
      postFromSw,
      prompt,
      getSubscription,
      /** The raw listener list, so a test can keep a handle across a stop(). */
      swListeners,
    };
  }

  /** A subscription object as `pushManager.getSubscription()` returns it. */
  function existingSubscription(endpoint = 'https://push.example/x') {
    return {
      endpoint,
      options: { applicationServerKey: null },
      toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
      unsubscribe: vi.fn(async () => true),
    };
  }

  const subCalls = (backend: ReturnType<typeof makeBackend>) => backend.fetchMock.mock.calls
    .filter((c) => String(c[0]).endsWith('/web-push/subscription'));

  it('enablePush returns "unconfigured" when the server has no VAPID key', async () => {
    stubPushEnv('granted');
    const { client } = makeClient({ backend: makeBackend({ vapidKey: null }) });
    await expect(client.enablePush()).resolves.toBe('unconfigured');
  });

  it('enablePush subscribes and POSTs the subscription under the bearer', async () => {
    const { subscribe } = stubPushEnv('granted');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });
    await expect(client.enablePush()).resolves.toBe('subscribed');
    expect(subscribe).toHaveBeenCalled();
    const subCall = backend.fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/web-push/subscription'));
    expect(subCall).toBeTruthy();
    expect(JSON.parse((subCall![1] as RequestInit).body as string)).toMatchObject({
      endpoint: 'https://push.example/x',
      keys: { p256dh: 'p', auth: 'a' },
    });
  });

  it('enablePush returns "denied" when the user blocks notifications', async () => {
    stubPushEnv('denied');
    const { client } = makeClient({ backend: makeBackend({ vapidKey: 'AQID' }) });
    await expect(client.enablePush()).resolves.toBe('denied');
  });

  /** Record whichever address currently owns this browser's endpoint. */
  function setPushOwner(address: string, endpoint = 'https://push.example/x') {
    window.localStorage.setItem(
      `sh:notif:push-owner:${BASE}`,
      JSON.stringify({ endpoint, address }),
    );
  }

  const pushOwner = () => JSON.parse(window.localStorage.getItem(`sh:notif:push-owner:${BASE}`) || 'null');

  it('re-asserts the subscription on start when this address owns it', async () => {
    // The server prunes an endpoint the push service reports as gone (404/410),
    // which leaves the bell reporting "subscribed" with no server row and no OS
    // notifications until something re-registers it.
    stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR);
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });

    await client.start();
    await vi.waitFor(() => expect(subCalls(backend).length).toBe(1));
    expect(JSON.parse(subCalls(backend)[0][1]!.body as string)).toMatchObject({
      endpoint: 'https://push.example/x',
      keys: { p256dh: 'p', auth: 'a' },
    });
    client.stop();
  });

  it('does NOT re-assert for an address that never enabled push here', async () => {
    // A subscription is per BROWSER: inheriting another account's OS-level push
    // without ever asking would be a consent bug, not a repair.
    stubPushEnv('granted', existingSubscription());
    const backend = makeBackend({ vapidKey: 'AQID' }); // no owner marker for ADDR
    const { client } = makeClient({ backend });

    await client.start();
    await Promise.resolve();
    expect(subCalls(backend)).toHaveLength(0);
    client.stop();
  });

  it('does NOT steal the endpoint from the account that owns it', async () => {
    // A subscription is per BROWSER and the server keys its row on the endpoint, so
    // only one address can be registered at a time. When ANOTHER account owns it,
    // this one must report "not subscribed" and leave the registration alone —
    // otherwise both accounts claim it and every connect flip-flops who gets push.
    stubPushEnv('granted', existingSubscription());
    setPushOwner('ak_other');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });

    await expect(client.getPushState()).resolves.toBe('default');
    await client.start();
    await Promise.resolve();
    expect(subCalls(backend)).toHaveLength(0);
    expect(pushOwner()).toMatchObject({ address: 'ak_other' });
    client.stop();
  });

  it('transfers ownership on enablePush so the previous owner stops claiming it', async () => {
    stubPushEnv('granted', existingSubscription());
    setPushOwner('ak_other');
    const { client } = makeClient({ backend: makeBackend({ vapidKey: 'AQID' }) });

    await expect(client.enablePush()).resolves.toBe('subscribed');

    // One record, naming exactly one owner — the account that just registered.
    expect(pushOwner()).toMatchObject({ address: ADDR, endpoint: 'https://push.example/x' });
    await expect(client.getPushState()).resolves.toBe('subscribed');
  });

  it('disablePush leaves another account\'s subscription intact', async () => {
    // Unsubscribing here would kill the OWNER's OS push, and the DELETE would drop
    // their server row.
    const sub = existingSubscription();
    stubPushEnv('granted', sub);
    setPushOwner('ak_other');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });

    await client.disablePush();

    expect(sub.unsubscribe).not.toHaveBeenCalled();
    expect(subCalls(backend)).toHaveLength(0); // no DELETE either
    expect(pushOwner()).toMatchObject({ address: 'ak_other' });
  });

  it('disablePush unsubscribes and DELETEs when this address owns it', async () => {
    const sub = existingSubscription();
    stubPushEnv('granted', sub);
    setPushOwner(ADDR);
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });

    await client.disablePush();

    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(subCalls(backend)).toHaveLength(1);
    expect(subCalls(backend)[0][1]!.method).toBe('DELETE');
    expect(pushOwner()).toBeNull();
  });

  it('ignores a legacy per-address marker (it could not express exclusivity)', async () => {
    stubPushEnv('granted', existingSubscription());
    window.localStorage.setItem(`sh:notif:push-owner:${BASE}:${ADDR}`, 'https://push.example/x');
    const { client } = makeClient({ backend: makeBackend({ vapidKey: 'AQID' }) });

    // Reads as "not subscribed" — one enable-push click re-registers and upgrades
    // the record, reusing the browser's existing subscription (no new prompt).
    await expect(client.getPushState()).resolves.toBe('default');
    await expect(client.enablePush()).resolves.toBe('subscribed');
    expect(pushOwner()).toMatchObject({ address: ADDR });
    expect(window.localStorage.getItem(`sh:notif:push-owner:${BASE}:${ADDR}`)).toBeNull();
  });

  it('registers a rotated subscription the worker hands over', async () => {
    const { postFromSw } = stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR, 'https://push.example/old');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });
    await client.start();

    postFromSw({
      type: 'superhero:push-subscription-changed',
      oldEndpoint: 'https://push.example/old',
      subscription: { endpoint: 'https://push.example/rotated', keys: { p256dh: 'p2', auth: 'a2' } },
    });

    await vi.waitFor(() => {
      const rotated = subCalls(backend)
        .map((c) => JSON.parse(c[1]!.body as string))
        .find((b) => b.endpoint === 'https://push.example/rotated');
      expect(rotated).toMatchObject({ keys: { p256dh: 'p2', auth: 'a2' } });
    });
    // ownership moves to the new endpoint, still held by this address
    expect(pushOwner()).toMatchObject({
      address: ADDR,
      endpoint: 'https://push.example/rotated',
    });
    client.stop();
  });

  it('ignores a rotation for an endpoint this address did not own', async () => {
    const { postFromSw } = stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR, 'https://push.example/mine');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });
    await client.start();
    const before = subCalls(backend).length;

    postFromSw({
      type: 'superhero:push-subscription-changed',
      oldEndpoint: 'https://push.example/someone-else',
      subscription: { endpoint: 'https://push.example/rotated', keys: { p256dh: 'p', auth: 'a' } },
    });
    await Promise.resolve();

    expect(subCalls(backend)).toHaveLength(before);
    client.stop();
  });

  // ── a client the user has left must never claim this browser's endpoint ──────
  //
  // The endpoint belongs to the BROWSER and the server keys its row on it, so
  // whoever POSTs last owns it. stop() does NOT invalidate the cached session, so
  // every one of these POSTs would still be authorized — and the account that wins
  // gets the OS notifications while the account on screen silently gets none.

  it('an enablePush answered after an account switch never re-points the endpoint', async () => {
    // The OS permission prompt is the widest window of all: it can sit for minutes.
    const env = stubPushEnv('granted', existingSubscription());
    setPushOwner('ak_other');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });

    env.prompt.arm();
    const enabling = client.enablePush();
    await vi.waitFor(() => expect(env.prompt.held).toBe(true));
    client.stop(); // the account-change effect tears this client down
    env.prompt.release();

    await expect(enabling).rejects.toThrow(/stopped/);
    expect(env.subscribe).not.toHaveBeenCalled(); // browser subscription untouched
    expect(subCalls(backend)).toHaveLength(0); // and no POST
    expect(pushOwner()).toMatchObject({ address: 'ak_other' }); // record intact
  });

  it('abandons a re-assert when the switch lands before it decides to POST', async () => {
    // Covers reassertPushSubscription's own pre-POST bail. The window AFTER that
    // check — where the snapshot has already been taken — is the next test.
    const env = stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR);
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });

    // getPushState() consumes one getSubscription; park the re-assert's own call.
    env.getSubscription.arm();
    const starting = client.start();
    await vi.waitFor(() => expect(env.getSubscription.held).toBe(true));
    client.stop();
    env.getSubscription.release();
    await starting.catch(() => {});
    await vi.waitFor(() => expect(env.getSubscription.held).toBe(false));

    expect(subCalls(backend)).toHaveLength(0);
  });

  it('a rotation handed over before an account switch never re-points the endpoint', async () => {
    // The worker's handoff is fire-and-forget (`void registerSubscription`), so it
    // outlives the handler that started it.
    const env = stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR, 'https://push.example/mine');
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });
    await client.start();
    const before = subCalls(backend).length;

    env.postFromSw({
      type: 'superhero:push-subscription-changed',
      oldEndpoint: 'https://push.example/mine',
      subscription: { endpoint: 'https://push.example/rotated', keys: { p256dh: 'p', auth: 'a' } },
    });
    client.stop(); // lands before the POST is issued (ensureSession awaits first)
    await Promise.resolve();
    await Promise.resolve();

    expect(subCalls(backend)).toHaveLength(before);
    expect(pushOwner()).toMatchObject({ endpoint: 'https://push.example/mine' });
  });

  it('ignores a rotation delivered to a listener that outlived stop()', async () => {
    // stop() detaches the listener, so this is a backstop: the guarantee is that a
    // stopped client never acts, not that removeEventListener won the race.
    const env = stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR);
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });
    await client.start();
    await vi.waitFor(() => expect(subCalls(backend).length).toBe(1));

    const listener = env.swListeners.message[0]; // kept past the detach
    client.stop();
    listener({
      data: {
        type: 'superhero:push-subscription-changed',
        oldEndpoint: 'https://push.example/x',
        subscription: {
          endpoint: 'https://push.example/rotated',
          keys: { p256dh: 'p', auth: 'a' },
        },
      },
    } as MessageEvent);
    await Promise.resolve();
    await Promise.resolve();

    expect(subCalls(backend)).toHaveLength(1);
    expect(pushOwner()).toMatchObject({ endpoint: 'https://push.example/x' });
  });

  it('does not let a POST in flight during the switch overwrite the new owner', async () => {
    // The end-to-end damage, and the only window the pre-POST checks cannot cover:
    // the request is already on the wire. A's late write made both the server and
    // the local record name A, so A received this browser's push while the account
    // on screen still read "subscribed" and got nothing.
    const logs: string[] = [];
    stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR);
    const backend = deferrableBackend('/web-push/subscription', { vapidKey: 'AQID' });
    const { client: leaving } = makeClient({ backend, log: (m) => logs.push(m) });

    backend.arm(); // hold this address's re-assert POST open
    const starting = leaving.start();
    await vi.waitFor(() => expect(backend.held).toBe(true));
    expect(subCalls(backend)).toHaveLength(1); // it really is on the wire
    leaving.stop(); // the account-change effect tears this client down

    // The account the user switched TO enables push and completes, taking ownership.
    setPushOwner('ak_next', 'https://push.example/x');

    backend.release(); // ...and only now does the abandoned POST resolve
    await starting.catch(() => {});
    // Wait for the re-assert to finish deciding — this log line sits after
    // registerSubscription returns, whether or not it wrote the record.
    await vi.waitFor(() => expect(logs.some((m) => m.includes('re-asserted'))).toBe(true));

    expect(pushOwner()).toMatchObject({ address: 'ak_next' });
  });

  it('stop() detaches the worker listener', async () => {
    const { postFromSw } = stubPushEnv('granted', existingSubscription());
    setPushOwner(ADDR);
    const backend = makeBackend({ vapidKey: 'AQID' });
    const { client } = makeClient({ backend });
    await client.start();
    await vi.waitFor(() => expect(subCalls(backend).length).toBe(1));
    client.stop();

    postFromSw({
      type: 'superhero:push-subscription-changed',
      oldEndpoint: 'https://push.example/x',
      subscription: { endpoint: 'https://push.example/rotated', keys: { p256dh: 'p', auth: 'a' } },
    });
    await Promise.resolve();
    expect(subCalls(backend)).toHaveLength(1); // nothing new after stop()
  });
});

// Deliberately last: this is the guard that the web-push block above really does
// restore the environment it faked. Without it a suite added later would silently
// inherit a browser that looks push-capable and assert the wrong branch.
describe('test-environment hygiene', () => {
  it('leaves no faked serviceWorker behind for later suites', () => {
    expect(isPushSupported()).toBe(false);
  });
});
