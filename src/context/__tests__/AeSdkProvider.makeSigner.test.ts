import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * `makeSigner` installs the inline signer only when all three hold:
 * `INLINE_WALLET_ENABLED`, `isStandalone()`, and the address being in the
 * cleartext manifest. Anything else falls through to the delegated relay,
 * unchanged. The flag is checked first, so an off build never reaches the inline
 * path whatever the other two say; the manifest check is what leaves an
 * externally connected wallet — whose key we don't hold — on the relay.
 *
 * `vi.doMock` + `resetModules()` + dynamic import per test, so each case controls
 * the three inputs without leaking state.
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

/** Control the display-mode routing signal. */
const mockStandalone = (value: boolean) => vi.doMock('@/utils/displayMode', () => ({
  isStandalone: () => value,
  isIOSWebKit: () => false,
}));

/** Control the build-time feature gate (real default is OFF). */
const mockFlag = (value: boolean) => vi.doMock('@/features/wallet/config', () => ({
  INLINE_WALLET_ENABLED: value,
}));

describe('AeSdkProvider makeSigner — inline wallet swap point', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/utils/displayMode');
    vi.doUnmock('@/features/wallet/manifest-store');
    vi.doUnmock('@/features/wallet/vault-store');
    vi.doUnmock('@/features/wallet/config');
  });

  it('returns the delegated account when the feature flag is OFF, even standalone with a manifest hit', async () => {
    // Every other condition favours the inline signer and it still must not install.
    mockFlag(false);
    mockStandalone(true);
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(INLINE_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(INLINE_ADDRESS);
  });

  it('defaults to OFF when VITE_INLINE_WALLET is unset — no mock, the real config module', async () => {
    // Loads the real config, so a change to the default itself fails here.
    mockStandalone(true);
    mockManifest();

    const { INLINE_WALLET_ENABLED } = await import('@/features/wallet/config');
    expect(INLINE_WALLET_ENABLED).toBe(false);

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(INLINE_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
  });

  it('returns the delegated account in a plain browser tab (not standalone), even with a manifest hit', async () => {
    // The "real browser-tab user is unaffected" proof: not standalone → external.
    mockFlag(true);
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
    mockFlag(true);
    mockStandalone(true);
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(EXTERNAL_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(EXTERNAL_ADDRESS);
  });

  it('installs the inline signer only when standalone AND the address is a known inline account', async () => {
    mockFlag(true);
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
    mockFlag(true);
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
