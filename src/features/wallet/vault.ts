/**
 * The inner envelope.
 *
 * A random 256-bit Data-Encryption-Key (DEK) AES-256-GCM-seals the BIP39
 * mnemonic. The DEK is itself wrapped, separately, under each enrolled factor's
 * Key-Encryption-Key (KEK) — passphrase (Argon2id) and passkey (WebAuthn PRF →
 * HKDF) — but that wrapping is a LATER slice; this file is only the innermost
 * seal/unseal and DEK lifecycle. WebCrypto only; no third-party crypto deps.
 *
 * Custody rules this module observes:
 *  - Never persists plaintext. Only `SealedBox` (self-describing: alg + iv +
 *    ciphertext + aad) is storable.
 *  - The mnemonic transits as a JS `string` (R-05: an immutable string cannot be
 *    truly zeroed — an inherent JS-platform limit, not a design defect). Callers
 *    must minimise its lifetime and MUST NOT cache an unlocked DEK or plaintext
 *    across signatures (UV-per-signature is enforced at the signer layer, P4).
 *  - AES-GCM binds a fixed AAD so a box sealed for this vault can't be replayed
 *    into a different context; every seal uses a fresh random 96-bit IV (never
 *    reuse an IV under the same key — catastrophic for GCM).
 */

const ALG = 'AES-GCM';
const IV_BYTES = 12; // 96-bit IV, the GCM standard/nonce size
/**
 * The AAD every vault seal is bound to. Exported so `unlockVault` can assert it
 * rather than trusting the value carried inside the (untrusted) box — without
 * that assertion the binding this module advertises does not actually hold.
 */
export const VAULT_AAD = 'superhero-vault-v1';

/**
 * Ciphertext at rest. No key material. Safe to store in the vault record.
 *
 * Self-describing: the box records the `alg` and `aad` it was
 * sealed under, so open reads them back from the box instead of from the current
 * code constants — the same property the factor layer's KDF recipe already has
 * (`factors.ts`), which is what makes an algorithm/AAD change forward-compatible
 * rather than a format migration. `alg`/`aad` are optional so a legacy `{iv,ct}`
 * box still opens via the constant fallback.
 */
export interface SealedBox {
  /** AEAD algorithm this box was sealed under. Absent on legacy `{iv,ct}` boxes. */
  alg?: string;
  /** base64 of the 96-bit random IV. */
  iv: string;
  /** base64 of AES-GCM ciphertext (includes the 128-bit auth tag). */
  ct: string;
  /** AAD bound at seal time, read back on open. Absent on legacy `{iv,ct}` boxes. */
  aad?: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** base64-encode raw bytes (small inputs — IVs, ciphertext, wrapped keys). */
export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** decode base64 back to bytes. */
export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * Generate a fresh random DEK. `extractable: true` because slice 2 must wrap it
 * under each factor KEK; it is never persisted in the clear and lives in memory
 * only for the duration of an unlock.
 */
export function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALG, length: 256 }, true, ['encrypt', 'decrypt']);
}

// TS 5.7's typed-array generics widen `TextEncoder.encode()` / `Uint8Array` to
// `Uint8Array<ArrayBufferLike>`, which no longer structurally matches WebCrypto's
// `BufferSource`. These casts are runtime no-ops (the values already ARE valid
// BufferSources — the vault tests prove the round-trip); they only bridge the
// type generic.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

/** AES-256-GCM-seal a UTF-8 string (the mnemonic) under the DEK. */
export async function seal(plaintext: string, dek: CryptoKey, aad: string = VAULT_AAD): Promise<SealedBox> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: ALG, iv, additionalData: bs(enc.encode(aad)) },
    dek,
    bs(enc.encode(plaintext)),
  ));
  return {
    alg: ALG, iv: toB64(iv), ct: toB64(ct), aad,
  };
}

/**
 * Unseal a `SealedBox` back to the plaintext. The `alg` and `aad` are read from
 * the box (constant fallback for legacy `{iv,ct}` boxes), never from the current
 * code constants. Pass `expectedAad` to assert the box's context — a mismatch
 * fails closed before decrypt. Throws (GCM auth failure) if the DEK, IV,
 * ciphertext, or recorded AAD is wrong or tampered — no silent corruption path.
 */
export async function unseal(box: SealedBox, dek: CryptoKey, expectedAad?: string): Promise<string> {
  const alg = box.alg ?? ALG;
  const aad = box.aad ?? VAULT_AAD;
  if (expectedAad !== undefined && expectedAad !== aad) {
    throw new Error('vault: sealed box AAD does not match the expected context');
  }
  const pt = await crypto.subtle.decrypt(
    { name: alg, iv: bs(fromB64(box.iv)), additionalData: bs(enc.encode(aad)) },
    dek,
    bs(fromB64(box.ct)),
  );
  return dec.decode(pt);
}
