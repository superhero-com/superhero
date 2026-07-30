import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Proves the P1 signer-factory swap (`makeSigner`, `AeSdkProvider.tsx`) is
 * inert by default and only ever installs the inline `EncryptedHdAccount`
 * skeleton when BOTH `INLINE_WALLET_ENABLED` (a hard off-by-default const,
 * see `features/wallet/config.ts`) AND `isStandalone()` are true. Every other
 * combination — including the real production config — must fall through to
 * the existing delegated (deep-link/relay) account object, unchanged.
 *
 * Uses `vi.doMock` + `vi.resetModules()` + dynamic `import()` per test so
 * each test can independently control `INLINE_WALLET_ENABLED` and
 * `isStandalone()` without leaking state across cases.
 */
vi.mock('@/libs/WebSocketClient', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

describe('AeSdkProvider makeSigner — inline wallet swap point (P1 skeleton)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/features/wallet/config');
    vi.doUnmock('@/utils/displayMode');
  });

  it('INLINE_WALLET_ENABLED is false in the real (unmocked) config module', async () => {
    const { INLINE_WALLET_ENABLED } = await import('@/features/wallet/config');
    expect(INLINE_WALLET_ENABLED).toBe(false);
  });

  it('returns the delegated account under the REAL production config, even standalone', async () => {
    // Only isStandalone is stubbed (true); INLINE_WALLET_ENABLED is the real,
    // unmocked `false` from config.ts. This is the "real installed-PWA user,
    // unaffected by P1" proof.
    vi.doMock('@/utils/displayMode', () => ({ isStandalone: () => true, isIOSWebKit: () => false }));

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    const result = makeSigner('ak_test1234', createDelegatedAccount);

    expect(result).toBe(delegatedAccount);
    expect(createDelegatedAccount).toHaveBeenCalledWith('ak_test1234');
  });

  it('returns the delegated account when the flag is on but not standalone', async () => {
    vi.doMock('@/features/wallet/config', () => ({ INLINE_WALLET_ENABLED: true }));
    vi.doMock('@/utils/displayMode', () => ({ isStandalone: () => false, isIOSWebKit: () => false }));

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const delegatedAccount = { marker: 'delegated-account' };
    const createDelegatedAccount = vi.fn().mockReturnValue(delegatedAccount);

    const result = makeSigner('ak_test1234', createDelegatedAccount);

    expect(result).toBe(delegatedAccount);
  });

  it('installs the EncryptedHdAccount skeleton only when flag=true AND standalone=true', async () => {
    vi.doMock('@/features/wallet/config', () => ({ INLINE_WALLET_ENABLED: true }));
    vi.doMock('@/utils/displayMode', () => ({ isStandalone: () => true, isIOSWebKit: () => false }));

    const { makeSigner } = await import('@/context/AeSdkProvider');
    const { EncryptedHdAccount } = await import('@/features/wallet/EncryptedHdAccount');
    const createDelegatedAccount = vi.fn();

    const result = makeSigner('ak_test1234', createDelegatedAccount);

    expect(result).toBeInstanceOf(EncryptedHdAccount);
    expect((result as InstanceType<typeof EncryptedHdAccount>).address).toBe('ak_test1234');
    expect(createDelegatedAccount).not.toHaveBeenCalled();
  });
});
