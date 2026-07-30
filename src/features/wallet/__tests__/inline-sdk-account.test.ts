// @vitest-environment node
import {
  describe, expect, it, vi,
} from 'vitest';
import { createInlineSdkAccount } from '../inline-sdk-account';
import { createInMemoryVaultStore } from '../vault-store';
import { deriveSigner } from '../derivation';
import { createVault, type FactorEnrollment, type VaultRecord } from '../vault-record';
import { kekFromPassphrase, type Argon2idKdf } from '../factors';
import type { UnlockProvider } from '../inline-signer';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const GOLDEN0 = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

async function passphraseEnrollment(pass: string): Promise<FactorEnrollment> {
  const kdf: Argon2idKdf = {
    alg: 'argon2id', salt: b64(crypto.getRandomValues(new Uint8Array(16))), m: 256, t: 1, p: 1,
  };
  return {
    id: crypto.randomUUID(), type: 'passphrase', label: 'pw', createdAt: 0, kek: await kekFromPassphrase(pass, kdf), kdf,
  };
}

/** a passphrase-based UnlockProvider (stands in for the passphrase-prompt UI). */
function passphraseUnlock(pass: string): UnlockProvider {
  return async (record: VaultRecord) => {
    const factor = record.factors[0];
    return { factorId: factor.id, kek: await kekFromPassphrase(pass, factor.kdf as Argon2idKdf) };
  };
}

async function seededStore(pass = 'pw') {
  const record = await createVault(MNEMONIC, await passphraseEnrollment(pass), 1);
  return createInMemoryVaultStore(record);
}

describe('createInlineSdkAccount (SDK adapter)', () => {
  it('exposes the delegated-account surface (address + sign methods)', async () => {
    const acc = createInlineSdkAccount({
      address: GOLDEN0, index: 0, store: await seededStore(), unlock: passphraseUnlock('pw'),
    });
    expect(acc.address).toBe(GOLDEN0);
    expect(typeof acc.signTransaction).toBe('function');
    expect(typeof acc.signMessage).toBe('function');
  });

  it('loads the vault from the store and signs with the correct key', async () => {
    const acc = createInlineSdkAccount({
      address: GOLDEN0, index: 0, store: await seededStore(), unlock: passphraseUnlock('pw'),
    });
    const msg = 'sign via the sdk adapter';
    const viaAdapter = await acc.signMessage(msg);
    const viaDirect = await deriveSigner(MNEMONIC, 0).signMessage(msg);
    // ed25519 signatures are deterministic → identical iff the same private key was used
    expect(Array.from(viaAdapter)).toEqual(Array.from(viaDirect));
  });

  it('runs USER VERIFICATION on every signature (delegates the no-cache guarantee)', async () => {
    const unlock = vi.fn(passphraseUnlock('pw'));
    const acc = createInlineSdkAccount({
      address: GOLDEN0, index: 0, store: await seededStore(), unlock,
    });
    await acc.signMessage('a');
    await acc.signMessage('b');
    expect(unlock).toHaveBeenCalledTimes(2); // UV per signature, never cached
  });

  it('reloads the vault from the store on every signature (fresh, not cached)', async () => {
    const store = await seededStore();
    const load = vi.spyOn(store, 'load');
    const acc = createInlineSdkAccount({
      address: GOLDEN0, index: 0, store, unlock: passphraseUnlock('pw'),
    });
    await acc.signMessage('a');
    await acc.signMessage('b');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when no vault exists on the device', async () => {
    const acc = createInlineSdkAccount({
      address: GOLDEN0, index: 0, store: createInMemoryVaultStore(null), unlock: passphraseUnlock('pw'),
    });
    await expect(acc.signMessage('x')).rejects.toThrow(/no vault/i);
  });

  it('rejects (never signs) when the passphrase is wrong', async () => {
    const acc = createInlineSdkAccount({
      address: GOLDEN0, index: 0, store: await seededStore('right'), unlock: passphraseUnlock('wrong'),
    });
    await expect(acc.signMessage('x')).rejects.toThrow();
  });
});
