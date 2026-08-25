/**
 * The wallet lifecycle.
 *
 * The orchestration bridge between the (tested) crypto core and the UI + the
 * AeSdkProvider signer. Screens call these; they never touch WebCrypto directly.
 *
 * Boundaries kept from the threat model / the custody decision:
 *  - Import/create take the mnemonic transiently and hand it to the vault; it is
 *    never stored in the clear (R-05 string-lifetime caveat still applies).
 *  - Each `*UnlockProvider` returns a closure the signer runs on EVERY signature
 *    (UV-per-signature). The passphrase provider's "UV" is the passphrase prompt;
 *    the passkey provider's UV is the WebAuthn ceremony (device-gated).
 *  - Enrolling any factor requires the ALREADY-UNLOCKED DEK — you cannot add a
 *    factor without first proving you can unlock.
 */
import {
  addFactor, createVault, markMnemonicBackedUp, unlockVault,
  type FactorEnrollment, type VaultRecord,
} from './vault-record';
import {
  DEFAULT_ARGON2ID, kekFromHighEntropy, kekFromPassphrase,
  type Argon2idKdf, type HkdfKdf,
} from './factors';
import { fromB64, toB64 } from './vault';
import { generateRecoveryCode, parseRecoveryCode } from './recovery';
import { discoverPrf, enrollPrfCredential, evaluatePrf } from './webauthn';
import { mnemonicFromPrf, seedPrfSalt } from './passkey-seed';
import { deriveAccount } from './derivation';
import type { VaultStore } from './vault-store';
import type { UnlockProvider } from './inline-signer';

const b64rand = (n: number) => toB64(crypto.getRandomValues(new Uint8Array(n)));

async function passphraseEnrollment(passphrase: string, label: string, now: number): Promise<FactorEnrollment> {
  const kdf: Argon2idKdf = { alg: 'argon2id', salt: b64rand(16), ...DEFAULT_ARGON2ID };
  return {
    id: crypto.randomUUID(), type: 'passphrase', label, createdAt: now, kdf, kek: await kekFromPassphrase(passphrase, kdf),
  };
}

/**
 * Import (or create) a wallet from a mnemonic, protected by a first passphrase
 * factor, and persist it — returning the freshly-unlocked DEK alongside the
 * record. Refuses if a vault already exists on this device.
 *
 * The DEK is returned because enrolling any FURTHER factor (recovery code,
 * device passkey) requires an already-unlocked DEK by construction
 * (`addFactor`), and onboarding enrolls all three back-to-back. Re-deriving it
 * would mean running Argon2id a second time (~1s of the user's onboarding) for
 * no security gain — the caller already proved knowledge of the passphrase by
 * choosing it a moment earlier.
 *
 * CALLER CONTRACT: the DEK is transient. Use it for the enrollments that
 * immediately follow and then drop the reference. It must never be persisted,
 * cached across signatures, or held for the session — a session-cached DEK
 * collapses the UV-per-signature custody model.
 */
export async function importWalletWithDek(
  store: VaultStore,
  opts: { mnemonic: string; passphrase: string; now: number },
): Promise<{ record: VaultRecord; dek: CryptoKey }> {
  if (await store.load()) throw new Error('wallet: a vault already exists on this device');
  const enrollment = await passphraseEnrollment(opts.passphrase, 'Passphrase', opts.now);
  const record = await createVault(opts.mnemonic, enrollment, opts.now);
  await store.save(record);
  // Unwrap through the record we just wrote, so the DEK we hand back is proven
  // to be the one the persisted passphrase factor actually opens — this is the
  // enroll-time lock→unlock round-trip the build plan §4.6 requires, not a
  // shortcut around it.
  const { dek } = await unlockVault(record, enrollment.id, enrollment.kek);
  return { record, dek };
}

/**
 * Import (or create) a wallet from a mnemonic, protected by a first passphrase
 * factor, and persist it. Refuses if a vault already exists on this device.
 */
export async function importWallet(
  store: VaultStore,
  opts: { mnemonic: string; passphrase: string; now: number },
): Promise<VaultRecord> {
  return (await importWalletWithDek(store, opts)).record;
}

/** The passphrase UnlockProvider (UV = the passphrase prompt the UI shows). */
export function passphraseUnlockProvider(passphrase: string): UnlockProvider {
  return async (record: VaultRecord) => {
    const factor = record.factors.find((f) => f.type === 'passphrase');
    if (!factor) throw new Error('wallet: no passphrase factor enrolled');
    return { factorId: factor.id, kek: await kekFromPassphrase(passphrase, factor.kdf as Argon2idKdf) };
  };
}

