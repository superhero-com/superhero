/**
 * Tests for public/notifications-sw.js.
 *
 * The worker is a classic (non-module) script served straight out of public/, so
 * it cannot be imported. Instead its source is evaluated with a stub `self`,
 * which captures the event handlers and lets each one be driven directly.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { getNotificationLink } from '../notificationNavigation';
import type { FeedItem } from '../notification-feed-client';

const ORIGIN = 'https://app.test';
const SW_PATH = path.resolve(__dirname, '../../../../public/notifications-sw.js');

type Handlers = Record<string, (event: any) => void>;

/** Evaluate the worker source against a stub global and return its handlers. */
function loadSw() {
  const source = readFileSync(SW_PATH, 'utf8');
  const handlers: Handlers = {};
  const swSelf = {
    addEventListener: (type: string, cb: (event: any) => void) => {
      handlers[type] = cb;
    },
    skipWaiting: vi.fn(),
    location: { origin: ORIGIN },
    registration: {
      // Both parameters are declared (and echoed back) so assertions can read
      // mock.calls[n][1] — the notification options — without fighting the tuple.
      showNotification: vi.fn(async (
        title: string,
        options: { icon?: string; badge?: string; [key: string]: unknown },
      ) => ({ title, options })),
      pushManager: {
        getSubscription: vi.fn(async () => null as unknown),
        subscribe: vi.fn(async () => null as unknown),
      },
    },
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll: vi.fn(async () => [] as any[]),
      openWindow: vi.fn(async () => ({}) as unknown),
    },
  };
  // eslint-disable-next-line no-new-func
  new Function('self', source)(swSelf);
  return { handlers, swSelf };
}

/** A fake WindowClient. `navigate` is opt-in, mirroring browsers that lack it. */
function windowClient(over: {
  url?: string;
  navigate?: ((url: string) => Promise<unknown>) | null;
  focus?: () => Promise<unknown>;
} = {}) {
  const client: any = {
    url: over.url ?? `${ORIGIN}/`,
    focus: over.focus ? vi.fn(over.focus) : vi.fn(async () => undefined),
    postMessage: vi.fn(),
  };
  if (over.navigate !== null) {
    client.navigate = vi.fn(over.navigate ?? (async () => undefined));
  }
  return client;
}

/** Drive a notificationclick and wait for whatever it passed to waitUntil. */
async function click(
  sw: ReturnType<typeof loadSw>,
  data: Record<string, unknown> | null,
) {
  const close = vi.fn();
  const waits: Promise<unknown>[] = [];
  sw.handlers.notificationclick({
    notification: { close, data },
    waitUntil: (p: Promise<unknown>) => waits.push(p),
  });
  await Promise.all(waits);
  return { close };
}

