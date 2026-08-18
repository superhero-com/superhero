/**
 * usePasskeyConnect
 *
 * Shared hook for the passkey connect flow used in OnboardingModal and
 * ConnectWalletModal. Handles three cases:
 *
 * 1. No vault → show WalletOnboarding (creates wallet + enrolls passkey)
 * 2. Vault with passkey factor → trigger WebAuthn unlock
 * 3. Vault without passkey factor → guide user to enroll one in settings
 */

import {
  useCallback, useEffect, useState,
} from 'react';
import { isPlatformAuthenticatorAvailable, RP_ID } from '@/features/wallet/webauthn';
import { createIndexedDbVaultStore } from '@/features/wallet/vault-store';

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

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable);
  }, []);

  const trigger = useCallback(async () => {
    setState('checking');
    setErrorMsg(null);
    setNeedsOnboarding(false);

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
      const credentialId = passkeyFactor?.webauthn?.credentialId;

      if (!credentialId) {
        setState('error');
        setErrorMsg('Passkey data is incomplete. Try reconnecting your wallet.');
        return;
      }

      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          // The pinned build-time RP ID — the custody boundary. Imported rather
          // than re-reading import.meta.env, so there is exactly ONE place this
          // value is decided (webauthn.ts). A second inline copy silently drifts:
          // it would keep defaulting to superhero.com on a build that had set
          // VITE_WEBAUTHN_RP_ID, and every ceremony here would fail with a
          // SecurityError while enrollment elsewhere worked.
          rpId: RP_ID,
          userVerification: 'required',
          allowCredentials: [{
            id: Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
            type: 'public-key' as const,
          }],
          extensions: { prf: {} } as unknown as AuthenticationExtensionsClientInputs,
        },
      });

      // Success — the wallet lifecycle will pick up the account
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
    setState('idle');
  }, []);

  return {
    available,
    state,
    errorMsg,
    needsOnboarding,
    trigger,
    resetOnboarding,
    loading: state === 'checking' || state === 'unlocking',
  };
}
