/**
 * Nostr crypto — ported from `superhero-app/src/features/chat/nostr/crypto.ts`.
 *
 * Key derivation, NIP-04 encrypt/decrypt. This is a SECOND, independent
 * derivation path alongside the AE signer's SLIP-0010 ed25519 path
 * (`src/features/wallet/derivation.ts`): here BIP-32 secp256k1 at
 * `m/44'/1237'/0'/0/<idx>` via `@scure/bip32` `HDKey`. Do not route this through
 * `AccountMnemonicFactory` and do not change the AE path.
 *
 * The web build randoms come from WebCrypto (`crypto.getRandomValues`) rather
 * than the app's `expo-crypto`; the derivation itself is byte-identical to the
 * app (proven by the golden-vector npub test).
 */
import { HDKey } from '@scure/bip32';
import { getPublicKey } from 'nostr-tools/pure';
import * as nip04 from 'nostr-tools/nip04';
import * as nip19 from 'nostr-tools/nip19';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { UserKeys } from '../core/types';
import { getNostrDerivationPath } from '../core/constants';

/**
 * Derive Nostr keys from an æternity wallet BIP-39 seed.
 * @param seed - the BIP-39 seed bytes (`mnemonicToSeedSync(mnemonic)`).
 * @param accountIndex - the wallet account index (default 0).
 */
export function deriveKeysFromSeed(seed: Uint8Array, accountIndex = 0): UserKeys {
  const derived = HDKey.fromMasterSeed(seed).derive(getNostrDerivationPath(accountIndex));
  if (!derived.privateKey) {
    throw new Error('Failed to derive Nostr private key from seed');
  }
  const privateKeyBytes = derived.privateKey;
  const publicKeyHex = getPublicKey(privateKeyBytes);
  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: publicKeyHex,
    npub: nip19.npubEncode(publicKeyHex),
    nsec: nip19.nsecEncode(privateKeyBytes),
  };
}

/** Generate fresh random Nostr keys (not seed-derived). */
export function generateKeys(): UserKeys {
  const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const publicKeyHex = getPublicKey(privateKeyBytes);
  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: publicKeyHex,
    npub: nip19.npubEncode(publicKeyHex),
    nsec: nip19.nsecEncode(privateKeyBytes),
  };
}

/** Encrypt a NIP-04 direct message. */
export async function encryptMessage(
  privateKey: string,
  recipientPubkey: string,
  plaintext: string,
): Promise<string> {
  return nip04.encrypt(privateKey, recipientPubkey, plaintext);
}

/** Decrypt a NIP-04 direct message. */
export async function decryptMessage(
  privateKey: string,
  senderPubkey: string,
  ciphertext: string,
): Promise<string> {
  return nip04.decrypt(privateKey, senderPubkey, ciphertext);
}
