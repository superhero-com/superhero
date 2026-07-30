/**
 * P2 slice 4 — the VaultRecord (the wallet build plan §4.2): one per wallet, the encrypted
 * envelope at rest. Ties the DEK-sealed mnemonic to an OR-set of WrappedFactors
 * (any one unlocks it). Pure logic over a plain object — persistence is a
 * separate adapter (vault-store) so this is fully unit-testable.
 *
 * Custody invariants enforced here:
 *  - The record holds NO plaintext: only the sealed mnemonic + per-factor wrapped
 *    DEK blobs. Unlock returns the mnemonic TRANSIENTLY; callers must not cache it
 *    or the DEK across signatures (UV-per-signature is enforced at the signer, P4).
 *  - Never remove the last factor — that would make the wallet permanently
 *    unrecoverable (the write-only-backup is the fallback, not an unlock path).
 */
import {
  generateDek, seal, unseal, type SealedBox,
} from './vault';
import {
  unwrapDek, wrapDek, type KdfParams, type FactorType, type WrappedFactor,
} from './factors';

export interface VaultRecord {
  v: 1;
  createdAt: number;
  /** the BIP39 mnemonic sealed under the DEK. */
  seal: SealedBox;
  /** metadata, not secret. */
  mnemonicWordCount: number;
  /** OR-set — any one factor unlocks the DEK. Always length >= 1. */
  factors: WrappedFactor[];
  /** timestamp the user verified their WRITTEN mnemonic backup, or null. */
  mnemonicBackedUpAt: number | null;
}

/** A factor whose KEK the caller already derived (passphrase/PRF/recovery). */
export interface FactorEnrollment {
  id: string;
  type: FactorType;
  label: string;
  createdAt: number;
  kek: CryptoKey;
  kdf: KdfParams;
  webauthn?: WrappedFactor['webauthn'];
}

function wordCount(mnemonic: string): number {
  return mnemonic.trim().split(/\s+/).length;
}

async function toWrappedFactor(dek: CryptoKey, e: FactorEnrollment): Promise<WrappedFactor> {
  return {
    id: e.id,
    type: e.type,
    label: e.label,
    createdAt: e.createdAt,
    kdf: e.kdf,
    wrap: await wrapDek(dek, e.kek, e.id, e.type),
    ...(e.webauthn ? { webauthn: e.webauthn } : {}),
  };
}

/** Create a fresh vault: fresh DEK, seal the mnemonic, wrap the DEK under `first`. */
export async function createVault(mnemonic: string, first: FactorEnrollment, now: number): Promise<VaultRecord> {
  const dek = await generateDek();
  return {
    v: 1,
    createdAt: now,
    seal: await seal(mnemonic, dek),
    mnemonicWordCount: wordCount(mnemonic),
    factors: [await toWrappedFactor(dek, first)],
    mnemonicBackedUpAt: null,
  };
}

/**
 * Unlock via one factor's KEK: unwrap the DEK, unseal the mnemonic. Returns both
 * TRANSIENTLY — the caller derives + signs + zeroizes and must never cache them.
 * Throws if the factor id is unknown or the KEK is wrong (GCM auth failure).
 */
export async function unlockVault(
  record: VaultRecord,
  factorId: string,
  kek: CryptoKey,
): Promise<{ mnemonic: string; dek: CryptoKey }> {
  const factor = record.factors.find((f) => f.id === factorId);
  if (!factor) throw new Error(`vault: no factor ${factorId}`);
  const dek = await unwrapDek(factor, kek);
  const mnemonic = await unseal(record.seal, dek);
  return { mnemonic, dek };
}

/** Add a factor to the OR-set. Requires the already-unlocked DEK. */
export async function addFactor(record: VaultRecord, dek: CryptoKey, e: FactorEnrollment): Promise<VaultRecord> {
  if (record.factors.some((f) => f.id === e.id)) throw new Error(`vault: factor ${e.id} already exists`);
  return { ...record, factors: [...record.factors, await toWrappedFactor(dek, e)] };
}

/** Remove a factor. NEVER removes the last one — that would lock out the wallet. */
export function removeFactor(record: VaultRecord, factorId: string): VaultRecord {
  if (record.factors.length <= 1) {
    throw new Error('vault: cannot remove the only unlock factor (would lock out the wallet)');
  }
  const factors = record.factors.filter((f) => f.id !== factorId);
  if (factors.length === record.factors.length) throw new Error(`vault: no factor ${factorId}`);
  return { ...record, factors };
}

/** Record that the user verified their written mnemonic backup (the wallet build plan §4.6). */
export function markMnemonicBackedUp(record: VaultRecord, now: number): VaultRecord {
  return { ...record, mnemonicBackedUpAt: now };
}
