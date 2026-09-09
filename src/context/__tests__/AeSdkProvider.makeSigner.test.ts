import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * `makeSigner` (account install) and `signMessageInline` (the signing path) both
 * resolve the account through `inlineSignerIndex`, which yields an index on ONE
 * condition: the address is in the cleartext manifest, i.e. this device created
 * or imported that wallet in-page and holds its key. Anything else falls through
 * to the delegated relay, unchanged.
 *
 * The manifest check is the whole boundary, and it is display-mode independent.
 * `INLINE_WALLET_ENABLED` and `isStandalone()` used to sit in front of it; they
 * are gone, because restricting the signer to an installed PWA did not protect
 * anything (isStandalone is spoofable, custody is same-origin either way) while
 * it did break the web passkey flow: the card minted a real account and this
 * lookup then refused it, routing its signatures to an external wallet that
 * never held the key. So a browser tab is now a first-class inline surface, and
 * these tests pin that an externally connected wallet is still never claimed.
 *
 * `vi.doMock` + `resetModules()` + dynamic import per test, so each case controls
 * its inputs without leaking state.
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

/**
 * Display mode, which must no longer change any outcome — mocked only so the
 * standalone/browser-tab pairs below are genuinely testing both surfaces.
 */
const mockStandalone = (value: boolean) => vi.doMock('@/utils/displayMode', () => ({
  isStandalone: () => value,
  isIOSWebKit: () => false,
}));

/** Records what the inline account was built with, and signs a fixed value. */
let inlineAccountOpts: { address: string; index: number } | null = null;
const mockInlineAccount = () => vi.doMock('@/features/wallet/inline-sdk-account', () => ({
  createInlineSdkAccount: (opts: { address: string; index: number }) => {
    inlineAccountOpts = opts;
    return { signMessage: async () => new Uint8Array([0x0b, 0xad, 0xc0, 0xde]) };
  },
}));

describe('AeSdkProvider makeSigner — inline wallet swap point', () => {
  beforeEach(() => {
    vi.resetModules();
    inlineAccountOpts = null;
  });

  afterEach(() => {
    vi.doUnmock('@/utils/displayMode');
    vi.doUnmock('@/features/wallet/manifest-store');
    vi.doUnmock('@/features/wallet/vault-store');
    vi.doUnmock('@/features/wallet/inline-sdk-account');
  });

  it.each([
    ['an installed PWA', true],
    ['a plain browser tab', false],
  ])('keeps an EXTERNALLY connected account on the delegated relay in %s', async (_label, standalone) => {
    // The safety property, and the only one: we never claim to sign for a key we
    // do not hold, whatever surface the app is running on.
    mockStandalone(standalone);
    mockManifest();

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    expect(makeSigner(EXTERNAL_ADDRESS, createDelegatedAccount)).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith(EXTERNAL_ADDRESS);
  });

  it.each([
    ['an installed PWA', true],
    ['a plain browser tab', false],
  ])('installs the inline signer for a known inline account in %s', async (_label, standalone) => {
    // The browser-tab case is the regression guard for the web passkey flow: a
    // wallet created from a passkey in a tab must sign with its own key here.
    mockStandalone(standalone);
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

  it('signs a message in-page for an inline account, under its manifest index', async () => {
    // The delegated relay's account carries the provider's own `signMessage`, so
    // the signing path must build the inline account from the manifest rather
    // than resolve one off the static sdk — which would deep-link out on a
    // device holding the seed, or recurse.
    mockStandalone(false);
    mockManifest();
    mockInlineAccount();

    const { signMessageInline } = await import('@/context/AeSdkProvider');

    await expect(signMessageInline(INLINE_ADDRESS, 'hello')).resolves.toBe('0badc0de');
    expect(inlineAccountOpts).toMatchObject({ address: INLINE_ADDRESS, index: 3 });
  });

  it('declines to sign in-page for an external or absent address', async () => {
    mockStandalone(true);
    mockManifest();
    mockInlineAccount();

    const sdk = await import('@/context/AeSdkProvider');
    expect(sdk.signMessageInline(EXTERNAL_ADDRESS, 'hello')).toBeNull();
    expect(sdk.signMessageInline(undefined, 'hello')).toBeNull();
    expect(inlineAccountOpts).toBeNull();
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
