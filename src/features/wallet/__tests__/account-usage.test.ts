import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

/**
 * The recovery confirm screen treats the three verdicts very differently —
 * 'pristine' warns the user they may be restoring the wrong wallet, 'unknown'
 * must never do that — so the mapping from HTTP outcome to verdict is pinned here.
 */

vi.mock('@/utils/constants', () => ({
  CURRENT_NETWORK: { url: 'https://node.test' },
}));

const { checkAccountUsage } = await import('../account-usage');

const respondWith = (res: unknown) => vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res)));

describe('checkAccountUsage', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reads a 2xx as used', async () => {
    respondWith({ ok: true, status: 200 });
    expect(await checkAccountUsage('ak_1')).toBe('used');
  });

  it('reads a 404 as pristine — the only signal that earns the warning', async () => {
    respondWith({ ok: false, status: 404 });
    expect(await checkAccountUsage('ak_1')).toBe('pristine');
  });

  it('does not mistake a server error for an empty account', async () => {
    respondWith({ ok: false, status: 500 });
    expect(await checkAccountUsage('ak_1')).toBe('unknown');
  });

  it('resolves unknown when the node is unreachable, instead of rejecting', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    // A rejection here would escape the fire-and-forget call in WalletOnboarding.
    await expect(checkAccountUsage('ak_1')).resolves.toBe('unknown');
  });

  it('asks the configured network, and bounds the request', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await checkAccountUsage('ak_abc');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://node.test/v3/accounts/ak_abc',
      { signal: expect.any(AbortSignal) },
    );
  });
});
