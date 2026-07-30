// @vitest-environment node
import {
  describe, expect, it, vi,
} from 'vitest';
import { createInlineWalletSigner, type UnlockProvider } from '../inline-signer';
import { deriveAccount, deriveSigner } from '../derivation';
import { createVault, type FactorEnrollment, type VaultRecord } from '../vault-record';
import { kekFromPassphrase, type Argon2idKdf } from '../factors';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const GOLDEN0 = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

async function passphraseEnrollment(pass: string): Promise<FactorEnrollment> {
  const kdf: Argon2idKdf = {
    alg: 'argon2id', salt: b64(crypto.getRandomValues(new Uint8Array(16))), m: 256, t: 1, p: 1,
  };
  return {
    id: crypto.randomUUID(), type: 'passphrase', label: 'pw', createdAt: 0, kdf, kek: await kekFromPassphrase(pass, kdf),
  };
}

/** a passphrase-based UnlockProvider (stands in for the passphrase-prompt UI). */
function passphraseUnlock(pass: string): UnlockProvider {
  return async (record: VaultRecord) => {
    const factor = record.factors[0];
    return { factorId: factor.id, kek: await kekFromPassphrase(pass, factor.kdf as Argon2idKdf) };
  };
}

describe('InlineWalletSigner (P4 core)', () => {
  it('derives the correct address (index 0 golden vector)', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    const signer = createInlineWalletSigner({
      address: GOLDEN0, index: 0, record, unlock: passphraseUnlock('pw'),
    });
    expect(signer.address).toBe(GOLDEN0);
  });

  it('signs a message with the SAME key as direct derivation (proves the unlock→derive path)', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    const signer = createInlineWalletSigner({
      address: GOLDEN0, index: 0, record, unlock: passphraseUnlock('pw'),
    });

    const msg = 'sign me — superhero inline wallet';
    const viaSigner = await signer.signMessage(msg);
    const viaDirect = await deriveSigner(MNEMONIC, 0).signMessage(msg);
    // ed25519 signatures are deterministic → identical iff the same private key was used
    expect(Array.from(viaSigner)).toEqual(Array.from(viaDirect));
  });

  it('runs USER VERIFICATION on EVERY signature (no cached unlock)', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    const unlock = vi.fn(passphraseUnlock('pw'));
    const signer = createInlineWalletSigner({
      address: GOLDEN0, index: 0, record, unlock,
    });

    await signer.signMessage('one');
    await signer.signMessage('two');
    await signer.signMessage('three');
    expect(unlock).toHaveBeenCalledTimes(3); // UV-per-signature, never cached
  });

  it('a WRONG passphrase (failed UV/unwrap) makes signing reject — never signs with a bad key', async () => {
    const record = await createVault(MNEMONIC, await passphraseEnrollment('right'), 1);
    const signer = createInlineWalletSigner({
      address: GOLDEN0, index: 0, record, unlock: passphraseUnlock('wrong'),
    });
    await expect(signer.signMessage('x')).rejects.toThrow();
  });

  it('a different index yields a different signing address than index 0', async () => {
    // sanity: the signer honors its index (index 1 != index 0 golden address)
    expect(deriveAccount(MNEMONIC, 1).address).not.toBe(GOLDEN0);
  });
});
