/**
 * P4/P3 integration slice 1 — the wallet lifecycle (the wallet build plan §3.4/§4/§5).
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
  addFactor, createVault, type FactorEnrollment, type VaultRecord,
} from './vault-record';
import {
  DEFAULT_ARGON2ID, kekFromHighEntropy, kekFromPassphrase,
  type Argon2idKdf, type HkdfKdf,
} from './factors';
import { fromB64, toB64 } from './vault';
import { generateRecoveryCode, parseRecoveryCode } from './recovery';
import { enrollPrfCredential, evaluatePrf } from './webauthn';
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
 * factor, and persist it. Refuses if a vault already exists on this device.
 */
export async function importWallet(
  store: VaultStore,
  opts: { mnemonic: string; passphrase: string; now: number },
): Promise<VaultRecord> {
  if (await store.load()) throw new Error('wallet: a vault already exists on this device');
  const record = await createVault(opts.mnemonic, await passphraseEnrollment(opts.passphrase, 'Passphrase', opts.now), opts.now);
  await store.save(record);
  return record;
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
