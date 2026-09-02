import React from 'react';
import {
  render, screen, act, fireEvent,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * The card is the only inline-wallet entry point either connect modal offers, so
 * every device state it can be in must end on a control.
 *
 * The dead end pinned here: a wallet created from a mnemonic whose owner took
 * the `protect` step's "Skip — use my passphrase" has no `webauthn-prf` factor.
 * On reconnect the card told them to add one in "Settings → Security" — a screen
 * that does not exist — and offered nothing else, so a live vault on the device
 * was unreachable and the user stayed logged out.
 */

const mocks = vi.hoisted(() => ({
  record: null as unknown,
  loadFails: false,
  manifest: { accounts: [{ index: 0, address: 'ak_existing' }], activeAddress: 'ak_existing' } as unknown,
  passkeyUnlock: vi.fn(),
  unwrapDek: vi.fn(),
}));

vi.mock('@/features/wallet/webauthn', () => ({
  isPlatformAuthenticatorAvailable: () => Promise.resolve(true),
  RP_ID: 'superhero.com',
}));

vi.mock('@/features/wallet/vault-store', () => ({
  createIndexedDbVaultStore: () => ({
    load: () => (mocks.loadFails
      ? Promise.reject(new Error('storage blocked'))
      : Promise.resolve(mocks.record)),
    save: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }),
}));

vi.mock('@/features/wallet/manifest-store', () => ({
  loadManifest: () => mocks.manifest,
}));

vi.mock('@/features/wallet/wallet-lifecycle', () => ({
  passkeyUnlockProvider: () => mocks.passkeyUnlock,
}));

vi.mock('@/features/wallet/factors', () => ({
  unwrapDek: (...a: unknown[]) => mocks.unwrapDek(...a),
}));

const { usePasskeyConnect } = await import('../usePasskeyConnect');

/** Renders the hook's decisions as text, so a test reads like the card does. */
const Probe = () => {
  const {
    state, errorMsg, needsOnboarding, deviceWallet, connectedAddress, trigger,
  } = usePasskeyConnect();
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="device-wallet">{deviceWallet}</span>
      <span data-testid="onboarding">{String(needsOnboarding)}</span>
      <span data-testid="connected">{connectedAddress ?? ''}</span>
      <span data-testid="error">{errorMsg ?? ''}</span>
      <button type="button" onClick={trigger}>tap</button>
    </div>
  );
};

const mount = async () => {
  await act(async () => { render(<Probe />); });
};

const tap = async () => {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'tap' })); });
};

const PASSKEY_FACTOR = {
  id: 'f1',
  type: 'webauthn-prf',
  webauthn: { credentialId: 'Yw==', prfSalt: 'cw==', rpId: 'superhero.com' },
};

describe('usePasskeyConnect — every device state has a way in', () => {
  beforeEach(() => {
    mocks.record = null;
    mocks.loadFails = false;
    mocks.manifest = { accounts: [{ index: 0, address: 'ak_existing' }], activeAddress: 'ak_existing' };
    mocks.passkeyUnlock.mockReset().mockResolvedValue({ factorId: 'f1', kek: 'kek' });
    mocks.unwrapDek.mockReset().mockResolvedValue('dek');
  });

  it('opens the device wallet when the vault has no passkey factor', async () => {
    // A mnemonic wallet that skipped device unlock: passphrase + recovery only.
    mocks.record = { factors: [{ id: 'f0', type: 'passphrase' }, { id: 'f2', type: 'recovery-code' }] };
    await mount();
    await tap();

    expect(screen.getByTestId('device-wallet')).toHaveTextContent('other-factors');
    // Onboarding re-reads the vault and lands on its `exists` screen.
    expect(screen.getByTestId('onboarding')).toHaveTextContent('true');
    // The unfollowable advice is gone: no message stands in for the control.
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('opens the device wallet when the passkey factor has no WebAuthn data', async () => {
    // No ceremony is runnable, but the vault's other factors still open it.
    mocks.record = { factors: [{ id: 'f1', type: 'webauthn-prf' }, { id: 'f0', type: 'passphrase' }] };
    await mount();
    await tap();

    expect(screen.getByTestId('onboarding')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('still connects a passkey wallet by proving the KEK opens the vault', async () => {
    mocks.record = { factors: [{ id: 'f0', type: 'passphrase' }, PASSKEY_FACTOR] };
    await mount();
    await tap();

    expect(mocks.unwrapDek).toHaveBeenCalledWith(PASSKEY_FACTOR, 'kek');
    expect(screen.getByTestId('connected')).toHaveTextContent('ak_existing');
    expect(screen.getByTestId('onboarding')).toHaveTextContent('false');
  });

  it('reports the vault a mnemonic wallet actually has, before any tap', async () => {
    mocks.record = { factors: [{ id: 'f0', type: 'passphrase' }] };
    await mount();

    // The card must not advertise a passkey the vault does not hold.
    expect(screen.getByTestId('device-wallet')).toHaveTextContent('other-factors');
  });

  it('sends a proven passkey with no manifest to the repair path, not to an error', async () => {
    mocks.record = { factors: [PASSKEY_FACTOR] };
    mocks.manifest = null;
    await mount();
    await tap();

    expect(screen.getByTestId('onboarding')).toHaveTextContent('true');
    expect(screen.getByTestId('connected')).toHaveTextContent('');
  });

  it('does not treat unreadable storage as an empty device', async () => {
    // Private mode / a blocked upgrade must not read as "no wallet" — offering
    // creation there would invite a second vault over one we merely can't see.
    mocks.loadFails = true;
    await mount();

    expect(screen.getByTestId('device-wallet')).toHaveTextContent('unknown');
  });
});
