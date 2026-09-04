import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * The two ways to create a wallet.
 *
 * Both are offered on EVERY surface — installed PWA and browser tab alike — and
 * they differ only in where the seed comes from, not in what the user ends up
 * with: a passkey wallet derives its BIP39 phrase from the passkey's PRF output
 * (`passkey-seed.ts`), a phrase wallet has the user transcribe one. Either way
 * it is a standard BIP39 wallet on the same derivation path.
 *
 * These tests pin that both options are always present and independently
 * reachable. The regression being guarded against is either option becoming
 * surface-conditional, or the phrase path disappearing when passkeys are
 * unavailable — which would leave no way to create a wallet at all.
 */

const isStandalone = vi.fn();

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => isStandalone(),
  isIOSWebKit: () => false,
  isMobileDevice: () => true,
}));

const isPlatformAuthenticatorAvailable = vi.fn();

vi.mock('../../webauthn', () => ({
  isPlatformAuthenticatorAvailable: () => isPlatformAuthenticatorAvailable(),
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
  // No manifest: these suites always land on the create flow.
  loadManifest: vi.fn(() => null),
  manifestForFirstAccount: vi.fn(),
  saveManifest: vi.fn(),
}));

const { default: WalletOnboarding } = await import('../WalletOnboarding');

const mount = async () => {
  await act(async () => { render(<WalletOnboarding />); });
};

const passkeyCta = () => screen.findByRole('button', { name: /continue with passkey/i });
const phraseCta = () => screen.findByRole('button', { name: /create with a phrase/i });

describe('WalletOnboarding create options', () => {
  beforeEach(() => {
    isStandalone.mockReset().mockReturnValue(false);
    isPlatformAuthenticatorAvailable.mockReset().mockResolvedValue(true);
  });

  // Both surfaces get both options: the choice is the user's, not the
  // display-mode's.
  describe.each([
    ['a browser tab', false],
    ['the installed PWA', true],
  ])('in %s', (_label, standalone) => {
    beforeEach(() => { isStandalone.mockReturnValue(standalone); });

    it('offers both the passkey and the phrase option', async () => {
      await mount();

      expect(await passkeyCta()).toBeInTheDocument();
      expect(await phraseCta()).toBeInTheDocument();
    });

    it('enables both when the device supports passkeys', async () => {
      await mount();

      expect(await passkeyCta()).toBeEnabled();
      expect(await phraseCta()).toBeEnabled();
    });

    it('explains each option rather than just labelling it', async () => {
      await mount();

      expect(await screen.findByText(/derived from the passkey/i)).toBeInTheDocument();
      expect(screen.getByText(/twelve words you write down/i)).toBeInTheDocument();
    });
  });

  describe('when the device cannot create a passkey', () => {
    beforeEach(() => { isPlatformAuthenticatorAvailable.mockResolvedValue(false); });

    it('disables the passkey option but keeps it visible and explained', async () => {
      // Vanishing would leave the user wondering what they missed; the card
      // stays and says why.
      await mount();

      expect(await passkeyCta()).toBeDisabled();
      expect(screen.getByText(/can’t create a passkey/i)).toBeInTheDocument();
    });

    it('leaves the phrase option usable — otherwise there is no way to create', async () => {
      await mount();

      expect(await phraseCta()).toBeEnabled();
    });
  });

  describe('the phrase option', () => {
    it('starts the seed flow', async () => {
      await mount();
      await act(async () => { (await phraseCta()).click(); });

      // First seed screen: the 12 words, with the "written them down" advance.
      expect(await screen.findByRole('button', { name: /written them down/i })).toBeInTheDocument();
    });
  });

  describe('the backup-confirm step', () => {
    const reachConfirm = async () => {
      await mount();
      await act(async () => { (await phraseCta()).click(); });
      await act(async () => {
        (await screen.findByRole('button', { name: /written them down/i })).click();
      });
    };

    it('can be skipped', async () => {
      // A hard gate here teaches people to screenshot the phrase to get past it,
      // and strands anyone who wrote it down but mistypes under pressure.
      await reachConfirm();

      const skip = await screen.findByRole('button', { name: /skip/i });
      expect(skip).toBeEnabled();

      await act(async () => { skip.click(); });

      expect(await screen.findByRole('heading', { name: /set a passphrase/i })).toBeInTheDocument();
    });

    it('keeps Continue gated on typing the right words', async () => {
      // Skippable is not the same as meaningless: the verified path must still
      // require the actual words, since that is what sets mnemonicBackedUpAt.
      await reachConfirm();

      expect(await screen.findByRole('button', { name: /don’t match yet/i })).toBeDisabled();
    });
  });
});
