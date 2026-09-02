/**
 * usePasskeyConnect
 *
 * Shared hook behind the inline-wallet card in OnboardingModal and
 * ConnectWalletModal — the only inline entry point either modal offers, so every
 * branch must end on a control, never on a message:
 *
 * 1. Vault with a usable passkey factor → the WebAuthn unlock, then connect.
 * 2. Anything else, vault or none → hand off to `WalletOnboarding`, which
 *    re-reads the record and picks `exists` (continue / repair / passphrase
 *    unlock / erase) or `choose`.
 *
 * Case 2 used to be an error telling the user to enroll a passkey in "Settings →
 * Security" — a screen that does not exist, `addPasskeyFactor` being reachable
 * only from onboarding. Anyone who took `protect`'s "Skip — use my passphrase"
 * was locked out of a live vault, as was a failed ceremony.
 *
 * Case 1 must actually PROVE the passkey opens this vault. An earlier revision
 * ran `navigator.credentials.get` and discarded the result, which verified
 * nothing (any credential the browser offered "succeeded") and connected nobody.
 * The ceremony goes through the same `passkeyUnlockProvider` the signer uses and
 * the KEK is proven against the vault by unwrapping the DEK, which fails closed
 * at GCM. The mnemonic is deliberately NOT decrypted: connecting needs the
 * public address from the manifest, not the seed.
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
  | 'unlocking' // running the WebAuthn ceremony
  | 'error'
  | 'cancelled';

/**
 * What this device's vault holds, so the card can name what a tap will do before
 * the tap. `unknown` is unreadable storage (private mode, a blocked upgrade) —
 * not "no wallet", so the card keeps its generic copy.
 */
export type DeviceWallet = 'unknown' | 'none' | 'passkey' | 'other-factors';

/** True where a device wallet exists, so there is a way in with or without a passkey. */
export const hasDeviceVault = (d: DeviceWallet): boolean => d === 'passkey' || d === 'other-factors';

/**
 * @param enabled whether the caller can actually render the inline wallet. The
 * probe below opens — and on a fresh device CREATES — the vault database, so it
 * must not run on a surface that renders nothing, least of all in a build with
 * the wallet switched off.
 */
export function usePasskeyConnect(enabled = true) {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<PasskeyState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [deviceWallet, setDeviceWallet] = useState<DeviceWallet>('unknown');
  /** Set once a passkey has been proven against the vault; the card connects it. */
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable);
  }, []);

  const probeVault = useCallback(() => {
    if (!enabled) return;
    createIndexedDbVaultStore().load()
      .then((record) => {
        if (!record) {
          setDeviceWallet('none');
          return;
        }
        const passkey = record.factors.find((f) => f.type === 'webauthn-prf');
        setDeviceWallet(passkey?.webauthn ? 'passkey' : 'other-factors');
      })
      .catch(() => {}); // unreadable storage stays `unknown`; `trigger` reports the real read
  }, [enabled]);

  useEffect(() => { probeVault(); }, [probeVault]);

  /**
   * Hand the device's wallet to `WalletOnboarding`, which re-reads the vault and
   * picks its own screen — one branch for absent, passkey-less and half-repaired.
   */
  const openDeviceWallet = useCallback(() => {
    setErrorMsg(null);
    setState('idle');
    setNeedsOnboarding(true);
  }, []);

  const trigger = useCallback(async () => {
    setState('checking');
    setErrorMsg(null);
    setNeedsOnboarding(false);
    setConnectedAddress(null);

    try {
      const store = createIndexedDbVaultStore();
      const record = await store.load();

      if (!record) {
        setDeviceWallet('none');
        openDeviceWallet();
        return;
      }

      // The SAME factor `passkeyUnlockProvider` will pick, so the two cannot
      // disagree about which credential this unlock is for. Incomplete WebAuthn
      // data means no ceremony is runnable — that is a wallet to open by its
      // other factors, not an error to strand the user on.
      const passkeyFactor = record.factors.find((f) => f.type === 'webauthn-prf');
      if (!passkeyFactor?.webauthn) {
        setDeviceWallet('other-factors');
        openDeviceWallet();
        return;
      }

      setDeviceWallet('passkey');
      setState('unlocking');

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
        openDeviceWallet();
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
        setErrorMsg('Passkey failed.');
      }
      // Keep the underlying reason reachable for support: the UI copy above is
      // deliberately short, and a swallowed DOMException name/message is the
      // difference between a five-minute diagnosis and an afternoon.
      if (name !== 'NotAllowedError') {
        console.warn('[passkey] connect failed', { name, msg });
      }
    }
  }, [openDeviceWallet]);

  const resetOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
    setConnectedAddress(null);
    setState('idle');
    // Onboarding may have erased or created a wallet behind us; a stale label
    // would offer a passkey that is gone.
    probeVault();
  }, [probeVault]);

  return {
    available,
    state,
    errorMsg,
    needsOnboarding,
    deviceWallet,
    connectedAddress,
    trigger,
    openDeviceWallet,
    resetOnboarding,
    loading: state === 'checking' || state === 'unlocking',
  };
}
