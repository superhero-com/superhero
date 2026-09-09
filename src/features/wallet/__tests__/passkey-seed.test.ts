// @vitest-environment node
//
// Runs in the `node` environment for the same reason
// `derivation.goldenvector.test.ts` does: this file calls `deriveAccount`, and
// under jsdom the `buffer` polyfill's `Buffer` is not `instanceof` jsdom's realm
// `Uint8Array`, so tweetnacl's array-type check throws ("unexpected type, use
// Uint8Array"). A jsdom dual-realm wart only — the derivation itself is pure.
import { describe, expect, it } from 'vitest';
import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { mnemonicFromPrf, SEED_PRF_SALT_LABEL, seedPrfSalt } from '../passkey-seed';
import { deriveAccount } from '../derivation';

/**
 * The web wallet has no seed-phrase screen: the seed is derived from the
 * passkey's PRF output. That makes these properties funds-critical — if any of
 * them breaks, an existing passkey stops re-deriving the wallet it created, and
 * the user's funds are unreachable even though nothing was "lost".
 */

const prf = (fill: number, len = 32) => new Uint8Array(len).fill(fill);

describe('mnemonicFromPrf', () => {
  it('is deterministic — the same PRF output always yields the same phrase', () => {
    // This IS the recovery guarantee: re-running the ceremony on a new device
    // must reproduce the same wallet.
    expect(mnemonicFromPrf(prf(7))).toBe(mnemonicFromPrf(prf(7)));
  });

  it('produces a valid 12-word BIP39 phrase', () => {
    const m = mnemonicFromPrf(prf(7));

    expect(m.split(' ')).toHaveLength(12);
    // Checksum-valid, so it imports into the extension / native wallet as-is.
    expect(validateMnemonic(m, wordlist)).toBe(true);
  });

  it('gives different PRF outputs different wallets', () => {
    expect(mnemonicFromPrf(prf(1))).not.toBe(mnemonicFromPrf(prf(2)));
  });

  it('is sensitive to every byte of the PRF output', () => {
    const a = prf(0);
    const b = prf(0);
    b[31] = 1; // flip only the last byte

    expect(mnemonicFromPrf(a)).not.toBe(mnemonicFromPrf(b));
  });

  it('derives a usable aeternity account on the standard path', () => {
    // A passkey-created wallet must be a normal wallet: same derivation as any
    // imported phrase, so nothing is stranded in a proprietary scheme.
    const { address } = deriveAccount(mnemonicFromPrf(prf(9)), 0);

    expect(address).toMatch(/^ak_/);
  });

  it('rejects a PRF output too short to be 256-bit-class input', () => {
    // Fail closed rather than silently stretching weak input into a seed.
    expect(() => mnemonicFromPrf(prf(1, 31))).toThrow(/too short/i);
  });

  it('accepts a longer PRF output (some authenticators return more)', () => {
    expect(validateMnemonic(mnemonicFromPrf(prf(3, 64)), wordlist)).toBe(true);
  });

  it('does not use the PRF output as entropy verbatim', () => {
    // HKDF, not a raw copy. Compare against what the phrase WOULD be if the
    // first 16 PRF bytes were used as entropy directly — a real regression if
    // someone "simplifies" the derivation by dropping the HKDF step.
    const bytes = prf(0xab);
    const direct = entropyToMnemonic(bytes.slice(0, 16), wordlist);

    expect(mnemonicFromPrf(bytes)).not.toBe(direct);
  });
});

describe('seedPrfSalt', () => {
  it('is fixed and public — the passkey alone must be able to re-derive', () => {
    // A random per-enrollment salt would have to be persisted, and IndexedDB is
    // evictable (R-04): losing it would lose the ability to recover the seed.
    expect(seedPrfSalt()).toEqual(seedPrfSalt());
    expect(new TextDecoder().decode(seedPrfSalt())).toBe(SEED_PRF_SALT_LABEL);
  });

  it('pins the exact salt label', () => {
    // Changing this value strands every wallet ever created on the web path.
    // If this test fails, the change is wrong unless it also ships a v2 that
    // keeps deriving v1 wallets from v1 passkeys.
    expect(SEED_PRF_SALT_LABEL).toBe('superhero.com/wallet/seed/v1');
  });

  it('is domain-separated from the KEK derivation', () => {
    // The seed and the DEK-wrapping key both come from one PRF output; they must
    // not be computable from each other. factors.ts uses info 'webauthn-prf';
    // the seed uses its own. Pinned here so neither can drift into the other.
    expect(SEED_PRF_SALT_LABEL).not.toBe('webauthn-prf');
  });
});

describe('golden vector', () => {
  it('derives the pinned phrase and address for a known PRF output', () => {
    // Regression pin: locks the whole chain (HKDF params → entropy → BIP39 →
    // SLIP-0010). Any change to salt, info, or entropy length breaks this, which
    // is the point — such a change silently re-points existing users' wallets.
    const m = mnemonicFromPrf(new Uint8Array(32).fill(0x42));
    const { address } = deriveAccount(m, 0);

    expect({ m, address }).toMatchInlineSnapshot(`
      {
        "address": "ak_25rjWaU94VUebmSr6hauZNs6z6PSULFTYstvFMxH2w8PFC9VYT",
        "m": "garlic inspire match again celery collect bitter attend knock alert drill alert",
      }
    `);
  });
});
