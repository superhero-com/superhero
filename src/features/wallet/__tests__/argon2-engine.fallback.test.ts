// @vitest-environment node
//
// AC2 (ZIX-1408) — when WASM cannot instantiate (CSP, WASM disabled by policy, an
// exotic browser), the engine must fall back to pure-JS @noble/hashes and derive
// the SAME bytes, so unlock succeeds slowly rather than failing closed. This is
// only safe because AC1 proves the two engines agree; this file proves the
// fallback actually fires and stays byte-identical.
import {
  describe, expect, it, vi,
} from 'vitest';
import { argon2id as nobleArgon2id } from '@noble/hashes/argon2';

// Simulate WASM instantiation failure: hash-wasm's argon2id rejects, exactly as it
// would when WebAssembly.instantiate is blocked. The mock applies to the dynamic
// import() inside the engine too.
vi.mock('hash-wasm', () => ({
  argon2id: () => Promise.reject(new Error('WebAssembly.instantiate blocked (simulated CSP)')),
}));

const hex = (u: Uint8Array) => Buffer.from(u).toString('hex');
const fill = (n: number, v: number) => new Uint8Array(n).fill(v);
const utf8 = (s: string) => new TextEncoder().encode(s);

describe('Argon2id engine: pure-JS fallback when WASM is unavailable (AC2)', () => {
  it('argon2idRaw falls back to @noble and returns byte-identical bytes', async () => {
    const { argon2idRaw, ARGON2_VERSION } = await import('../argon2-engine');
    const password = utf8('correct horse battery staple');
    const salt = fill(16, 0x07);
    const params = {
      m: 512, t: 2, p: 1, dkLen: 32,
    };

    const viaEngine = await argon2idRaw(password, salt, params);
    const viaNoble = nobleArgon2id(password, salt, { ...params, version: ARGON2_VERSION });
    expect(hex(viaEngine)).toBe(hex(viaNoble));
  });

  it('argon2idViaWasm surfaces the failure (so the engine can catch and fall back)', async () => {
    const { argon2idViaWasm } = await import('../argon2-engine');
    await expect(argon2idViaWasm(fill(8, 1), fill(8, 2), {
      m: 256, t: 1, p: 1, dkLen: 32,
    })).rejects.toThrow();
  });

  it('prewarmArgon2Engine reports WASM unusable without throwing', async () => {
    const { prewarmArgon2Engine } = await import('../argon2-engine');
    await expect(prewarmArgon2Engine()).resolves.toBe(false);
  });

  it('kekFromPassphrase still unlocks a DEK under WASM failure (end-to-end fallback)', async () => {
    const { kekFromPassphrase } = await import('../factors');
    const { generateDek, seal, unseal } = await import('../vault');
    const { wrapDek, unwrapDek } = await import('../factors');
    const kdf = {
      alg: 'argon2id' as const, salt: fill(16, 0x21) && Buffer.from(fill(16, 0x21)).toString('base64'), m: 512, t: 2, p: 1,
    };

    const dek = await generateDek();
    const sealed = await seal('abandon abandon about', dek);
    const kek = await kekFromPassphrase('pw', kdf);
    const id = crypto.randomUUID();
    const wrap = await wrapDek(dek, kek, id, 'passphrase');
    const factor = {
      id, type: 'passphrase' as const, label: 'p', createdAt: 0, kdf, wrap,
    };

    const dek2 = await unwrapDek(factor, await kekFromPassphrase('pw', kdf));
    expect(await unseal(sealed, dek2)).toBe('abandon abandon about');
  });
});
