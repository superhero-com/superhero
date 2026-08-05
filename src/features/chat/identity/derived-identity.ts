/**
 * The one v1 `NostrIdentityProvider` implementation: a provider
 * backed by the seed-derived nostr key.
 *
 * Custody property: the secret key bytes are captured in this closure and NEVER
 * returned. Callers get sign / encrypt / decrypt, not the key — so a raw nostr
 * secret cannot leak out through this seam by construction. The `UserKeys` it is
 * built from is the session-cached, memory-only nostr handle
 * (`../identity/nostr-session`); this factory itself neither persists nor caches
 * anything.
 */
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import * as nip04 from 'nostr-tools/nip04';
import { hexToBytes } from '@noble/hashes/utils';
import type { UserKeys, NostrEvent } from '../core/types';
import type { NostrIdentityProvider } from './nostr-identity';

export function createDerivedNostrIdentity(keys: UserKeys): NostrIdentityProvider {
  // Bytes live only in this closure; `keys.privateKey` (hex) is never re-exposed.
  const secretKey = hexToBytes(keys.privateKey);
  const { publicKey } = keys;

  return {
    async getPublicKey() {
      return publicKey;
    },
    async signEvent(template: EventTemplate) {
      return finalizeEvent(template, secretKey) as unknown as NostrEvent;
    },
    async nip04Encrypt(recipientPubkey: string, plaintext: string) {
      return nip04.encrypt(secretKey, recipientPubkey, plaintext);
    },
    async nip04Decrypt(senderPubkey: string, ciphertext: string) {
      return nip04.decrypt(secretKey, senderPubkey, ciphertext);
    },
  };
}
