// @vitest-environment node
//
// AC1 (ZIX-1408) — hash-wasm Argon2id must be BYTE-IDENTICAL to @noble/hashes for
// the same (password, salt, m, t, p, outputLen), with argon2 version 0x13 pinned
// and asserted on both sides. One byte of disagreement and the swap is off.
//
// Node env: full WebAssembly + a real 64 MiB allocation for the production-param run.
import { describe, expect, it } from 'vitest';
import { argon2id as nobleArgon2id } from '@noble/hashes/argon2';
import { argon2id as wasmArgon2id } from 'hash-wasm';
import {
  ARGON2_VERSION, argon2idRaw, argon2idViaNoble, argon2idViaWasm,
} from '../argon2-engine';
import { DEFAULT_ARGON2ID } from '../factors';

const hex = (u: Uint8Array) => Buffer.from(u).toString('hex');
const fill = (n: number, v: number) => new Uint8Array(n).fill(v);
const utf8 = (s: string) => new TextEncoder().encode(s);

describe('Argon2id engine: hash-wasm ≡ @noble/hashes, both pinned to v0x13 (AC1)', () => {
  it('the engine pins argon2 version 0x13 (RFC 9106)', () => {
    expect(ARGON2_VERSION).toBe(0x13);
  });

  it('@noble reproduces the RFC 9106 §5.3 argon2id test vector — anchors both engines to a correct v0x13', () => {
    // RFC 9106 §5.3: P=32×01, S=16×02, K(secret)=8×03, X(assoc-data)=12×04, t=3, m=32, p=4, out=32.
    const tag = nobleArgon2id(fill(32, 0x01), fill(16, 0x02), {
      t: 3,
      m: 32,
      p: 4,
      dkLen: 32,
      version: ARGON2_VERSION,
      key: fill(8, 0x03),
      personalization: fill(12, 0x04),
    });
    expect(hex(tag)).toBe('0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659');
  });

  it('hash-wasm emits v=19 (0x13) in its encoded PHC string — the explicit version pin on the WASM side', async () => {
    const enc = await wasmArgon2id({
      password: utf8('pin-check'),
      salt: fill(16, 0x09),
      iterations: 1,
      parallelism: 1,
      memorySize: 256,
      hashLength: 32,
      outputType: 'encoded',
    });
    expect(enc).toContain('$argon2id$v=19$');
  });

  // Differential over several passphrase/salt pairs at cheap params (fast in CI).
  const cases = [
    {
      name: 'ascii passphrase', pw: 'correct horse battery staple', salt: fill(16, 0x07), m: 256, t: 1, p: 1, dkLen: 32,
    },
    {
      name: 'short passphrase', pw: 'a', salt: fill(16, 0x00), m: 512, t: 2, p: 1, dkLen: 32,
    },
    {
      name: 'unicode passphrase', pw: 'pÀsswörd–🔐–münchen', salt: fill(16, 0xa5), m: 1024, t: 3, p: 1, dkLen: 32,
    },
    {
      name: 'longer dkLen', pw: 'another-high-entropy-secret', salt: fill(16, 0x3c), m: 512, t: 2, p: 1, dkLen: 64,
    },
    {
      name: 'parallelism 2', pw: 'parallel-lanes', salt: fill(16, 0x11), m: 1024, t: 2, p: 2, dkLen: 32,
    },
  ];

  it.each(cases)('byte-identical wasm vs @noble AND via the engine: $name', async ({
    pw, salt, m, t, p, dkLen,
  }) => {
    const password = utf8(pw);
    const noble = nobleArgon2id(password, salt, {
      m, t, p, dkLen, version: ARGON2_VERSION,
    });
    const wasm = await wasmArgon2id({
      password, salt, iterations: t, parallelism: p, memorySize: m, hashLength: dkLen, outputType: 'binary',
    });
    expect(hex(wasm)).toBe(hex(noble)); // the two engines agree, byte for byte

    // and the engine's own paths agree with the reference
    expect(hex(argon2idViaNoble(password, salt, {
      m, t, p, dkLen,
    }))).toBe(hex(noble));
    expect(hex(await argon2idViaWasm(password, salt, {
      m, t, p, dkLen,
    }))).toBe(hex(noble));
    expect(hex(await argon2idRaw(password, salt, {
      m, t, p, dkLen,
    }))).toBe(hex(noble));
  });

  it('divergence: hash-wasm rejects an empty password, but argon2idRaw still derives noble-identical bytes via fallback', async () => {
    // hash-wasm enforces a non-empty password as a precondition (argon2 API guard);
    // @noble does not. Production passphrases are entropy-gated so this input never
    // occurs, and the engine's fallback covers it correctly rather than failing.
    const salt = fill(16, 0x55);
    const params = {
      m: 256, t: 1, p: 1, dkLen: 32,
    };
    await expect(argon2idViaWasm(utf8(''), salt, params)).rejects.toThrow(/Password must be specified/);
    const viaRaw = await argon2idRaw(utf8(''), salt, params);
    const viaNoble = argon2idViaNoble(utf8(''), salt, params);
    expect(hex(viaRaw)).toBe(hex(viaNoble));
  });

  it('byte-identical at the REAL production parameters (64 MiB / t=3 / p=1)', async () => {
    const password = utf8('a-genuinely-high-entropy-passphrase-9f3b2c1a');
    const salt = fill(16, 0x2a);
    const params = {
      m: DEFAULT_ARGON2ID.m, t: DEFAULT_ARGON2ID.t, p: DEFAULT_ARGON2ID.p, dkLen: 32,
    };
    expect(DEFAULT_ARGON2ID.m).toBe(65536); // 64 MiB — unchanged by this swap
    const noble = argon2idViaNoble(password, salt, params);
    const wasm = await argon2idViaWasm(password, salt, params);
    expect(hex(wasm)).toBe(hex(noble));
    expect(hex(await argon2idRaw(password, salt, params))).toBe(hex(noble));
  }, 30000);
});
