/**
 * usePasskeyConnect
 *
 * Shared hook for the passkey connect flow used in OnboardingModal and
 * ConnectWalletModal. Handles three cases:
 *
 * 1. No vault → show WalletOnboarding (creates wallet + enrolls passkey)
 * 2. Vault with passkey factor → run the WebAuthn unlock and connect the account
 * 3. Vault without passkey factor → guide user to enroll one in settings
 *
 * Case 2 must actually PROVE the passkey opens this vault. An earlier revision
 * ran `navigator.credentials.get` and discarded the result, which verified
 * nothing (any credential the browser offered "succeeded") and connected nobody
 * — `onConnected` was never reached, so the card was a dead end. The ceremony
 * now goes through the same `passkeyUnlockProvider` the signer uses and the KEK
 * is proven against the vault by unwrapping the DEK, which fails closed at GCM.
 * The mnemonic is deliberately NOT decrypted: connecting needs the public
 * address from the manifest, not the seed.
 */

import {
  useCallback, useEffect, useState,
} from 'react';
import { isPlatformAuthenticatorAvailable, RP_ID } from '@/features/wallet/webauthn';
import { createIndexedDbVaultStore } from '@/features/wallet/vault-store';
import { passkeyUnlockProvider } from '@/features/wallet/wallet-lifecycle';
import { unwrapDek } from '@/features/wallet/factors';
import { loadManifest } from '@/features/wallet/manifest-store';

export type PasskeyState =
  | 'idle'
  | 'checking'
  | 'no-vault' // no wallet on device → show inline onboarding
  | 'unlocking' // running the WebAuthn ceremony
  | 'error'
  | 'cancelled';

export function usePasskeyConnect() {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<PasskeyState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  /** Set once a passkey has been proven against the vault; the card connects it. */
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable);
  }, []);

  const trigger = useCallback(async () => {
    setState('checking');
    setErrorMsg(null);
    setNeedsOnboarding(false);
    setConnectedAddress(null);

    try {
      // Check what's in the vault
      const store = createIndexedDbVaultStore();
      const record = await store.load();

      if (!record) {
        // No wallet at all → guide through inline onboarding (creates wallet + passkey)
        setState('no-vault');
        setNeedsOnboarding(true);
        return;
      }

      const hasPasskeyFactor = record.factors.some((f) => f.type === 'webauthn-prf');

      if (!hasPasskeyFactor) {
        // Wallet exists but no passkey enrolled
        setState('error');
        setErrorMsg('No passkey set up yet. Go to Settings → Security to add one.');
        return;
      }

      // Passkey factor exists → run the WebAuthn ceremony
      setState('unlocking');
      const passkeyFactor = record.factors.find((f) => f.type === 'webauthn-prf');
      if (!passkeyFactor?.webauthn) {
        setState('error');
        setErrorMsg('Passkey data is incomplete. Try reconnecting your wallet.');
        return;
      }

      // The same provider the signer unlocks with: it evaluates the PRF at this
      // factor's stored salt and derives the KEK, rather than running a ceremony
      // whose result nothing reads.
      const { kek } = await passkeyUnlockProvider()(record);
      // The KEK only proves anything once it opens THIS vault. A wrong or foreign
      // credential produces a KEK that fails right here, at GCM. The mnemonic is
      // deliberately not unsealed: connecting needs the public address, not the seed.
      await unwrapDek(passkeyFactor, kek);

      const manifest = loadManifest();
      const address = manifest?.activeAddress
        ?? manifest?.accounts[0]?.address;
      if (!address) {
        // Vault intact but the cleartext manifest is gone — clearing site data
        // drops localStorage while IndexedDB survives. Onboarding's repair path
        // unlocks once and rebuilds the address list.
        setNeedsOnboarding(true);
        setState('no-vault');
        return;
      }

      setConnectedAddress(address);
      setState('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof DOMException ? err.name : '';

      if (name === 'NotAllowedError' || msg.toLowerCase().includes('cancel')) {
        setState('cancelled');
        setErrorMsg(null); // Don't show an error for user-cancelled
      } else if (name === 'SecurityError') {
        // Almost always an RP ID / origin mismatch: the pinned RP_ID is not a
        // registrable suffix of the serving origin, so the browser refuses the
        // ceremony BEFORE showing any UI — no Face ID sheet ever appears, which
        // reads as "nothing happened" rather than as a failure. Name it, because
        // the generic message sends people hunting for a device problem when it
        // is a build-config one (see README: VITE_WEBAUTHN_RP_ID).
        setState('error');
        setErrorMsg(`Passkeys aren’t available on this domain (expected ${RP_ID}).`);
      } else {
        setState('error');
        setErrorMsg('Passkey failed. Try your wallet instead.');
      }
      // Keep the underlying reason reachable for support: the UI copy above is
      // deliberately short, and a swallowed DOMException name/message is the
      // difference between a five-minute diagnosis and an afternoon.
      if (name !== 'NotAllowedError') {
        console.warn('[passkey] connect failed', { name, msg });
      }
    }
  }, []);

  const resetOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
    setConnectedAddress(null);
    setState('idle');
  }, []);

  return {
    available,
    state,
    errorMsg,
    needsOnboarding,
    connectedAddress,
    trigger,
    resetOnboarding,
    loading: state === 'checking' || state === 'unlocking',
  };
}
