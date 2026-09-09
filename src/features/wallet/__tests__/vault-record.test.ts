// @vitest-environment node
import {
  describe, expect, it,
} from 'vitest';
import {
  addFactor, createVault, markMnemonicBackedUp, removeFactor, unlockVault,
  type FactorEnrollment,
} from '../vault-record';
import {
  kekFromHighEntropy, kekFromPassphrase, type Argon2idKdf, type HkdfKdf,
} from '../factors';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const fastArgon = (): Argon2idKdf => ({
  alg: 'argon2id', salt: b64(crypto.getRandomValues(new Uint8Array(16))), m: 256, t: 1, p: 1,
});

async function passphraseEnrollment(pass: string, label = 'passphrase'): Promise<FactorEnrollment> {
  const kdf = fastArgon();
  return {
    id: crypto.randomUUID(), type: 'passphrase', label, createdAt: 0, kdf, kek: await kekFromPassphrase(pass, kdf),
  };
}

async function recoveryEnrollment(code: Uint8Array): Promise<FactorEnrollment> {
  const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: b64(crypto.getRandomValues(new Uint8Array(32))), info: 'recovery' };
  return {
    id: crypto.randomUUID(), type: 'recovery-code', label: 'recovery', createdAt: 0, kdf, kek: await kekFromHighEntropy(code, kdf),
  };
}

describe('VaultRecord — multi-factor OR-set', () => {
  it('create then unlock with the enrolling factor returns the mnemonic', async () => {
    const e = await passphraseEnrollment('correct horse battery staple');
    const record = await createVault(MNEMONIC, e, 1000);
    expect(record.factors).toHaveLength(1);
    expect(record.mnemonicBackedUpAt).toBeNull();
    expect(record.mnemonicWordCount).toBe(12);

    const kek = await kekFromPassphrase('correct horse battery staple', record.factors[0].kdf as Argon2idKdf);
    const { mnemonic } = await unlockVault(record, record.factors[0].id, kek);
    expect(mnemonic).toBe(MNEMONIC);
  });

  it('the record stores NO plaintext of the mnemonic', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    const blob = JSON.stringify(record);
    MNEMONIC.split(' ').forEach((w) => expect(blob.includes(w)).toBe(false));
  });

  it('add a second factor (OR-set): EITHER factor unlocks the same DEK', async () => {
    const p = await passphraseEnrollment('pw');
    let record = await createVault(MNEMONIC, p, 1);

    // unlock with the first factor to obtain the DEK, then enroll a recovery code
    const code = crypto.getRandomValues(new Uint8Array(16));
    const rec = await recoveryEnrollment(code);
    const { dek } = await unlockVault(record, p.id, await kekFromPassphrase('pw', p.kdf as Argon2idKdf));
    record = await addFactor(record, dek, rec);
    expect(record.factors).toHaveLength(2);

    const viaPass = await unlockVault(record, p.id, await kekFromPassphrase('pw', p.kdf as Argon2idKdf));
    const viaCode = await unlockVault(record, rec.id, await kekFromHighEntropy(code, rec.kdf as HkdfKdf));
    expect(viaPass.mnemonic).toBe(MNEMONIC);
    expect(viaCode.mnemonic).toBe(MNEMONIC);
  });

  it('cannot remove the ONLY factor (would brick the wallet)', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    expect(() => removeFactor(record, record.factors[0].id)).toThrow(/only unlock factor/);
  });

  it('can remove a factor when more than one remains; removing an unknown id throws', async () => {
    const p = await passphraseEnrollment('pw');
    let record = await createVault(MNEMONIC, p, 1);
    const rec = await recoveryEnrollment(crypto.getRandomValues(new Uint8Array(16)));
    const { dek } = await unlockVault(record, p.id, await kekFromPassphrase('pw', p.kdf as Argon2idKdf));
    record = await addFactor(record, dek, rec);

    const pruned = removeFactor(record, rec.id);
    expect(pruned.factors).toHaveLength(1);
    expect(pruned.factors[0].id).toBe(p.id);
    expect(() => removeFactor(record, 'nope')).toThrow(/no factor/);
  });

  it('markMnemonicBackedUp records the timestamp', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    expect(markMnemonicBackedUp(record, 42).mnemonicBackedUpAt).toBe(42);
  });

  it('adding a duplicate factor id throws', async () => {
    const p = await passphraseEnrollment('pw');
    const record = await createVault(MNEMONIC, p, 1);
    const { dek } = await unlockVault(record, p.id, await kekFromPassphrase('pw', p.kdf as Argon2idKdf));
    await expect(addFactor(record, dek, p)).rejects.toThrow(/already exists/);
  });
});
