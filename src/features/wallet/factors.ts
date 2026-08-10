/**
 * P2 slice 2 — the factor → KEK layer (the wallet build plan §4.1/§4.3).
 *
 * Each enrolled unlock factor derives a Key-Encryption-Key (KEK) that WRAPS the
 * DEK (from `vault.ts`). Multiple factors form an OR-set: any one can unwrap the
 * same DEK, so the wallet's confidentiality equals the WEAKEST enrolled factor
 * (the wallet build plan §4.4). Hence the hard rule enforced by construction here:
 *
 *   - `passphrase` → Argon2id (memory-hard) — the only factor that may take a
 *     LOW-entropy user secret, because Argon2id is the work-factor that makes an
 *     offline attack on an exfiltrated wrapped blob expensive. Even so, callers
 *     must require a HIGH-entropy passphrase (never a short PIN — a short PIN
 *     through any KDF is brute-forced offline; see §4.4 / the §6 corrections).
 *   - `recovery-code` / `webauthn-prf` → HKDF-SHA256 — valid ONLY because their
 *     inputs are already high-entropy (a 128-bit recovery code; a 32-byte
 *     WebAuthn PRF output). Never feed a low-entropy secret to HKDF here.
 *
 * The DEK is wrapped via WebCrypto `wrapKey`/`unwrapKey`, so its raw bytes are
 * never exposed to JS during wrapping. The KEK is imported non-extractable.
 * AES-256-GCM binds an AAD to the factor id+type so a wrapped blob can't be
 * replayed under a different factor. `createdAt`/ids are caller-supplied (this
 * module uses no ambient clock or RNG beyond WebCrypto).
 */
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { argon2idRaw } from './argon2-engine';
import { fromB64, toB64, type SealedBox } from './vault';

const WRAP_ALG = 'AES-GCM';
const WRAP_IV_BYTES = 12;

export type FactorType = 'passphrase' | 'recovery-code' | 'webauthn-prf';

/** Argon2id parameters — stored per factor so they are upgradeable per device. */
export interface Argon2idKdf {
  alg: 'argon2id';
  /** base64 of the 16-byte salt. */
  salt: string;
  /** memory in KiB, time (iterations), parallelism. */
  m: number;
  t: number;
  p: number;
}

/** HKDF-SHA256 parameters (high-entropy inputs only). */
export interface HkdfKdf {
  alg: 'hkdf-sha256';
  /** base64 of the 32-byte salt. */
  salt: string;
  info: string;
}

export type KdfParams = Argon2idKdf | HkdfKdf;

/** One wrapped copy of the DEK, unlockable by one factor. No plaintext secret. */
export interface WrappedFactor {
  id: string;
  type: FactorType;
  label: string;
  createdAt: number;
  kdf: KdfParams;
  /** the DEK wrapped (AES-256-GCM) under this factor's KEK. */
  wrap: SealedBox;
  /** present only for `webauthn-prf`: how to obtain the PRF output again. */
  webauthn?: { credentialId: string; prfSalt: string; rpId: string };
}

/**
 * Argon2id defaults — the wallet build plan §4.3, for the seed-phrase asset class (an
 * offline, unlimited-time target once a device/backup is exfiltrated). `m` is a
 * FLOOR: never drop below 64 MiB — memory-hardness is what defeats GPU/ASIC
 * attackers; `t` is the tunable dial if unlock latency ever forces a cut.
 * Stored per-factor in the envelope, so raising these never strands an old vault.
 */
export const DEFAULT_ARGON2ID = { m: 65536, t: 3, p: 1 } as const;

const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;
const utf8 = (s: string) => new TextEncoder().encode(s);

/** Import 32 raw KEK bytes as a non-extractable AES-GCM key usable only to (un)wrap. */
function importKek(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bs(raw), { name: WRAP_ALG }, false, ['wrapKey', 'unwrapKey']);
}

/** Derive a KEK from a (high-entropy) passphrase via Argon2id (WASM-first, pure-JS fallback). */
export async function kekFromPassphrase(passphrase: string, params: Argon2idKdf): Promise<CryptoKey> {
  const raw = await argon2idRaw(utf8(passphrase), fromB64(params.salt), {
    m: params.m, t: params.t, p: params.p, dkLen: 32,
  });
  return importKek(raw);
}

/** Derive a KEK from a HIGH-ENTROPY secret (recovery code bytes, or a WebAuthn PRF output) via HKDF. */
export async function kekFromHighEntropy(secret: Uint8Array, params: HkdfKdf): Promise<CryptoKey> {
  const raw = hkdf(sha256, secret, fromB64(params.salt), params.info, 32);
  return importKek(raw);
}

/** The AAD that binds a wrap blob to the exact factor it is filed under. */
function wrapAad(factorId: string, type: FactorType): string {
  return `wrap:${factorId}:${type}`;
}

/** Wrap the DEK under a KEK (AES-256-GCM), binding the factor id+type as AAD. */
export async function wrapDek(dek: CryptoKey, kek: CryptoKey, factorId: string, type: FactorType): Promise<SealedBox> {
  const iv = crypto.getRandomValues(new Uint8Array(WRAP_IV_BYTES));
  const aad = wrapAad(factorId, type);
  const wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', dek, kek, {
    name: WRAP_ALG, iv, additionalData: bs(utf8(aad)),
  } as AesGcmParams));
  return {
    alg: WRAP_ALG, iv: toB64(iv), ct: toB64(wrapped), aad,
  };
}

/**
 * Unwrap the DEK from a WrappedFactor's blob using the factor's KEK. `alg`/`aad`
 * are read from the box (constant/derived fallback for legacy `{iv,ct}` blobs),
 * never from the current code constants. The recorded AAD must still name the
 * factor it is filed under, so a blob moved to a different factor id/type fails
 * closed before decrypt. Throws (GCM auth failure) on a wrong KEK or tampered
 * blob. The returned DEK is extractable so it can be re-wrapped when adding a factor.
 */
export async function unwrapDek(factor: WrappedFactor, kek: CryptoKey): Promise<CryptoKey> {
  const alg = factor.wrap.alg ?? WRAP_ALG;
  const bound = wrapAad(factor.id, factor.type);
  const aad = factor.wrap.aad ?? bound;
  if (aad !== bound) throw new Error('vault: wrapped-factor AAD does not bind this factor');
  return crypto.subtle.unwrapKey(
    'raw',
    bs(fromB64(factor.wrap.ct)),
    kek,
    { name: alg, iv: bs(fromB64(factor.wrap.iv)), additionalData: bs(utf8(aad)) } as AesGcmParams,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}
