// @vitest-environment node
//
// WebCrypto wrapKey/unwrapKey + @noble argon2id/hkdf — node env (full SubtleCrypto).
import {
  describe, expect, it,
} from 'vitest';
import { generateDek, seal, unseal } from '../vault';
import {
  DEFAULT_ARGON2ID,
  kekFromHighEntropy,
  kekFromPassphrase,
  unwrapDek,
  wrapDek,
  type Argon2idKdf,
  type HkdfKdf,
  type WrappedFactor,
} from '../factors';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const salt16 = () => b64(crypto.getRandomValues(new Uint8Array(16)));
const salt32 = () => b64(crypto.getRandomValues(new Uint8Array(32)));

// keep Argon2id cheap in tests (real params come from DEFAULT_ARGON2ID)
const fastArgon = (salt: string): Argon2idKdf => ({
  alg: 'argon2id', salt, m: 256, t: 1, p: 1,
});

async function makeFactor(
  dek: CryptoKey,
  type: WrappedFactor['type'],
  kek: CryptoKey,
  kdf: WrappedFactor['kdf'],
): Promise<WrappedFactor> {
  const id = crypto.randomUUID();
  return {
    id, type, label: type, createdAt: 0, kdf, wrap: await wrapDek(dek, kek, id, type),
  };
}

describe('factor → KEK layer (wrap/unwrap the DEK)', () => {
  it('passphrase factor: wrap then unwrap yields a DEK that still unseals the mnemonic', async () => {
    const dek = await generateDek();
    const sealed = await seal(MNEMONIC, dek);

    const kdf = fastArgon(salt16());
    const kek = await kekFromPassphrase('correct horse battery staple', kdf);
    const factor = await makeFactor(dek, 'passphrase', kek, kdf);

    // unlock from scratch: re-derive KEK from the passphrase, unwrap DEK, unseal
    const kek2 = await kekFromPassphrase('correct horse battery staple', kdf);
    const dek2 = await unwrapDek(factor, kek2);
    expect(await unseal(sealed, dek2)).toBe(MNEMONIC);
  });

  it('WRONG passphrase cannot unwrap the DEK (fails closed)', async () => {
    const dek = await generateDek();
    const kdf = fastArgon(salt16());
    const factor = await makeFactor(dek, 'passphrase', await kekFromPassphrase('right-pass', kdf), kdf);
    const wrongKek = await kekFromPassphrase('wrong-pass', kdf);
    await expect(unwrapDek(factor, wrongKek)).rejects.toThrow();
  });

  it('recovery-code factor (HKDF over 128-bit code) round-trips', async () => {
    const dek = await generateDek();
    const sealed = await seal(MNEMONIC, dek);
    const code = crypto.getRandomValues(new Uint8Array(16)); // 128-bit high-entropy
    const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: salt32(), info: 'recovery-code' };
    const factor = await makeFactor(dek, 'recovery-code', await kekFromHighEntropy(code, kdf), kdf);

    const dek2 = await unwrapDek(factor, await kekFromHighEntropy(code, kdf));
    expect(await unseal(sealed, dek2)).toBe(MNEMONIC);
  });

  it('OR-set: two factors wrap the SAME dek; either unlocks it', async () => {
    const dek = await generateDek();
    const sealed = await seal(MNEMONIC, dek);

    const passKdf = fastArgon(salt16());
    const passFactor = await makeFactor(dek, 'passphrase', await kekFromPassphrase('pw', passKdf), passKdf);

    const code = crypto.getRandomValues(new Uint8Array(16));
    const recKdf: HkdfKdf = { alg: 'hkdf-sha256', salt: salt32(), info: 'recovery-code' };
    const recFactor = await makeFactor(dek, 'recovery-code', await kekFromHighEntropy(code, recKdf), recKdf);

    const viaPass = await unwrapDek(passFactor, await kekFromPassphrase('pw', passKdf));
    const viaCode = await unwrapDek(recFactor, await kekFromHighEntropy(code, recKdf));
    expect(await unseal(sealed, viaPass)).toBe(MNEMONIC);
    expect(await unseal(sealed, viaCode)).toBe(MNEMONIC);
  });

  it('a blob cannot be unwrapped under a DIFFERENT factor id (AAD binding holds)', async () => {
    const dek = await generateDek();
    const kdf = fastArgon(salt16());
    const kek = await kekFromPassphrase('pw', kdf);
    const factor = await makeFactor(dek, 'passphrase', kek, kdf);
    // same KEK, but pretend the blob belongs to another factor id → AAD mismatch
    const forged: WrappedFactor = { ...factor, id: crypto.randomUUID() };
    await expect(unwrapDek(forged, kek)).rejects.toThrow();
  });

  it('DEFAULT_ARGON2ID meets the OWASP argon2id minimum (m>=19456, t>=2)', () => {
    expect(DEFAULT_ARGON2ID.m).toBeGreaterThanOrEqual(19456);
    expect(DEFAULT_ARGON2ID.t).toBeGreaterThanOrEqual(2);
  });
});
