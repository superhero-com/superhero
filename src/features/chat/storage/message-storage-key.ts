/**
 * message-storage-key.ts — the at-rest key for encrypted chat history
 * (the chat-key exception).
 *
 * Message history must NOT sit in IndexedDB as plaintext (the mobile app stores
 * decrypted arrays; on a web origin that is a passive-XSS read that outlives the
 * session — see the custody delta). We encrypt it at rest under a key
 * that is:
 *   - derived from the session nostr secret via HKDF-SHA256 with a distinct
 *     `info` label (domain separation — this key is unrelated to signing);
 *   - NON-EXTRACTABLE (`extractable: false`) so even active same-origin script
 *     cannot read the raw key out of WebCrypto;
 *   - never persisted. It lives only for the unlocked session, alongside the
 *     nostr key it is derived from, and dies with it.
 *
 * The nostr secret is itself the vault-sealed mnemonic's child (see
 * `wallet/nostr-key.ts`), so at rest — with the session locked — history is
 * AES-GCM ciphertext with no key anywhere on disk. This is the "justified
 * alternative" to sealing a fresh key inside the VaultRecord that
 * permits: it needs no vault-envelope change or re-enrollment, and binds
 * readability to the same one verification that unlocks the identity. Flagged
 * for the Security Reviewer.
 */
import { hexToBytes } from '@noble/hashes/utils.js';

const HKDF_INFO = 'superhero-chat-message-storage-v1';

// TS 5.7 widens typed arrays to `Uint8Array<ArrayBufferLike>`, which no longer
// structurally matches WebCrypto's `BufferSource`. Runtime no-op cast (mirrors
// `wallet/vault.ts`).
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

/**
 * Derive the non-extractable AES-256-GCM key that encrypts message history at
 * rest, from the session nostr private key (hex).
 */
export async function deriveMessageStorageKey(nostrPrivateKeyHex: string): Promise<CryptoKey> {
  const ikm = hexToBytes(nostrPrivateKeyHex);
  const baseKey = await crypto.subtle.importKey('raw', bs(ikm), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: bs(new Uint8Array(0)),
      info: bs(new TextEncoder().encode(HKDF_INFO)),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — cannot be read back out of WebCrypto
    ['encrypt', 'decrypt'],
  );
}
