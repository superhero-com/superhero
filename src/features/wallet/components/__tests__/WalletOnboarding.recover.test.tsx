import React from 'react';
import {
  render, screen, act, fireEvent,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * The recovery confirm step: derived address shown, nothing persisted until the
 * user says "this is my wallet", and the pristine-account warning informs but
 * never blocks.
 */

const mocks = vi.hoisted(() => ({
  usage: 'used' as string,
  deriveRecoveredWallet: vi.fn(),
  commitRecoveredWallet: vi.fn(),
  addRecoveryCodeFactor: vi.fn(),
  saveManifest: vi.fn(),
  checkAccountUsage: vi.fn(),
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => true,
  isIOSWebKit: () => false,
  isMobileDevice: () => true,
}));

vi.mock('../../webauthn', () => ({
  isPlatformAuthenticatorAvailable: () => Promise.resolve(true),
  RP_ID: 'superhero.com',
}));

vi.mock('../../vault-store', () => ({
  createIndexedDbVaultStore: () => ({
    load: () => Promise.resolve(null),
    save: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }),
}));

vi.mock('../../manifest-store', () => ({
  clearManifest: vi.fn(),
  loadManifest: () => null,
  manifestForFirstAccount: (address: string) => (
    { accounts: [{ index: 0, address }], activeAddress: address }
  ),
  saveManifest: (...a: unknown[]) => mocks.saveManifest(...a),
}));

vi.mock('../../account-usage', () => ({
  checkAccountUsage: (...a: unknown[]) => mocks.checkAccountUsage(...a),
}));

vi.mock('../../wallet-lifecycle', () => ({
  deriveRecoveredWallet: (...a: unknown[]) => mocks.deriveRecoveredWallet(...a),
  commitRecoveredWallet: (...a: unknown[]) => mocks.commitRecoveredWallet(...a),
  addRecoveryCodeFactor: (...a: unknown[]) => mocks.addRecoveryCodeFactor(...a),
  createWalletFromPasskey: vi.fn(),
  addPasskeyFactor: vi.fn(),
  importWalletWithDek: vi.fn(),
  recordMnemonicBackedUp: vi.fn(),
  hasFactor: () => false,
  passkeyUnlockProvider: vi.fn(),
  passphraseUnlockProvider: vi.fn(),
}));

const { default: WalletOnboarding } = await import('../WalletOnboarding');

const MATERIAL = {
  credentialId: new Uint8Array([1]),
  prfOutput: new Uint8Array(32).fill(7),
  rpId: 'superhero.com',
  mnemonic: 'a b c',
  address: 'ak_recovered123',
};
const RECORD = { factors: [{ type: 'webauthn-prf' }] };

const mount = async () => {
  await act(async () => { render(<WalletOnboarding />); });
};

/** A promise whose resolution the test schedules, to control which check answers first. */
const deferred = () => {
  let resolve!: (v: string) => void;
  const promise = new Promise<string>((r) => { resolve = r; });
  return { promise, resolve };
};

const startRecovery = async () => {
  await mount();
  await act(async () => {
    fireEvent.click(await screen.findByRole('button', { name: /restore a wallet you created with a passkey/i }));
  });
};

describe('WalletOnboarding — passkey recovery', () => {
  beforeEach(() => {
    mocks.usage = 'used';
    mocks.deriveRecoveredWallet.mockReset()
      .mockResolvedValue({ ...MATERIAL, prfOutput: new Uint8Array(32).fill(7) });
    mocks.commitRecoveredWallet.mockReset().mockResolvedValue({ record: RECORD, dek: {} });
    mocks.addRecoveryCodeFactor.mockReset().mockResolvedValue({ record: RECORD, code: 'CODE' });
    mocks.saveManifest.mockClear();
    mocks.checkAccountUsage.mockReset().mockImplementation(() => Promise.resolve(mocks.usage));
  });

  it('shows the derived address for confirmation without persisting anything', async () => {
    await startRecovery();

    expect(await screen.findByText('ak_recovered123')).toBeInTheDocument();
    expect(mocks.commitRecoveredWallet).not.toHaveBeenCalled();
    expect(mocks.saveManifest).not.toHaveBeenCalled();
  });

  it('warns on a pristine account but keeps the confirm enabled', async () => {
    mocks.usage = 'pristine';
    await startRecovery();

    expect(await screen.findByText(/no on-chain activity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this is my wallet/i })).toBeEnabled();
  });

  it('a failed activity check reads as "couldn\'t verify", not as a warning', async () => {
    mocks.usage = 'unknown';
    await startRecovery();

    expect(await screen.findByText(/couldn.t check/i)).toBeInTheDocument();
    expect(screen.queryByText(/no on-chain activity/i)).not.toBeInTheDocument();
  });

  it('backing out commits nothing and returns to the options', async () => {
    await startRecovery();
    await screen.findByText('ak_recovered123');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(mocks.commitRecoveredWallet).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: /create with a phrase/i })).toBeInTheDocument();
  });

  it('confirming commits, writes the manifest, and enrolls the recovery code', async () => {
    await startRecovery();
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /this is my wallet/i }));
    });

    expect(mocks.commitRecoveredWallet).toHaveBeenCalledTimes(1);
    expect(mocks.saveManifest).toHaveBeenCalledWith(
      { accounts: [{ index: 0, address: 'ak_recovered123' }], activeAddress: 'ak_recovered123' },
    );
    expect(mocks.addRecoveryCodeFactor).toHaveBeenCalledTimes(1);
  });

  it('a failed recovery-code step retries only that, and cannot back out', async () => {
    mocks.addRecoveryCodeFactor.mockRejectedValueOnce(new Error('QuotaExceededError'));
    await startRecovery();
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /this is my wallet/i }));
    });

    // The wallet is already saved, so the screen must stop asking "is this yours?":
    // no address, no activity verdict, and no route back to `choose`, where the
    // fresh vault would reject every action on offer.
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('ak_recovered123')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    // Only the enrollment is retried — a second commit would hit "a vault already exists".
    expect(mocks.commitRecoveredWallet).toHaveBeenCalledTimes(1);
    expect(mocks.addRecoveryCodeFactor).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/CODE/)).toBeInTheDocument();
  });

  it('a slow check from an abandoned ceremony cannot verdict the next one', async () => {
    const abandoned = deferred();
    const current = deferred();
    mocks.checkAccountUsage
      .mockReturnValueOnce(abandoned.promise)
      .mockReturnValueOnce(current.promise);

    await startRecovery();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /restore a wallet/i }));
    });

    // The abandoned attempt answers last, and about a different address.
    await act(async () => { abandoned.resolve('pristine'); await abandoned.promise; });
    expect(screen.queryByText(/no on-chain activity/i)).not.toBeInTheDocument();

    await act(async () => { current.resolve('used'); await current.promise; });
    expect(await screen.findByText(/it looks like a restore/i)).toBeInTheDocument();
  });

  it('a failed commit shows the error and stays retryable', async () => {
    mocks.commitRecoveredWallet.mockRejectedValue(new Error('QuotaExceededError'));
    await startRecovery();
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /this is my wallet/i }));
    });

    expect(await screen.findByText(/QuotaExceededError/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this is my wallet/i })).toBeEnabled();
  });
});
