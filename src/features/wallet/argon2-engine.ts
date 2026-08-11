/**
 * Argon2id derivation engine — WASM primary, pure-JS fallback (ZIX-1408).
 *
 * The KDF that turns a passphrase into a KEK (`kekFromPassphrase`) is memory-hard
 * by design: 64 MiB / t=3. Pure-JS Argon2id (`@noble/hashes`) holds that on
 * desktop but is ~10× too slow on low-end mobile (ZIX-329: p95 4.3–6.4s throttled).
 * `hash-wasm` does the identical work in WebAssembly at the same parameters, ~10×
 * faster, with no loss of memory-hardness.
 *
 * The two engines are byte-for-byte interchangeable — this is proven, not assumed,
 * by the RFC 9106 anchor + differential in `__tests__/argon2-engine.test.ts`, and
 * that proof is what makes the fallback safe: if WASM instantiation fails (CSP,
 * WASM disabled by policy, an exotic browser) we derive the SAME bytes with
 * `@noble/hashes`, slowly, rather than failing the unlock closed. A slow unlock of
 * the user's own money beats a dead one.
 *
 * `version` is pinned to 0x13 (RFC 9106) on BOTH sides. `@noble` takes it as an
 * explicit option; `hash-wasm` compiles it in (its encoded output reads `v=19`),
 * and the differential asserts the two agree — a v0x10/v0x13 split is exactly how
 * two correct implementations would silently disagree.
 *
 * `hash-wasm` is loaded via dynamic `import()` so its WASM payload lands in a
 * lazily-loaded wallet chunk, never the entry chunk every visitor downloads
 * (ZIX-1408 AC5′).
 */
import { argon2id as nobleArgon2id } from '@noble/hashes/argon2';

/** Argon2 version, RFC 9106. Pinned identically on both engines. */
export const ARGON2_VERSION = 0x13;

/** Which engine actually produced the bytes. */
export type Argon2Engine = 'wasm' | 'noble';

/**
 * A WASM→pure-JS fallback event. Carries ONLY the selected engine and the failing
 * error's constructor name — never the passphrase, salt, params, or derived bytes.
 * The `cause` is a type name (e.g. `CompileError`, `TypeError`), not a message, so
 * it cannot echo caller input.
 */
export interface Argon2FallbackEvent {
  engine: 'noble';
  cause: string;
}

type Argon2FallbackObserver = (event: Argon2FallbackEvent) => void;
let fallbackObserver: Argon2FallbackObserver | null = null;

/**
 * Register (or clear, with `null`) a single observer for WASM→pure-JS fallback —
 * a metric/telemetry hook so a fallback is never silent. The observer is invoked
 * with no secrets; see {@link Argon2FallbackEvent}. A throwing observer must not
 * break derivation, so its errors are swallowed.
 */
export function setArgon2FallbackObserver(observer: Argon2FallbackObserver | null): void {
  fallbackObserver = observer;
}

function reportFallback(err: unknown): void {
  const cause = err instanceof Error ? err.name : typeof err;
  // Always-on baseline signal, independent of any registered observer. Only the
  // error's type name is emitted — no passphrase, salt, or derived bytes.
  // eslint-disable-next-line no-console
  console.warn(`[wallet] Argon2id WASM unavailable — using pure-JS fallback (${cause})`);
  try {
    fallbackObserver?.({ engine: 'noble', cause });
  } catch {
    /* an observer must never break key derivation */
  }
}

export interface Argon2idRawParams {
  /** memory in KiB */
  m: number;
  /** iterations */
  t: number;
  /** parallelism */
  p: number;
  /** derived-key length in bytes */
  dkLen: number;
}

/** Pure-JS Argon2id (`@noble/hashes`). Always available; the fallback and the reference. */
export function argon2idViaNoble(
  password: Uint8Array,
  salt: Uint8Array,
  params: Argon2idRawParams,
): Uint8Array {
  return nobleArgon2id(password, salt, {
    m: params.m, t: params.t, p: params.p, dkLen: params.dkLen, version: ARGON2_VERSION,
  });
}

type HashWasm = typeof import('hash-wasm');
let wasmModule: Promise<HashWasm> | null = null;
function loadWasm(): Promise<HashWasm> {
  if (!wasmModule) wasmModule = import('hash-wasm');
  return wasmModule;
}

/** WebAssembly Argon2id (`hash-wasm`). Throws if the module cannot instantiate. */
export async function argon2idViaWasm(
  password: Uint8Array,
  salt: Uint8Array,
  params: Argon2idRawParams,
): Promise<Uint8Array> {
  const { argon2id } = await loadWasm();
  return argon2id({
    password,
    salt,
    iterations: params.t,
    parallelism: params.p,
    memorySize: params.m,
    hashLength: params.dkLen,
    outputType: 'binary',
  });
}

/**
 * Derive raw Argon2id bytes, WASM-first with a pure-JS fallback, reporting which
 * engine ran. The fallback is byte-identical (proven by the differential), so a
 * WASM failure degrades to a slow unlock, never a wrong or failed one — but it is
 * NOT silent: it emits a baseline console signal and notifies any registered
 * observer (see {@link setArgon2FallbackObserver}).
 */
export async function argon2idRawWithEngine(
  password: Uint8Array,
  salt: Uint8Array,
  params: Argon2idRawParams,
): Promise<{ bytes: Uint8Array; engine: Argon2Engine }> {
  try {
    return { bytes: await argon2idViaWasm(password, salt, params), engine: 'wasm' };
  } catch (err) {
    reportFallback(err);
    return { bytes: argon2idViaNoble(password, salt, params), engine: 'noble' };
  }
}

/** As {@link argon2idRawWithEngine}, returning only the bytes for callers that derive a KEK. */
export async function argon2idRaw(
  password: Uint8Array,
  salt: Uint8Array,
  params: Argon2idRawParams,
): Promise<Uint8Array> {
  return (await argon2idRawWithEngine(password, salt, params)).bytes;
}

/**
 * Warm the WASM module (fetch, compile, instantiate) off the unlock path — call
 * at wallet-route entry so the user's first unlock pays steady-state cost, not
 * cold-start. Swallows failure: a CSP/policy-blocked environment simply falls
 * back to pure-JS at unlock time. Returns true iff WASM is usable.
 */
export async function prewarmArgon2Engine(): Promise<boolean> {
  try {
    await argon2idViaWasm(new Uint8Array(8), new Uint8Array(8), {
      m: 256, t: 1, p: 1, dkLen: 32,
    });
    return true;
  } catch (err) {
    // Surface the WASM-unusable state at route entry — the earliest observable
    // point — so the coming unlock's fallback is expected, not a mystery slowdown.
    reportFallback(err);
    return false;
  }
}
