import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Proves the signer-factory swap (`makeSigner`, `AeSdkProvider.tsx`) is inert by
 * default and only ever installs the inline in-page signer when ALL THREE of
 * these hold: `INLINE_WALLET_ENABLED` (a hard off-by-default const, see
 * `features/wallet/config.ts`), `isStandalone()`, and the address being a known
 * inline account in the cleartext manifest. Every other combination — including
 * the real production config — must fall through to the existing delegated
 * (deep-link/relay) account object, unchanged.
 *
 * The third condition is the one that protects an EXTERNALLY connected wallet:
 * inside an installed PWA with the flag on, an extension / wallet.superhero.com
 * account is not in our manifest, we hold no key for it, and we must keep it on
 * the delegated relay rather than installing a signer that cannot sign for it.
 *
 * Uses `vi.doMock` + `vi.resetModules()` + dynamic `import()` per test so each
 * test can independently control the flag, `isStandalone()` and the manifest
 * without leaking state across cases.
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

const enableInline = () => {
  vi.doMock('@/features/wallet/config', () => ({ INLINE_WALLET_ENABLED: true }));
  vi.doMock('@/utils/displayMode', () => ({ isStandalone: () => true, isIOSWebKit: () => false }));
};

describe('AeSdkProvider makeSigner — inline wallet swap point', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/features/wallet/config');
    vi.doUnmock('@/utils/displayMode');
    vi.doUnmock('@/features/wallet/manifest-store');
    vi.doUnmock('@/features/wallet/vault-store');
  });

  it('INLINE_WALLET_ENABLED is false in the real (unmocked) config module', async () => {
    const { INLINE_WALLET_ENABLED } = await import('@/features/wallet/config');
    expect(INLINE_WALLET_ENABLED).toBe(false);
  });

  it('returns the delegated account under the REAL production config, even standalone with a manifest hit', async () => {
    // Only isStandalone + the manifest are stubbed; INLINE_WALLET_ENABLED is the
    // real, unmocked `false` from config.ts. This is the "real installed-PWA
    // user is unaffected" proof.
    vi.doMock('@/utils/displayMode', () => ({ isStandalone: () => true, isIOSWebKit: () => false }));
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    const result = makeSigner(INLINE_ADDRESS, createDelegatedAccount);

    expect(result).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(INLINE_ADDRESS);
  });

  it('returns the delegated account when the flag is on but not standalone', async () => {
    vi.doMock('@/features/wallet/config', () => ({ INLINE_WALLET_ENABLED: true }));
    vi.doMock('@/utils/displayMode', () => ({ isStandalone: () => false, isIOSWebKit: () => false }));
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(INLINE_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
  });

  it('keeps an EXTERNALLY connected account on the delegated relay even when flag+standalone are true', async () => {
    enableInline();
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(EXTERNAL_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(EXTERNAL_ADDRESS);
  });

  it('installs the inline signer only when flag=true AND standalone=true AND the address is an inline account', async () => {
    enableInline();
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
    enableInline();
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
