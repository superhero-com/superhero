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

  it('argon2idRawWithEngine names the engine as noble on fallback (return variant is observable)', async () => {
    const { argon2idRawWithEngine } = await import('../argon2-engine');
    const { bytes, engine } = await argon2idRawWithEngine(utf8('pw'), fill(16, 0x07), {
      m: 512, t: 2, p: 1, dkLen: 32,
    });
    expect(engine).toBe('noble');
    expect(bytes).toHaveLength(32);
  });

  it('a registered observer is notified on fallback — with no secret material', async () => {
    const { argon2idRaw, setArgon2FallbackObserver } = await import('../argon2-engine');
    const events: unknown[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setArgon2FallbackObserver((e) => events.push(e));
    try {
      const password = utf8('super secret passphrase');
      const salt = fill(16, 0x07);
      await argon2idRaw(password, salt, {
        m: 512, t: 2, p: 1, dkLen: 32,
      });

      expect(events).toEqual([{ engine: 'noble', cause: 'Error' }]);
      // The reported cause is a type name only, never caller input.
      const serialized = JSON.stringify(events);
      expect(serialized).not.toContain('super secret passphrase');
      expect(serialized).not.toContain(hex(salt));
      // Baseline console signal fired too — a fallback is never fully silent.
      expect(warn).toHaveBeenCalled();
    } finally {
      setArgon2FallbackObserver(null);
      warn.mockRestore();
    }
  });

  it('a throwing observer cannot break derivation', async () => {
    const { argon2idRaw, setArgon2FallbackObserver } = await import('../argon2-engine');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setArgon2FallbackObserver(() => { throw new Error('observer blew up'); });
    try {
      const out = await argon2idRaw(utf8('pw'), fill(16, 0x07), {
        m: 512, t: 2, p: 1, dkLen: 32,
      });
      expect(out).toHaveLength(32);
    } finally {
      setArgon2FallbackObserver(null);
      warn.mockRestore();
    }
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
