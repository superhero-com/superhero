import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Proves the signer-factory swap (`makeSigner`, `AeSdkProvider.tsx`) installs the
 * inline in-page signer only when BOTH conditions hold: `isStandalone()` (the app
 * is running as an installed PWA) AND the address being a known inline account in
 * the cleartext manifest. Every other combination — a plain browser tab, or an
 * externally connected wallet — must fall through to the existing delegated
 * (deep-link/relay) account object, unchanged.
 *
 * `isStandalone()` is the sole feature gate now — the old `INLINE_WALLET_ENABLED`
 * literal is gone. The manifest condition is the one that protects an EXTERNALLY
 * connected wallet: inside an installed PWA, an extension / wallet.superhero.com
 * account is not in our manifest, we hold no key for it, and we must keep it on
 * the delegated relay rather than installing a signer that cannot sign for it.
 *
 * Uses `vi.doMock` + `vi.resetModules()` + dynamic `import()` per test so each
 * test can independently control `isStandalone()` and the manifest without
 * leaking state across cases.
 */
vi.mock('@/libs/WebSocketClient', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

const INLINE_ADDRESS = 'ak_inline1234';
const EXTERNAL_ADDRESS = 'ak_external1234';

/** Mock the manifest so only INLINE_ADDRESS is a known inline account (at index 3). */
const mockManifest = () => vi.doMock('@/features/wallet/manifest-store', () => ({
  indexForAddress: (address: string) => (address === INLINE_ADDRESS ? 3 : null),
}));

/** Control the single feature gate. */
const mockStandalone = (value: boolean) => vi.doMock('@/utils/displayMode', () => ({
  isStandalone: () => value,
  isIOSWebKit: () => false,
}));

describe('AeSdkProvider makeSigner — inline wallet swap point', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/utils/displayMode');
    vi.doUnmock('@/features/wallet/manifest-store');
    vi.doUnmock('@/features/wallet/vault-store');
  });

  it('returns the delegated account in a plain browser tab (not standalone), even with a manifest hit', async () => {
    // The "real browser-tab user is unaffected" proof: not standalone → external.
    mockStandalone(false);
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    const result = makeSigner(INLINE_ADDRESS, createDelegatedAccount);

    expect(result).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(INLINE_ADDRESS);
  });

  it('keeps an EXTERNALLY connected account on the delegated relay even when standalone', async () => {
    mockStandalone(true);
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(EXTERNAL_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(EXTERNAL_ADDRESS);
  });

  it('installs the inline signer only when standalone AND the address is a known inline account', async () => {
    mockStandalone(true);
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const createDelegatedAccount = vi.fn();

    const result = makeSigner(INLINE_ADDRESS, createDelegatedAccount, 'ae_uat') as {
      address: string; signTransaction: unknown; signMessage: unknown;
    };

    expect(createDelegatedAccount).not.toHaveBeenCalled();
    expect(result.address).toBe(INLINE_ADDRESS);
    expect(typeof result.signTransaction).toBe('function');
    expect(typeof result.signMessage).toBe('function');
  });

  it('the installed inline signer refuses to sign when no vault exists on the device', async () => {
    mockStandalone(true);
    mockManifest();
    // The device has no vault (also the jsdom reality — no IndexedDB). The
    // signer must FAIL LOUDLY rather than emit any signature.
    vi.doMock('@/features/wallet/vault-store', () => ({
      createIndexedDbVaultStore: () => ({
        load: async () => null,
        save: async () => {},
        clear: async () => {},
      }),
    }));

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const result = makeSigner(INLINE_ADDRESS, vi.fn()) as {
      signTransaction: (tx: string) => Promise<string>;
    };

    await expect(result.signTransaction('tx_deadbeef')).rejects.toThrow(/no vault found/);
  });
});