/**
 * Enroll a recovery-code factor. Returns the code to display ONCE and the
 * updated record. Requires the already-unlocked DEK.
 */
export async function addRecoveryCodeFactor(
  store: VaultStore,
  record: VaultRecord,
  dek: CryptoKey,
  now: number,
): Promise<{ record: VaultRecord; code: string }> {
  const { code, bytes } = generateRecoveryCode();
  const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: b64rand(32), info: 'recovery-code' };
  const enrollment: FactorEnrollment = {
    id: crypto.randomUUID(), type: 'recovery-code', label: 'Recovery code', createdAt: now, kdf, kek: await kekFromHighEntropy(bytes, kdf),
  };
  const updated = await addFactor(record, dek, enrollment);
  await store.save(updated);
  return { record: updated, code };
}

/** The recovery-code UnlockProvider (the user retypes their recovery code). */
export function recoveryUnlockProvider(code: string): UnlockProvider {
  const bytes = parseRecoveryCode(code); // throws on malformed length before any signing
  return async (record: VaultRecord) => {
    const factor = record.factors.find((f) => f.type === 'recovery-code');
    if (!factor) throw new Error('wallet: no recovery-code factor enrolled');
    return { factorId: factor.id, kek: await kekFromHighEntropy(bytes, factor.kdf as HkdfKdf) };
  };
}

/**
 * DEVICE-GATED. Enroll a platform-passkey (WebAuthn PRF) factor. Runs the create
 * ceremony, wraps the DEK under the PRF-derived KEK, and stores the credential id
 * + prfSalt so it can be re-evaluated at unlock. Requires the already-unlocked DEK.
 */
export async function addPasskeyFactor(
  store: VaultStore,
  record: VaultRecord,
  dek: CryptoKey,
  opts: { userId: Uint8Array; userName: string; label: string; now: number },
): Promise<VaultRecord> {
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const { credentialId, prfOutput, rpId } = await enrollPrfCredential({
    userId: opts.userId, userName: opts.userName, prfSalt,
  });
  const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: b64rand(32), info: 'webauthn-prf' };
  const enrollment: FactorEnrollment = {
    id: crypto.randomUUID(),
    type: 'webauthn-prf',
    label: opts.label,
    createdAt: opts.now,
    kdf,
    kek: await kekFromHighEntropy(prfOutput, kdf),
    webauthn: { credentialId: toB64(credentialId), prfSalt: toB64(prfSalt), rpId },
  };
  const updated = await addFactor(record, dek, enrollment);
  await store.save(updated);
  return updated;
}

/**
 * DEVICE-GATED. Create a wallet whose seed IS the passkey — the web (non-PWA)
 * path, where there is no seed-phrase screen.
 *
 * One ceremony does everything: enroll a platform passkey, derive the BIP39
 * mnemonic from its PRF output at the FIXED seed salt (`passkey-seed.ts`), seal
 * that mnemonic into a fresh vault, and wrap the DEK under a KEK derived from
 * the same PRF output — under a DIFFERENT HKDF `info`, so the wrapping key and
 * the seed material are cryptographically independent.
 *
 * Why the mnemonic is not shown: it does not need to be written down, because it
 * is recoverable from the passkey alone (a fixed salt, no stored per-enrollment
 * randomness). It stays exportable from settings, and it
 * is a normal BIP39 phrase on the standard derivation path, so the account can
 * be imported into the extension or native wallet like any other.
 *
 * `mnemonicBackedUpAt` is deliberately left null: no VERIFIED written backup
 * happened. Callers that want a durable off-device copy should still enroll a
 * recovery code (onboarding does).
 *
 * Refuses if a vault already exists on this device.
 */
export async function createWalletFromPasskey(
  store: VaultStore,
  opts: { userName: string; label?: string; now: number },
): Promise<{ record: VaultRecord; dek: CryptoKey; mnemonic: string }> {
  if (await store.load()) throw new Error('wallet: a vault already exists on this device');

  const prfSalt = seedPrfSalt();
  const { credentialId, prfOutput, rpId } = await enrollPrfCredential({
    userId: crypto.getRandomValues(new Uint8Array(16)),
    // Shown in the OS passkey picker. Public data only — never anything
    // identifying beyond what the user already published.
    userName: opts.userName,
    prfSalt,
  });

  // The seed comes from the PRF output...
  const mnemonic = mnemonicFromPrf(prfOutput);

  // ...and so does the KEK, but through a different HKDF info (see factors.ts's
  // 'webauthn-prf'), so neither derivation reveals the other.
  const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: b64rand(32), info: 'webauthn-prf' };
  const enrollment: FactorEnrollment = {
    id: crypto.randomUUID(),
    type: 'webauthn-prf',
    label: opts.label ?? 'This device',
    createdAt: opts.now,
    kdf,
    kek: await kekFromHighEntropy(prfOutput, kdf),
    webauthn: { credentialId: toB64(credentialId), prfSalt: toB64(prfSalt), rpId },
  };

  const record = await createVault(mnemonic, enrollment, opts.now);
  await store.save(record);
  // Same enroll-time lock→unlock round-trip as importWalletWithDek: the DEK we
  // hand back is proven to be the one the persisted factor actually opens.
  const { dek } = await unlockVault(record, enrollment.id, enrollment.kek);
  return { record, dek, mnemonic };
}

