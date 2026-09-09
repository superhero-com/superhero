// @vitest-environment node
//
// This is pure, environment-independent key derivation (ed25519 over raw bytes
// via tweetnacl). It is run in the `node` environment on purpose: under
// jsdom, the `buffer` polyfill's `Buffer` is not `instanceof` jsdom's realm
// `Uint8Array`, so tweetnacl's array-type check throws ("unexpected type, use
// Uint8Array"). That is a jsdom dual-realm test wart only — in the real
// browser Vite polyfills `Buffer` as a subclass of the page `Uint8Array`, and
// in node the identity holds natively (verified: these addresses reproduce in
// a plain node repl and match the SDK factory the extension/native wallet use).
import { describe, expect, it } from 'vitest';
import { deriveAccount } from '../derivation';

/**
 * FUNDS-CRITICAL CI GUARD — do not "fix" a failure here by editing the
 * expected addresses.
 *
 * These golden vectors were generated from the SDK's own
 * `AccountMnemonicFactory` — the identical factory the Superhero extension /
 * native wallet already use for `m/44'/457'/{index}'/0'/0'` (SLIP-0010
 * ed25519) derivation. If this test ever fails, the inline wallet's
 * derivation has diverged from every other Superhero wallet surface: a user
 * importing their existing mnemonic would be shown the WRONG address (an
 * apparently-empty wallet) — this is loss of access to funds, not a cosmetic
 * bug. A failure means something upstream changed (SDK version bump,
 * derivation path/curve, mnemonic normalization) and must be investigated,
 * never silenced by updating these constants.
 */
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

const GOLDEN_VECTORS: Record<number, string> = {
  0: 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka',
  1: 'ak_iV7sCUsuKZytEEBEsX9N2K37m26X132LegogrgJEWzzPVjmmS',
  2: 'ak_2D8fAoXC3dweJkpstEp89uXQby7i4RU6HeXyPNmyCjXLGH6pPz',
};

describe('deriveAccount — golden vectors (funds-critical, do not edit expected values)', () => {
  Object.entries(GOLDEN_VECTORS).forEach(([indexKey, expectedAddress]) => {
    const index = Number(indexKey);

    it(`derives the known Superhero-wallet address for index ${index}`, () => {
      expect(deriveAccount(TEST_MNEMONIC, index).address).toBe(expectedAddress);
    });
  });

  it('is deterministic — deriving the same mnemonic/index twice yields the same address', () => {
    const first = deriveAccount(TEST_MNEMONIC, 0);
    const second = deriveAccount(TEST_MNEMONIC, 0);

    expect(first.address).toBe(second.address);
    expect(first.address).toBe(GOLDEN_VECTORS[0]);
  });
});
