// @vitest-environment node
//
// Passphrase + recovery paths are node-testable end-to-end. The passkey factor
// (addPasskeyFactor/passkeyUnlockProvider) runs the WebAuthn ceremony and is
// device-gated — not exercised here.
import {
  describe, expect, it,
} from 'vitest';
import {
  addRecoveryCodeFactor, importWallet, passphraseUnlockProvider, recoveryUnlockProvider,
} from '../wallet-lifecycle';
import { createInMemoryVaultStore } from '../vault-store';
import { createVault, unlockVault, type FactorEnrollment } from '../vault-record';
import {
  DEFAULT_ARGON2ID, kekFromPassphrase, type Argon2idKdf,
} from '../factors';
import { createInlineWalletSigner } from '../inline-signer';
import { deriveSigner } from '../derivation';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const GOLDEN0 = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

describe('wallet lifecycle', () => {
  it('import → persist → unlock with the passphrase provider yields the mnemonic', async () => {
    const store = createInMemoryVaultStore();
    const record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });
    expect(await store.load()).toEqual(record);

    const { factorId, kek } = await passphraseUnlockProvider('pw')(record);
    const { mnemonic } = await unlockVault(record, factorId, kek);
    expect(mnemonic).toBe(MNEMONIC);
  });

  it('opens a vault enrolled under the OLD (pre-raise) Argon2id params', async () => {
    // A vault written before the KDF was raised carries its own (lower) params in
    // the envelope. Unlock must derive the KEK from those STORED params, never from
    // the current DEFAULT_ARGON2ID — otherwise raising the default would brick it.
    const old: Argon2idKdf = {
      alg: 'argon2id', salt: b64(crypto.getRandomValues(new Uint8Array(16))), m: 19456, t: 2, p: 1,
    };
    expect(old.m).toBeLessThan(DEFAULT_ARGON2ID.m); // guard: these really are lower than today's default
    const enrollment: FactorEnrollment = {
      id: crypto.randomUUID(),
      type: 'passphrase',
      label: 'Passphrase',
      createdAt: 1,
      kdf: old,
      kek: await kekFromPassphrase('pw', old),
    };
    const record = await createVault(MNEMONIC, enrollment, 1);

    const { factorId, kek } = await passphraseUnlockProvider('pw')(record);
    const { mnemonic } = await unlockVault(record, factorId, kek);
    expect(mnemonic).toBe(MNEMONIC);
  });

  it('refuses to import over an existing vault', async () => {
    const store = createInMemoryVaultStore();
    await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });
    await expect(importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw2', now: 2 }))
      .rejects.toThrow(/already exists/);
  });

  it('the imported wallet signs with the correct (golden-vector) key via the signer', async () => {
    const store = createInMemoryVaultStore();
    const record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });
    const signer = createInlineWalletSigner({
      address: GOLDEN0, index: 0, record, unlock: passphraseUnlockProvider('pw'),
    });
    expect(signer.address).toBe(GOLDEN0);
    const viaSigner = await signer.signMessage('hi');
    const viaDirect = await deriveSigner(MNEMONIC, 0).signMessage('hi');
    expect(Array.from(viaSigner)).toEqual(Array.from(viaDirect));
  });

  it('add a recovery code, then unlock with it (independent recovery path)', async () => {
    const store = createInMemoryVaultStore();
    let record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });

    // must be unlocked to enroll a factor
    const pp = await passphraseUnlockProvider('pw')(record);
    const { dek } = await unlockVault(record, pp.factorId, pp.kek);
    const added = await addRecoveryCodeFactor(store, record, dek, 2);
    record = added.record;
    expect(record.factors).toHaveLength(2);
    expect(added.code).toMatch(/^([0-9A-F]{4}-){7}[0-9A-F]{4}$/);
    expect(await store.load()).toEqual(record);

    // unlock via the recovery code alone
    const rc = await recoveryUnlockProvider(added.code)(record);
    const { mnemonic } = await unlockVault(record, rc.factorId, rc.kek);
    expect(mnemonic).toBe(MNEMONIC);
  });

  it('recoveryUnlockProvider rejects a malformed code up front (before signing)', () => {
    expect(() => recoveryUnlockProvider('too-short')).toThrow(/128 bits/);
  });

  it('rejects a wrong passphrase in the provider, not later in the signer', async () => {
    const store = createInMemoryVaultStore();
    const record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });

    await expect(passphraseUnlockProvider('not-pw')(record)).rejects.toThrow(/passphrase is not right/i);
  });

  // A wrong secret and a tampered record both fail at `unwrapDek`, and only one of
  // them is the user's fault. Collapsing the two would have the victim of an
  // altered vault retyping a passphrase that was right all along.
  it('reports a tampered wrap as tampering, not as a mistyped passphrase', async () => {
    const store = createInMemoryVaultStore();
    const record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });
    const tampered = {
      ...record,
      factors: record.factors.map((f) => ({ ...f, wrap: { ...f.wrap, aad: 'wrap:elsewhere:passphrase' } })),
    };

    await expect(passphraseUnlockProvider('pw')(tampered)).rejects.toThrow(/AAD does not bind/);
  });

  it('rejects a well-formed but wrong recovery code in the provider', async () => {
    const store = createInMemoryVaultStore();
    const record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });
    const pp = await passphraseUnlockProvider('pw')(record);
    const { dek } = await unlockVault(record, pp.factorId, pp.kek);
    const { record: withCode } = await addRecoveryCodeFactor(store, record, dek, 2);

    // Right shape, wrong code — the length check passes, so only the unwrap catches it.
    const wrong = 'DEAD-BEEF-DEAD-BEEF-DEAD-BEEF-DEAD-BEEF';
    await expect(recoveryUnlockProvider(wrong)(withCode))
      .rejects.toThrow(/recovery code is not right/i);
  });
});