/** Everything a passkey-recovery ceremony yields, held ONLY until the user confirms. */
export type RecoveredWalletMaterial = {
  credentialId: Uint8Array;
  prfOutput: Uint8Array;
  rpId: string;
  mnemonic: string;
  address: string;
};

/**
 * DEVICE-GATED. Run the discoverable recovery ceremony and derive the wallet it
 * implies — persisting NOTHING. Split from the commit so the UI can show the
 * derived address for confirmation first: the passkey the user picks may be a
 * seed-phrase wallet's device factor (random wrap salt, not the fixed seed salt),
 * and evaluating THAT at the seed salt derives a valid but different, empty
 * wallet. Committing before the user confirms would persist the wrong one and
 * then block their correct import with "a vault already exists".
 */
export async function deriveRecoveredWallet(store: VaultStore): Promise<RecoveredWalletMaterial> {
  if (await store.load()) throw new Error('wallet: a vault already exists on this device');
  const { credentialId, prfOutput, rpId } = await discoverPrf({ prfSalt: seedPrfSalt() });
  const mnemonic = mnemonicFromPrf(prfOutput);
  return {
    credentialId, prfOutput, rpId, mnemonic, address: deriveAccount(mnemonic, 0).address,
  };
}

/**
 * DEVICE-GATED. Persist the wallet derived by `deriveRecoveredWallet` — called
 * only after the user confirmed the address. Reuses the held PRF output, so
 * recovery stays a single biometric prompt. Mirrors `createWalletFromPasskey`,
 * including the enroll-time lock→unlock round-trip.
 */
export async function commitRecoveredWallet(
  store: VaultStore,
  material: RecoveredWalletMaterial,
  now: number,
): Promise<{ record: VaultRecord; dek: CryptoKey }> {
  if (await store.load()) throw new Error('wallet: a vault already exists on this device');
  const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: b64rand(32), info: 'webauthn-prf' };
  const enrollment: FactorEnrollment = {
    id: crypto.randomUUID(),
    type: 'webauthn-prf',
    label: 'This device',
    createdAt: now,
    kdf,
    kek: await kekFromHighEntropy(material.prfOutput, kdf),
    webauthn: {
      credentialId: toB64(material.credentialId),
      prfSalt: toB64(seedPrfSalt()),
      rpId: material.rpId,
    },
  };
  const record = await createVault(material.mnemonic, enrollment, now);
  await store.save(record);
  const { dek } = await unlockVault(record, enrollment.id, enrollment.kek);
  return { record, dek };
}

/**
 * Record that the user completed a VERIFIED written-mnemonic backup and persist
 * it. IndexedDB is evictable — this flag is
 * the only durable evidence the seed exists outside the device, so it is written
 * from the flow that actually made the user re-enter words, never optimistically.
 */
export async function recordMnemonicBackedUp(
  store: VaultStore,
  record: VaultRecord,
  now: number,
): Promise<VaultRecord> {
  const updated = markMnemonicBackedUp(record, now);
  await store.save(updated);
  return updated;
}

/** Whether the vault has an enrolled factor of `type` (drives which unlocks the UI offers). */
export function hasFactor(record: VaultRecord, type: FactorEnrollment['type']): boolean {
  return record.factors.some((f) => f.type === type);
}

/** DEVICE-GATED. The passkey UnlockProvider (UV = the WebAuthn PRF ceremony). */
export function passkeyUnlockProvider(): UnlockProvider {
  return async (record: VaultRecord) => {
    const factor = record.factors.find((f) => f.type === 'webauthn-prf');
    if (!factor?.webauthn) throw new Error('wallet: no passkey factor enrolled');
    const prfOutput = await evaluatePrf({
      credentialId: fromB64(factor.webauthn.credentialId),
      prfSalt: fromB64(factor.webauthn.prfSalt),
    });
    return { factorId: factor.id, kek: await kekFromHighEntropy(prfOutput, factor.kdf as HkdfKdf) };
  };
}
