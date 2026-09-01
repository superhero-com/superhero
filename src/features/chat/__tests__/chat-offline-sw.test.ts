/**
 * Tests for public/chat-offline-sw.js.
 *
 * The worker is a classic (non-module) script served straight out of public/, so
 * it cannot be imported. Its source is evaluated with a stub `self`, mirroring
 * the harness in src/features/notifications/__tests__/notifications-sw.test.ts.
 *
 * The cases that matter are the ones that stranded users before: caching the
 * SPA's HTML fallback under an asset URL, and holding an unhashed asset forever.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const ORIGIN = 'https://app.test';
const SW_PATH = path.resolve(__dirname, '../../../../public/chat-offline-sw.js');

type Handlers = Record<string, (event: any) => void>;

/** An in-memory stand-in for a single `Cache`, keyed by request URL. */
function fakeCache() {
  const entries = new Map<string, Response>();
  return {
    entries,
    match: vi.fn(async (req: any) => entries.get(typeof req === 'string' ? req : req.url)),
    put: vi.fn(async (req: any, res: Response) => {
      entries.set(typeof req === 'string' ? req : req.url, res);
    }),
    add: vi.fn(async () => undefined),
  };
}

function loadSw() {
  const source = readFileSync(SW_PATH, 'utf8');
  const handlers: Handlers = {};
  const caches = new Map<string, ReturnType<typeof fakeCache>>();
  const swSelf = {
    addEventListener: (type: string, cb: (event: any) => void) => { handlers[type] = cb; },
    skipWaiting: vi.fn(),
    location: { origin: ORIGIN },
    clients: { claim: vi.fn(async () => undefined) },
    caches: {
      open: vi.fn(async (name: string) => {
        if (!caches.has(name)) caches.set(name, fakeCache());
        return caches.get(name);
      }),
      keys: vi.fn(async () => [...caches.keys()]),
      delete: vi.fn(async (name: string) => caches.delete(name)),
    },
  };
  // The worker reaches for the bare globals `caches`/`fetch`, not `self.caches`.
  (globalThis as any).caches = swSelf.caches;
  // eslint-disable-next-line no-new-func
  new Function('self', source)(swSelf);
  return { handlers, swSelf, caches };
}

/** Drive a fetch event and return whatever the worker responded with, if anything. */
async function fetchEvent(handlers: Handlers, request: any) {
  let responded: Promise<Response> | undefined;
  handlers.fetch({ request, respondWith: (p: Promise<Response>) => { responded = p; } });
  return responded;
}

const req = (url: string, over: Partial<Request> = {}) => ({
  url, method: 'GET', mode: 'no-cors', ...over,
}) as any;

// 204/205/304 are null-body statuses; a body there throws in the Response
// constructor, which is how the previous revision turned a 204 into a failed
// request rather than a pass-through.
const NULL_BODY = new Set([204, 205, 304]);
const res = (body: string, contentType: string, status = 200) => new Response(
  NULL_BODY.has(status) ? null : body,
  { status, headers: { 'Content-Type': contentType } },
);