describe('notifications service worker — no request interception', () => {
  // The worker shares an origin with the inline wallet, so its origin-wide scope
  // is only safe because it never intercepts requests. A `fetch` handler would
  // hand a script with control over every navigation and asset request — wallet
  // routes included — a foothold next to the seed vault. Guard against one being
  // added, whether via addEventListener('fetch') or self.onfetch.
  it('registers no fetch event listener', () => {
    const { handlers } = loadSw();
    expect(handlers.fetch).toBeUndefined();
  });

  it('sets no onfetch handler on the global', () => {
    const { swSelf } = loadSw();
    expect((swSelf as { onfetch?: unknown }).onfetch).toBeUndefined();
  });

  it('never references fetch interception in its source', () => {
    const source = readFileSync(SW_PATH, 'utf8');
    // Belt to the behavioural checks above: catches a fetch handler wired up
    // conditionally or on a path loadSw() would not evaluate.
    expect(source).not.toMatch(/addEventListener\(\s*['"`]fetch['"`]/);
    expect(source).not.toMatch(/\bonfetch\b\s*=/);
  });
});

describe('notifications service worker — notificationclick', () => {
  let sw: ReturnType<typeof loadSw>;

  beforeEach(() => {
    sw = loadSw();
  });

  it('falls back to openWindow when the client cannot navigate', async () => {
    // Browsers without WindowClient.navigate would otherwise focus a tab and drop
    // the deep-link, leaving the user on whatever page happened to be open.
    const client = windowClient({ navigate: null });
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    await click(sw, { type: 'post-comment', commentId: '2000_v3' });

    expect(client.focus).toHaveBeenCalled();
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/post/2000');
  });

  it('falls back to openWindow when navigate rejects (uncontrolled client)', async () => {
    // navigate() rejects for any client this worker does not control — i.e. every
    // tab that was already open before the worker activated.
    const client = windowClient({
      navigate: async () => {
        throw new TypeError('not controlled');
      },
    });
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    await click(sw, { type: 'incoming-transfer' });

    expect(client.navigate).toHaveBeenCalledWith('/wallet');
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/wallet');
  });

  it('navigates an existing client and does NOT open a second window', async () => {
    const client = windowClient();
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    await click(sw, { type: 'room-messages', saleAddress: 'ct_sale' });

    expect(client.navigate).toHaveBeenCalledWith('/trends/tokens/ct_sale');
    expect(sw.swSelf.clients.openWindow).not.toHaveBeenCalled();
  });

  it('still deep-links when focus() rejects', async () => {
    const client = windowClient({
      focus: async () => {
        throw new Error('not focusable');
      },
    });
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    await click(sw, { type: 'post-comment', commentId: '7_v3' });

    expect(client.navigate).toHaveBeenCalledWith('/post/7');
  });

  it('only focuses a tab that is already on the target', async () => {
    const client = windowClient({ url: `${ORIGIN}/wallet` });
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    await click(sw, { type: 'incoming-transfer' });

    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).not.toHaveBeenCalled();
    expect(sw.swSelf.clients.openWindow).not.toHaveBeenCalled();
  });

  it('opens a window when no tab is open at all', async () => {
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    await click(sw, { type: 'post-comment', commentId: '42_v3' });
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/post/42');
  });

  it('swallows an openWindow rejection instead of failing the event', async () => {
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    sw.swSelf.clients.openWindow.mockRejectedValue(new Error('not allowed'));
    await expect(click(sw, { type: 'incoming-transfer' })).resolves.toBeTruthy();
  });

  it('closes the notification and never navigates for an unroutable payload', async () => {
    const client = windowClient();
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    const { close } = await click(sw, { type: 'announcement' });

    expect(close).toHaveBeenCalled();
    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).not.toHaveBeenCalled();
    expect(sw.swSelf.clients.openWindow).not.toHaveBeenCalled();
  });

  it('refuses a cross-origin data.url (no open-redirect via a push payload)', async () => {
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    await click(sw, { url: 'https://evil.example/steal' });
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/');
  });

  it('honours an explicit same-origin data.url over the derived path', async () => {
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    await click(sw, { url: `${ORIGIN}/users/ak_x?tab=posts`, type: 'post-comment', commentId: '9_v3' });
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/users/ak_x?tab=posts');
  });

  it('survives a missing/garbage payload', async () => {
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    await click(sw, null);
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/');
  });
});

// The worker cannot import getNotificationLink (classic script, served raw), so
// the routing table is duplicated there. This is what stops the copies drifting —
// a drift is exactly the bug where a notification opened the wrong page.
describe('notifications service worker — routing parity with the in-app bell', () => {
  const PAYLOADS: Array<Record<string, unknown>> = [
    { type: 'post-comment', parentPostId: '1000_v3', commentId: '2000_v3' },
    { type: 'post-comment', parentPostId: '1000_v3' },
    { type: 'post-comment' },
    { type: 'incoming-transfer', sender: 'ak_x' },
    { type: 'invitation-claimed', claimer: 'ak_x' },
    { type: 'room-messages', saleAddress: 'ct_sale' },
    { type: 'room-membership', saleAddress: 'ct_sale' },
    { type: 'room-membership' },
    { type: 'announcement' },
    { type: 'something-new-the-backend-added' },
  ];

  it.each(PAYLOADS)('agrees with getNotificationLink for %o', async (data) => {
    const sw = loadSw();
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    await click(sw, data);

    const item = { type: data.type, data } as unknown as FeedItem;
    // getNotificationLink returns undefined for "nowhere to go"; the worker still
    // has to open something, and falls back to the app root.
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith(getNotificationLink(item) ?? '/');
  });
});

describe('notifications service worker — push', () => {
  it('renders title/body and carries data through to the click handler', () => {
    const sw = loadSw();
    sw.handlers.push({
      data: { json: () => ({ title: 'T', body: 'B', data: { type: 'post-comment', tag: 'x' } }) },
      waitUntil: () => {},
    });
    expect(sw.swSelf.registration.showNotification).toHaveBeenCalledWith('T', expect.objectContaining({
      body: 'B',
      data: { type: 'post-comment', tag: 'x' },
      tag: 'x',
    }));
  });

  it('uses PNG artwork, since SVG notification icons are dropped by some platforms', () => {
    const sw = loadSw();
    sw.handlers.push({ data: { json: () => ({ title: 'T' }) }, waitUntil: () => {} });
    const [, options] = sw.swSelf.registration.showNotification.mock.calls[0];
    expect(options.icon).toBe('/icons/icon-192.png');
    expect(options.badge).toBe('/icons/icon-192.png');
    // Guard the regression directly: any .svg here renders unbranded on Android.
    expect(`${options.icon}${options.badge}`).not.toMatch(/\.svg/);
  });

  /** push a payload, then click the notification it produced. */
  async function pushThenClick(sw: ReturnType<typeof loadSw>, payload: unknown) {
    sw.swSelf.clients.matchAll.mockResolvedValue([]);
    sw.handlers.push({ data: { json: () => payload }, waitUntil: () => {} });
    const [, options] = sw.swSelf.registration.showNotification.mock.calls[0];
    await click(sw, options.data as Record<string, unknown>);
    return options;
  }

  it('routes a payload whose type sits at the top level, not inside data', async () => {
    // FeedItem carries `type` ALONGSIDE its data bag, and the click handler routes
    // off data.type. If the backend mirrors the feed shape in its push payload,
    // keying only off data.type sent every single click to '/' — silently, and
    // with the routing-parity tests still green.
    const sw = loadSw();
    await pushThenClick(sw, {
      title: 'T',
      type: 'post-comment',
      data: { commentId: '55_v3', commenter: 'ak_x' },
    });
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/post/55');
  });

  it('prefers data.type when the payload carries both', async () => {
    const sw = loadSw();
    await pushThenClick(sw, {
      title: 'T',
      type: 'incoming-transfer',
      data: { type: 'room-messages', saleAddress: 'ct_sale' },
    });
    expect(sw.swSelf.clients.openWindow).toHaveBeenCalledWith('/trends/tokens/ct_sale');
  });

  it('still reads the coalescing tag out of data', async () => {
    const sw = loadSw();
    const options = await pushThenClick(sw, {
      title: 'T',
      type: 'post-comment',
      data: { commentId: '5_v3', tag: 'thread-5' },
    });
    expect(options.tag).toBe('thread-5');
  });

  it('falls back to raw text for a non-JSON payload', () => {
    const sw = loadSw();
    sw.handlers.push({
      data: {
        json: () => {
          throw new Error('not json');
        },
        text: () => 'plain',
      },
      waitUntil: () => {},
    });
    expect(sw.swSelf.registration.showNotification).toHaveBeenCalledWith('Superhero', expect.objectContaining({ body: 'plain' }));
  });

  it('shows a default notification for an empty push', () => {
    const sw = loadSw();
    sw.handlers.push({ data: null, waitUntil: () => {} });
    expect(sw.swSelf.registration.showNotification).toHaveBeenCalledWith('Superhero', expect.objectContaining({ body: '', data: {} }));
  });
});

describe('notifications service worker — pushsubscriptionchange', () => {
  function changeEvent(over: Record<string, unknown> = {}) {
    const waits: Promise<unknown>[] = [];
    return {
      event: { waitUntil: (p: Promise<unknown>) => waits.push(p), ...over },
      settle: () => Promise.all(waits),
    };
  }

  const newSub = {
    endpoint: 'https://push.example/new',
    toJSON: () => ({ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } }),
  };

  it('re-subscribes with the old key and hands the result to open tabs', async () => {
    // Chrome fires this with neither subscription set, so the worker has to
    // re-subscribe itself — otherwise push dies silently and permanently.
    const sw = loadSw();
    const client = windowClient();
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);
    sw.swSelf.registration.pushManager.subscribe.mockResolvedValue(newSub);

    const { event, settle } = changeEvent({
      oldSubscription: {
        endpoint: 'https://push.example/old',
        options: { applicationServerKey: new Uint8Array([1, 2, 3]) },
      },
    });
    sw.handlers.pushsubscriptionchange(event);
    await settle();

    expect(sw.swSelf.registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(client.postMessage).toHaveBeenCalledWith({
      type: 'superhero:push-subscription-changed',
      oldEndpoint: 'https://push.example/old',
      subscription: { endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } },
    });
  });

  it('prefers the subscription the event already provides', async () => {
    const sw = loadSw();
    const client = windowClient();
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);

    const { event, settle } = changeEvent({ newSubscription: newSub });
    sw.handlers.pushsubscriptionchange(event);
    await settle();

    expect(sw.swSelf.registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalled();
  });

  it('gives up quietly when it cannot re-subscribe', async () => {
    const sw = loadSw();
    const client = windowClient();
    sw.swSelf.clients.matchAll.mockResolvedValue([client]);
    sw.swSelf.registration.pushManager.subscribe.mockRejectedValue(new Error('denied'));

    const { event, settle } = changeEvent({
      oldSubscription: { endpoint: 'old', options: { applicationServerKey: new Uint8Array([1]) } },
    });
    sw.handlers.pushsubscriptionchange(event);
    await expect(settle()).resolves.toBeTruthy();

    expect(client.postMessage).not.toHaveBeenCalled();
  });
});
