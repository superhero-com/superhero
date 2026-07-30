// @vitest-environment node
//
// Covers the funds-critical PRF-result gate + capability logic with injected
// extension results. The live navigator.credentials ceremony is device-gated
// (the wallet build plan §7.6) and not exercised here.
import {
  describe, expect, it,
} from 'vitest';
import {
  extractPrfOutput, isPrfEnabled, PRF_UNSUPPORTED,
} from '../webauthn';
import {
  kekFromHighEntropy, wrapDek, unwrapDek, type HkdfKdf,
} from '../factors';
import { generateDek, seal, unseal } from '../vault';

const prfResults = (first: ArrayBuffer | undefined, enabled = true) => ({ prf: { enabled, results: { first } } });

describe('WebAuthn PRF result gate (the only accepted proof)', () => {
  it('extracts a >=32-byte PRF output when results.first is present', () => {
    const out = extractPrfOutput(prfResults(new Uint8Array(32).fill(7).buffer));
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(32);
  });

  it('THROWS on prf.enabled===true but NO results.first (CTAP2.1 no-result case)', () => {
    expect(() => extractPrfOutput(prfResults(undefined, true))).toThrow(PRF_UNSUPPORTED);
  });

  it('THROWS on an empty (0-byte) result', () => {
    expect(() => extractPrfOutput(prfResults(new Uint8Array(0).buffer))).toThrow(PRF_UNSUPPORTED);
  });

  it('THROWS on a too-short (<32B) result — never accept a weak PRF secret', () => {
    expect(() => extractPrfOutput(prfResults(new Uint8Array(16).buffer))).toThrow(PRF_UNSUPPORTED);
  });

  it('THROWS when there is no prf field at all (unsupported)', () => {
    expect(() => extractPrfOutput({})).toThrow(PRF_UNSUPPORTED);
  });

  it('isPrfEnabled reflects the enabled flag', () => {
    expect(isPrfEnabled(prfResults(undefined, true))).toBe(true);
    expect(isPrfEnabled(prfResults(undefined, false))).toBe(false);
    expect(isPrfEnabled({})).toBe(false);
  });

  it('end-to-end: a PRF output (injected) wraps + unwraps the DEK like any high-entropy factor', async () => {
    const dek = await generateDek();
    const mnemonic = 'test mnemonic string';
    const sealed = await seal(mnemonic, dek);

    // simulate the ceremony returning a stable 32-byte PRF output
    const prfOutput = extractPrfOutput(prfResults(crypto.getRandomValues(new Uint8Array(32)).buffer));
    const kdf: HkdfKdf = {
      alg: 'hkdf-sha256', salt: btoa('0123456789abcdef0123456789abcdef'), info: 'webauthn-prf',
    };
    const id = crypto.randomUUID();
    const wrap = await wrapDek(dek, await kekFromHighEntropy(prfOutput, kdf), id, 'webauthn-prf');

    // unlock: same PRF output → same KEK → unwrap → unseal
    const dek2 = await unwrapDek({
      id, type: 'webauthn-prf', label: 'device', createdAt: 0, kdf, wrap,
    }, await kekFromHighEntropy(prfOutput, kdf));
    expect(await unseal(sealed, dek2)).toBe(mnemonic);
  });
});
