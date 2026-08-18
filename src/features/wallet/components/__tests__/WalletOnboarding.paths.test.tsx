import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Which create path each surface offers.
 *
 * The seed-phrase flow (show 12 words → re-enter two of them) is PWA-only: in an
 * installed app the wallet is the point. In a browser tab that is a wall in
 * front of "just let me in", so web creates the wallet FROM the passkey — the
 * same BIP39 seed, derived from the passkey's PRF output rather than transcribed
 * by the user (`passkey-seed.ts`), and therefore recoverable from the passkey
 * alone.
 *
 * These tests pin the split itself, not the copy: a regression that showed the
 * seed screens in a browser tab (or hid them in the PWA) is the bug being
 * guarded against.
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
  manifestForFirstAccount: vi.fn(),
  saveManifest: vi.fn(),
}));

const { default: WalletOnboarding } = await import('../WalletOnboarding');

const mount = async () => {
  await act(async () => { render(<WalletOnboarding />); });
};

describe('WalletOnboarding create paths', () => {
  beforeEach(() => {
    isStandalone.mockReset().mockReturnValue(false);
    isPlatformAuthenticatorAvailable.mockReset().mockResolvedValue(true);
  });

  describe('in a browser tab (not installed)', () => {
    it('leads with the passkey, not a recovery phrase', async () => {
      await mount();

      expect(await screen.findByRole('button', { name: /continue with passkey/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^create a new wallet$/i })).not.toBeInTheDocument();
    });

    it('still offers the phrase flow as an explicit alternative', async () => {
      // Not a dead end: anyone who wants a phrase they control can have one.
      await mount();

      expect(await screen.findByRole('button', { name: /use a recovery phrase instead/i })).toBeInTheDocument();
    });

    it('disables the passkey CTA when the device cannot make one', async () => {
      isPlatformAuthenticatorAvailable.mockResolvedValue(false);
      await mount();

      expect(await screen.findByRole('button', { name: /continue with passkey/i })).toBeDisabled();
      // ...and the phrase path must remain reachable, or there is no way to
      // create a wallet at all on this device.
      expect(screen.getByRole('button', { name: /use a recovery phrase instead/i })).toBeEnabled();
    });
  });

  describe('in the installed PWA', () => {
    it('leads with the seed-phrase flow', async () => {
      isStandalone.mockReturnValue(true);
      await mount();

      expect(await screen.findByRole('button', { name: /^create a new wallet$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /continue with passkey/i })).not.toBeInTheDocument();
    });
  });

  describe('the backup-confirm step', () => {
    it('can be skipped', async () => {
      // A hard gate here teaches people to screenshot the phrase to get past it,
      // and strands anyone who wrote it down but mistypes under pressure.
      isStandalone.mockReturnValue(true);
      await mount();

      await act(async () => {
        (await screen.findByRole('button', { name: /^create a new wallet$/i })).click();
      });
      await act(async () => {
        (await screen.findByRole('button', { name: /written them down/i })).click();
      });

      const skip = await screen.findByRole('button', { name: /skip/i });
      expect(skip).toBeEnabled();

      await act(async () => { skip.click(); });

      // Skipping advances the flow rather than blocking it.
      expect(await screen.findByRole('heading', { name: /set a passphrase/i })).toBeInTheDocument();
    });

    it('keeps Continue gated on typing the right words', async () => {
      // Skippable is not the same as meaningless: the verified path must still
      // require the actual words, since that is what sets mnemonicBackedUpAt.
      isStandalone.mockReturnValue(true);
      await mount();

      await act(async () => {
        (await screen.findByRole('button', { name: /^create a new wallet$/i })).click();
      });
      await act(async () => {
        (await screen.findByRole('button', { name: /written them down/i })).click();
      });

      expect(await screen.findByRole('button', { name: /don’t match yet/i })).toBeDisabled();
    });
  });
});
