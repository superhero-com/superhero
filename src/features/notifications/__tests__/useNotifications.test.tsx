import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

// ── mutable wallet/account state ──────────────────────────────────────────
let mockActiveAccount = 'ak_alice';
const mockSignMessage = vi.fn(async () => 'sg_sig');
const mockAddStaticAccount = vi.fn();
const mockConnectWallet = vi.fn(async () => 'ak_alice');
const mockWaitForWalletReconnect = vi.fn(async (a: string) => a);

// ── captured fake client instances (hoisted so the vi.mock factory can use it) ─
// `env.cachedSession` is read by the fake at CALL time, so a test can decide
// whether a session already exists before the hook mounts and its auto-connect
// effect runs.
const { clients, env } = vi.hoisted(() => ({
  clients: [] as any[],
  env: { cachedSession: false },
}));

vi.mock('../notification-feed-client', () => ({
  // A real class so `new NotificationFeedClient()` yields an instance with the
  // methods (a mockImplementation returning an object is NOT used as the `new`
  // result in this runtime).
  NotificationFeedClient: class {
    constructor(opts: any) {
      Object.assign(this, {
        opts,
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        refresh: vi.fn().mockResolvedValue(undefined),
        hasCachedSession: vi.fn(() => env.cachedSession),
        markRead: vi.fn().mockResolvedValue(undefined),
        getPushState: vi.fn().mockResolvedValue('default'),
        enablePush: vi.fn().mockResolvedValue('subscribed'),
        disablePush: vi.fn().mockResolvedValue(undefined),
      });
      clients.push(this);
    }
  },
  isPushSupported: () => true,
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({
    activeAccount: mockActiveAccount,
    aeSdk: {},
    addStaticAccount: mockAddStaticAccount,
    signMessage: mockSignMessage,
  }),
  useWalletConnect: () => ({
    connectWallet: mockConnectWallet,
    walletConnected: true,
    walletInfo: { id: 'w' },
    connectingWallet: false,
  }),
}));
vi.mock('@/hooks/useWalletReconnect', () => ({
  useWalletReconnect: () => mockWaitForWalletReconnect,
}));
vi.mock('@/utils/signLinkMessage', () => ({ signAndVerifyLinkMessage: vi.fn() }));
vi.mock('@/utils/walletSdk', () => ({ normalizeAddress: (a: string) => a }));
vi.mock('@/config', () => ({
  CONFIG: { SUPERHERO_API_URL: 'http://api.test', BACKEND_URL: 'http://api.test' },
}));

