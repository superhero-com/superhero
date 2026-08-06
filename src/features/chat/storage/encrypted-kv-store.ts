/**
 * encrypted-kv-store.ts — encrypt-at-rest wrapper over any `KeyValueStore`
 * (the chat-key exception).
 *
 * Wraps a plain `KeyValueStore` so VALUES are AES-256-GCM ciphertext at rest;
 * KEYS pass through unchanged (so `getAllKeys` / prefix enumeration still work
 * for the ported services). Message history (`CHAT_MESSAGES_*`) MUST go through
 * this wrapper. The AES key is the non-extractable, session-scoped key from
 * `deriveMessageStorageKey` — with the session locked there is no key on disk,
 * so a passive read of IndexedDB yields ciphertext only.
 *
 * KNOWN RESIDUAL (for the Security Reviewer): value CONTENT is sealed, but the
 * KEY NAMES are not — `CHAT_MESSAGES_dm_<pubkey>` still reveals which nostr
 * pubkeys you have talked to (conversation-partner metadata), matching the
 * app's key layout. Content confidentiality is delivered; partner-metadata
 * confidentiality is not, and is called out rather than papered over.
 */
import type { KeyValueStore } from './kv-store';

const ALG = 'AES-GCM';
const IV_BYTES = 12; // 96-bit GCM nonce
const PREFIX = 'v1'; // envelope version tag

const enc = new TextEncoder();
const dec = new TextDecoder();

// TS 5.7 widens typed arrays to `Uint8Array<ArrayBufferLike>`, which no longer
// structurally matches WebCrypto's `BufferSource`. Runtime no-op cast (mirrors
// `wallet/vault.ts`).
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

async function encryptValue(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALG, iv }, key, bs(enc.encode(plaintext))),
  );
  return `${PREFIX}.${toB64(iv)}.${toB64(ct)}`;
}

async function decryptValue(key: CryptoKey, envelope: string): Promise<string> {
  const parts = envelope.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    throw new Error('encrypted-kv: unrecognized envelope format');
  }
  const iv = fromB64(parts[1]);
  const ct = fromB64(parts[2]);
  const pt = await crypto.subtle.decrypt({ name: ALG, iv: bs(iv) }, key, bs(ct));
  return dec.decode(pt);
}

/**
 * Return a `KeyValueStore` that transparently seals values written to `inner`
 * under `key` and unseals them on read. Decryption throws (GCM auth failure) on
 * a tampered or wrong-key value — no silent corruption path.
 */
export function createEncryptedKeyValueStore(inner: KeyValueStore, key: CryptoKey): KeyValueStore {
  return {
    async getItem(k) {
      const stored = await inner.getItem(k);
      return stored === null ? null : decryptValue(key, stored);
    },
    async setItem(k, value) {
      await inner.setItem(k, await encryptValue(key, value));
    },
    removeItem(k) {
      return inner.removeItem(k);
    },
    getAllKeys() {
      return inner.getAllKeys();
    },
    async multiGet(keys) {
      const rows = await inner.multiGet(keys);
      return Promise.all(
        rows.map(async ([k, stored]): Promise<[string, string | null]> => [
          k,
          stored === null ? null : await decryptValue(key, stored),
        ]),
      );
    },
    multiRemove(keys) {
      return inner.multiRemove(keys);
    },
    clear() {
      return inner.clear();
    },
  };
}