describe('chat offline worker — what it refuses to cache', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('does not cache the SPA HTML fallback under a .js URL', async () => {
    // The failure this prevents: nosniff refuses to execute the cached HTML, and
    // a cache-first entry is never re-checked, so the route stays broken.
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('<!doctype html><html></html>', 'text/html')));

    await fetchEvent(handlers, req(`${ORIGIN}/assets/DmThread-OLD.js`));

    const cache = caches.get('sh-chat-v2');
    expect(cache?.entries.size).toBe(0);
  });

  it('caches a genuine script response', async () => {
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('export{};', 'text/javascript')));

    await fetchEvent(handlers, req(`${ORIGIN}/assets/DmThread-abc123.js`));

    expect(caches.get('sh-chat-v2')?.entries.size).toBe(1);
  });

  it('stores a hashed asset unstamped, so the body is never buffered first', async () => {
    // An `Infinity` entry is never age-checked, so stamping one would buy nothing
    // and cost a full copy of every chunk before the page sees a byte. The absent
    // header is the only observable proof the streaming path was taken.
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('export{};', 'text/javascript')));

    await fetchEvent(handlers, req(`${ORIGIN}/assets/DmThread-abc123.js`));

    const stored = caches.get('sh-chat-v2')?.entries.get(`${ORIGIN}/assets/DmThread-abc123.js`);
    expect(stored?.headers.get('sw-cached-at')).toBeNull();
  });

  it('stamps an unhashed asset, which does get age-checked', async () => {
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('<svg/>', 'image/svg+xml')));

    await fetchEvent(handlers, req(`${ORIGIN}/icons/logo.svg`));

    const stored = caches.get('sh-chat-v2')?.entries.get(`${ORIGIN}/icons/logo.svg`);
    expect(stored?.headers.get('sw-cached-at')).not.toBeNull();
  });

  it('ignores cross-origin requests entirely', async () => {
    // The worker inherits the page CSP, where its fetch() is a connect-src sink;
    // re-fetching a third-party asset here fails under a policy the page meets.
    const { handlers } = loadSw();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const responded = await fetchEvent(handlers, req('https://cdn.example/avatar.png'));

    expect(responded).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not cache a non-200 response', async () => {
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('', 'text/javascript', 204)));

    await fetchEvent(handlers, req(`${ORIGIN}/assets/x.js`));

    expect(caches.get('sh-chat-v2')?.entries.size).toBe(0);
  });

  it('still serves the fetched response when the stamped write rejects (e.g. quota)', async () => {
    // The bug this pins: a QuotaExceededError from cache.put must not turn an
    // already-fetched response into a network error — the bytes were received,
    // only the write failed. This is the unhashed/stamped path (icons, fonts),
    // reached on a cache MISS, which is where the rejection used to propagate
    // out through cacheFirst -> event.respondWith uncaught.
    const { handlers, caches } = loadSw();
    const cache = fakeCache();
    cache.put.mockRejectedValue(new Error('QuotaExceededError'));
    caches.set('sh-chat-v2', cache as any);
    vi.stubGlobal('fetch', vi.fn(async () => res('<svg/>', 'image/svg+xml')));

    const responded = await fetchEvent(handlers, req(`${ORIGIN}/icons/logo.svg`));

    expect(await responded!.text()).toBe('<svg/>');
  });
});

describe('chat offline worker — offline navigation', () => {
  it('stores no per-URL document for a deep-linked thread', async () => {
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('<html>thread</html>', 'text/html')));

    await fetchEvent(handlers, req(`${ORIGIN}/chat/dm/ak_abc`, { mode: 'navigate' }));

    expect(caches.get('sh-chat-v2')?.entries.size).toBe(0);
  });

  it('refreshes the one shell entry on a /chat navigation, query string and all', async () => {
    const { handlers, caches } = loadSw();
    vi.stubGlobal('fetch', vi.fn(async () => res('<html>fresh shell</html>', 'text/html')));

    await fetchEvent(handlers, req(`${ORIGIN}/chat?ref=push`, { mode: 'navigate' }));

    const entries = caches.get('sh-chat-v2')?.entries;
    expect([...(entries?.keys() ?? [])]).toEqual(['/chat']);
    expect(await entries?.get('/chat')?.text()).toContain('fresh shell');
  });

  it('serves the precached shell for a deep link that was never fetched', async () => {
    // Client-side routing never issues a document request for /chat/dm/<id>, so
    // without the precached shell an offline deep link had no app to land on.
    const { handlers, caches } = loadSw();
    const cache = fakeCache();
    cache.entries.set('/chat', res('<html>shell</html>', 'text/html'));
    caches.set('sh-chat-v2', cache as any);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    const responded = await fetchEvent(
      handlers,
      req(`${ORIGIN}/chat/dm/ak_abc`, { mode: 'navigate' }),
    );

    expect(await responded!.text()).toContain('shell');
  });
});

describe('chat offline worker — cache versioning', () => {
  it('deletes every other sh-chat-* cache on activate', async () => {
    // This is what evicts entries an older revision stored under rules we no
    // longer trust, including the unbounded v1 asset cache.
    const { handlers, swSelf, caches } = loadSw();
    caches.set('sh-chat-v1', fakeCache());
    caches.set('sh-chat-geocode-v1', fakeCache());
    caches.set('sh-chat-v2', fakeCache());

    let done: Promise<unknown> = Promise.resolve();
    handlers.activate({ waitUntil: (p: Promise<unknown>) => { done = p; } });
    await done;

    expect(swSelf.caches.delete).toHaveBeenCalledWith('sh-chat-v1');
    expect(swSelf.caches.delete).toHaveBeenCalledWith('sh-chat-geocode-v1');
    expect(swSelf.caches.delete).not.toHaveBeenCalledWith('sh-chat-v2');
  });
});

describe('chat offline worker — the removed offline queue', () => {
  it('opens no BroadcastChannel', () => {
    // A previous revision documented a QUEUE_MSG/FLUSH_QUEUE replay protocol that
    // no client implemented, so an offline send was silently dropped.
    const source = readFileSync(SW_PATH, 'utf8');
    // The header comment explains the removal, so match construction, not prose.
    expect(source).not.toContain('new BroadcastChannel');
    expect(source).not.toContain('QUEUE_MSG');
  });
});
