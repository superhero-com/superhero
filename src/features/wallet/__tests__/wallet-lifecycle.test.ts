// @vitest-environment node
//
// Passphrase + recovery paths are node-testable end-to-end. The passkey factor
// (addPasskeyFactor/passkeyUnlockProvider) runs the WebAuthn ceremony and is
// device-gated (build-plan §7.6) — not exercised here.
import {
  describe, expect, it,
} from 'vitest';
import {
  addRecoveryCodeFactor, importWallet, passphraseUnlockProvider, recoveryUnlockProvider,
} from '../wallet-lifecycle';
import { createInMemoryVaultStore } from '../vault-store';
import { unlockVault } from '../vault-record';
import { createInlineWalletSigner } from '../inline-signer';
import { deriveSigner } from '../derivation';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const GOLDEN0 = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';

describe('wallet lifecycle', () => {
  it('import → persist → unlock with the passphrase provider yields the mnemonic', async () => {
    const store = createInMemoryVaultStore();
    const record = await importWallet(store, { mnemonic: MNEMONIC, passphrase: 'pw', now: 1 });
    expect(await store.load()).toEqual(record);

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
});