// import AFTER mocks
// eslint-disable-next-line import/first
import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    clients.length = 0;
    mockActiveAccount = 'ak_alice';
    env.cachedSession = false;
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('builds a client for the active account and connects on user gesture', async () => {
    const { result } = renderHook(() => useNotifications());
    expect(clients).toHaveLength(1);
    expect(clients[0].opts.address).toBe('ak_alice');

    await act(async () => {
      await result.current.connect();
    });
    expect(clients[0].start).toHaveBeenCalledTimes(1);
    expect(result.current.connected).toBe(true);
    expect(result.current.connecting).toBe(false);
  });

  it('surfaces an error and stays disconnected when start() rejects', async () => {
    const { result } = renderHook(() => useNotifications());
    clients[0].start.mockRejectedValueOnce(new Error('nope'));
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBe('nope');
  });

  it('is a no-op while already connected', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.connect();
    });
    await act(async () => {
      await result.current.connect();
    });
    expect(clients[0].start).toHaveBeenCalledTimes(1);
  });

  it('tears down the old client and rebuilds on account change', async () => {
    const { result, rerender } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.connect();
    });
    const first = clients[0];
    expect(result.current.connected).toBe(true);

    mockActiveAccount = 'ak_bob';
    await act(async () => {
      rerender();
    });

    expect(first.stop).toHaveBeenCalled();
    expect(clients.length).toBeGreaterThan(1);
    expect(clients.at(-1)!.opts.address).toBe('ak_bob');
    // state reset for the new account
    expect(result.current.connected).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('enablePush maps "unconfigured" to an error message', async () => {
    const { result } = renderHook(() => useNotifications());
    clients[0].enablePush.mockResolvedValueOnce('unconfigured');
    await act(async () => {
      await result.current.enablePush();
    });
    expect(result.current.error).toMatch(/not configured/i);
  });

  // ── auto-connect on a cached session ────────────────────────────────────────

  it('connects on mount when a session is already cached', async () => {
    // Otherwise the bell reads zero unread on every reload for a user who already
    // enabled notifications: `connected` gates both the badge and the list, and
    // only a click set it. start() reuses the cached token with no wallet prompt,
    // so there is no signature being sprung on anyone here.
    env.cachedSession = true;
    const { result } = renderHook(() => useNotifications());
    await act(async () => {}); // flush the auto-connect effect
    expect(clients[0].start).toHaveBeenCalledTimes(1);
    expect(result.current.connected).toBe(true);
  });

  it('does NOT connect on mount without a cached session (no surprise prompt)', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    expect(clients[0].start).not.toHaveBeenCalled();
    expect(result.current.connected).toBe(false);
  });

  it('auto-connects the client built for a newly selected account', async () => {
    env.cachedSession = true;
    const { rerender } = renderHook(() => useNotifications());
    await act(async () => {});

    mockActiveAccount = 'ak_bob';
    await act(async () => {
      rerender();
    });

    const next = clients.at(-1)!;
    expect(next.opts.address).toBe('ak_bob');
    expect(next.start).toHaveBeenCalledTimes(1);
  });

  it('an auto-connect and a click do not both start the client', async () => {
    // The guard is a ref set synchronously, so a click landing before `connected`
    // has flushed cannot issue a second start() — which is a full re-bootstrap
    // (new run, new socket), not a no-op.
    env.cachedSession = true;
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    await act(async () => {
      await result.current.connect();
    });
    expect(clients[0].start).toHaveBeenCalledTimes(1);
  });

  it('enablePush does not restart a client that auto-connect already started', async () => {
    env.cachedSession = true;
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    expect(clients[0].start).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.enablePush();
    });
    expect(clients[0].start).toHaveBeenCalledTimes(1); // not torn down and rebuilt
    expect(clients[0].enablePush).toHaveBeenCalledTimes(1);
  });

  it('a failed connect releases the guard so the CTA can retry', async () => {
    const { result } = renderHook(() => useNotifications());
    clients[0].start.mockRejectedValueOnce(new Error('nope'));
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.error).toBe('nope');
    await act(async () => {
      await result.current.connect();
    });
    expect(clients[0].start).toHaveBeenCalledTimes(2);
    expect(result.current.connected).toBe(true);
  });

  it('disconnect() reopens the guard for a later reconnect', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.connect();
    });
    act(() => result.current.disconnect());
    expect(result.current.connected).toBe(false);
    await act(async () => {
      await result.current.connect();
    });
    expect(clients[0].start).toHaveBeenCalledTimes(2);
  });

  // ── the REST re-sync the UI needs when the live layer is gone ───────────────

  it('refresh() delegates to the client when a session is cached', async () => {
    env.cachedSession = true;
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    clients[0].refresh.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(clients[0].refresh).toHaveBeenCalledTimes(1);
  });

  it('refresh() is a no-op with no session, so opening the panel cannot prompt', async () => {
    // ensureSession() would otherwise mint one — i.e. a wallet signature popped by
    // nothing more deliberate than clicking the bell.
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.refresh();
    });
    expect(clients[0].refresh).not.toHaveBeenCalled();
  });

  it('surfaces a disablePush failure instead of swallowing it', async () => {
    const { result } = renderHook(() => useNotifications());
    clients[0].disablePush.mockRejectedValueOnce(new Error('sw gone'));
    await act(async () => {
      await result.current.disablePush();
    });
    expect(result.current.error).toBe('sw gone');
  });
});
