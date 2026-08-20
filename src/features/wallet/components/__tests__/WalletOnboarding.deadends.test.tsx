import React from 'react';
import {
  render, screen, act, fireEvent, waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Onboarding can't be dismissed — no Escape, no outside-click, no close button —
 * so every step it can enter must offer a live control that moves forward.
 * `exists`, `creating` and `choose` each failed that in a different way.
 */

const mocks = vi.hoisted(() => ({
  record: null as unknown,
  manifest: null as unknown,
  createWalletFromPasskey: vi.fn(),
  addRecoveryCodeFactor: vi.fn(),
  clear: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => false,
  isIOSWebKit: () => false,
  isMobileDevice: () => true,
}));

vi.mock('../../webauthn', () => ({
  isPlatformAuthenticatorAvailable: () => Promise.resolve(true),
  RP_ID: 'superhero.com',
}));

vi.mock('../../vault-store', () => ({
  createIndexedDbVaultStore: () => ({
    load: () => Promise.resolve(mocks.record),
    save: () => Promise.resolve(),
    clear: mocks.clear,
  }),
}));

vi.mock('../../manifest-store', () => ({
  clearManifest: vi.fn(),
  loadManifest: () => mocks.manifest,
  manifestForFirstAccount: vi.fn(),
  saveManifest: vi.fn(),
}));

vi.mock('../../wallet-lifecycle', () => ({
  createWalletFromPasskey: (...a: unknown[]) => mocks.createWalletFromPasskey(...a),
  addRecoveryCodeFactor: (...a: unknown[]) => mocks.addRecoveryCodeFactor(...a),
  addPasskeyFactor: vi.fn(),
  importWalletWithDek: vi.fn(),
  recordMnemonicBackedUp: vi.fn(),
}));

vi.mock('../../derivation', () => ({
  deriveAccount: () => ({ address: 'ak_test1234' }),
}));

const { default: WalletOnboarding } = await import('../WalletOnboarding');

const mount = async (props = {}) => {
  await act(async () => { render(<WalletOnboarding {...props} />); });
};

const FAKE_RECORD = { factors: [{ type: 'webauthn-prf' }] };
/** Real phrase — `../mnemonic` is deliberately unmocked, so the checksum is verified. */
const VALID_MNEMONIC = `${'abandon '.repeat(11)}about`;

describe('WalletOnboarding — no step is a dead end', () => {
  beforeEach(() => {
    mocks.record = null;
    mocks.manifest = null;
    mocks.createWalletFromPasskey.mockReset();
    mocks.addRecoveryCodeFactor.mockReset();
    mocks.clear.mockClear();
  });

  describe('the `exists` screen', () => {
    beforeEach(() => {
      mocks.record = FAKE_RECORD;
      mocks.manifest = { accounts: [{ index: 0, address: 'ak_existing' }], activeAddress: 'ak_existing' };
    });

    it('offers a non-destructive way forward, and it is the primary action', async () => {
      // Previously the only control on this screen erased the wallet.
      const onComplete = vi.fn();
      await mount({ onComplete });

      const cta = await screen.findByRole('button', { name: /continue with this wallet/i });
      expect(cta).toBeEnabled();

      fireEvent.click(cta);
      expect(onComplete).toHaveBeenCalledWith(FAKE_RECORD, 'ak_existing');
    });

    it('no longer claims an unlock screen that does not exist', async () => {
      await mount();
      await screen.findByRole('button', { name: /continue with this wallet/i });
      expect(screen.queryByText(/unlocking is the next screen/i)).not.toBeInTheDocument();
    });

    it('does not erase the wallet on a single tap — erasing must be confirmed', async () => {
      await mount();

      fireEvent.click(await screen.findByRole('button', { name: /erase this device.s wallet/i }));

      // Armed, not erased.
      expect(mocks.clear).not.toHaveBeenCalled();
      expect(screen.getByText(/funds in it are gone for good/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keep my wallet/i })).toBeInTheDocument();
    });

    it('lets the user back out of erasing', async () => {
      await mount();
      fireEvent.click(await screen.findByRole('button', { name: /erase this device.s wallet/i }));
      fireEvent.click(screen.getByRole('button', { name: /keep my wallet/i }));

      expect(mocks.clear).not.toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: /continue with this wallet/i })).toBeEnabled();
    });

    it('erases only after the confirm step', async () => {
      await mount();
      fireEvent.click(await screen.findByRole('button', { name: /erase this device.s wallet/i }));
      fireEvent.click(screen.getByRole('button', { name: /^erase it$/i }));

      await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
    });
  });

  describe('the `creating` step when recovery-code enrollment fails', () => {
    it('shows the error and a retry instead of spinning forever', async () => {
      // The vault is already persisted, so the retry must happen in place.
      mocks.createWalletFromPasskey.mockResolvedValue({
        record: FAKE_RECORD, dek: {} as CryptoKey, mnemonic: 'a b c',
      });
      mocks.addRecoveryCodeFactor.mockRejectedValue(new Error('QuotaExceededError'));

      await mount();
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue with passkey/i }));
      });

      expect(await screen.findByText(/QuotaExceededError/)).toBeInTheDocument();
      const retry = await screen.findByRole('button', { name: /try again/i });
      expect(retry).toBeEnabled();

      // And the retry actually re-attempts the enrollment.
      mocks.addRecoveryCodeFactor.mockResolvedValue({ record: FAKE_RECORD, code: 'CODE' });
      await act(async () => { fireEvent.click(retry); });
      expect(mocks.addRecoveryCodeFactor).toHaveBeenCalledTimes(2);
    });
  });

  describe('the `choose` step', () => {
    it('surfaces a failed passkey create instead of silently returning', async () => {
      // This message used to be set on a step with no error block.
      mocks.createWalletFromPasskey.mockRejectedValue(new Error('PRF unsupported on this device'));

      await mount();
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue with passkey/i }));
      });

      expect(await screen.findByText(/PRF unsupported on this device/)).toBeInTheDocument();
      // ...and the user can still act.
      expect(await screen.findByRole('button', { name: /create with a phrase/i })).toBeEnabled();
    });

    it('does not carry a passkey error over onto the phrase path', async () => {
      mocks.createWalletFromPasskey.mockRejectedValue(new Error('PRF unsupported on this device'));

      await mount();
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue with passkey/i }));
      });
      await screen.findByText(/PRF unsupported on this device/);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create with a phrase/i }));
      });

      expect(screen.queryByText(/PRF unsupported on this device/)).not.toBeInTheDocument();
    });

    it('does not carry a passkey error over onto the import path either', async () => {
      mocks.createWalletFromPasskey.mockRejectedValue(new Error('PRF unsupported on this device'));

      await mount();
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: /continue with passkey/i }));
      });
      await screen.findByText(/PRF unsupported on this device/);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /import an existing wallet/i }));
      });
      fireEvent.change(screen.getByPlaceholderText(/word1/), { target: { value: VALID_MNEMONIC } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
      });

      // `passphrase` renders the shared error note, so a stale one resurfaces here —
      // two screens on from the path that actually failed.
      expect(screen.queryByText(/PRF unsupported on this device/)).not.toBeInTheDocument();
    });
  });
});
