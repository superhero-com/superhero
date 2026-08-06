// @vitest-environment node
import {
  describe, expect, it,
} from 'vitest';
import {
  formatRecoveryCode, generateRecoveryCode, parseRecoveryCode,
} from '../recovery';
import { createInMemoryVaultStore } from '../vault-store';
import { createVault, unlockVault, type FactorEnrollment } from '../vault-record';
import { kekFromPassphrase, type Argon2idKdf } from '../factors';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

// cheap-but-valid argon2id params (>=8-byte salt); real params use DEFAULT_ARGON2ID
async function passphraseEnrollment(pass: string): Promise<FactorEnrollment> {
  const kdf: Argon2idKdf = {
    alg: 'argon2id', salt: b64(crypto.getRandomValues(new Uint8Array(16))), m: 256, t: 1, p: 1,
  };
  return {
    id: crypto.randomUUID(),
    type: 'passphrase',
    label: 'pw',
    createdAt: 0,
    kdf,
    kek: await kekFromPassphrase(pass, kdf),
  };
}

describe('recovery code', () => {
  it('generate → format → parse round-trips to the same bytes', () => {
    const { code, bytes } = generateRecoveryCode();
    expect(bytes.length).toBe(16); // 128-bit
    expect(code).toMatch(/^([0-9A-F]{4}-){7}[0-9A-F]{4}$/);
    expect(Array.from(parseRecoveryCode(code))).toEqual(Array.from(bytes));
  });

  it('parse tolerates lowercase, spaces and missing dashes', () => {
    const bytes = new Uint8Array(16).fill(0xab);
    const messy = formatRecoveryCode(bytes).toLowerCase().replace(/-/g, ' ');
    expect(Array.from(parseRecoveryCode(messy))).toEqual(Array.from(bytes));
  });

  it('parse rejects a wrong-length code', () => {
    expect(() => parseRecoveryCode('ABCD-1234')).toThrow(/128 bits/);
  });
});

describe('in-memory vault store', () => {
  it('save → load → clear', async () => {
    const store = createInMemoryVaultStore();
    expect(await store.load()).toBeNull();

    const record = await createVault(MNEMONIC, await passphraseEnrollment('pw'), 1);
    await store.save(record);
    expect(await store.load()).toEqual(record);

    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it('a VaultRecord survives JSON round-trip and still unlocks (stored form is complete)', async () => {
    const e = await passphraseEnrollment('pw');
    const record = await createVault(MNEMONIC, e, 1);

    // structured-clone / persistence surrogate
    const revived = JSON.parse(JSON.stringify(record)) as typeof record;
    const kek = await kekFromPassphrase('pw', revived.factors[0].kdf as Argon2idKdf);
    const { mnemonic } = await unlockVault(revived, revived.factors[0].id, kek);
    expect(mnemonic).toBe(MNEMONIC);
  });
});
