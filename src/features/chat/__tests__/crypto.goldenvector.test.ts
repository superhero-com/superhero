// @vitest-environment node
//
// Runs in the `node` environment: this is pure, environment-independent BIP-32
// secp256k1 derivation over standard libraries (@scure/bip39, @scure/bip32,
// nostr-tools), identical in node and the browser.
//
// IDENTITY-CRITICAL CI GUARD — do not "fix" a failure here by editing the
// expected npubs.
//
// These golden npubs were generated from the SAME standard derivation the
// Superhero MOBILE app performs in `superhero-app/src/features/chat/nostr/
// crypto.ts` (`mnemonicToSeedSync` → `HDKey` at `m/44'/1237'/0'/0/<idx>` →
// nostr-tools `getPublicKey`/`npubEncode`). They were cross-checked: the app's
// installed libs (nostr-tools 2.20, @scure/bip32 1.x) and the PWA's
// (nostr-tools 2.24, @scure/bip32 2.x) produce byte-identical npubs for this
// mnemonic. A failure means the PWA's nostr derivation has diverged from the
// app's — the SAME user would present a DIFFERENT npub on web vs mobile, so
// their DM history is unreachable on one surface. Investigate the cause (lib
// bump, path/curve, seed normalization); never silence it by updating these
// constants.
import { describe, expect, it } from 'vitest';
import { mnemonicToSeedSync } from '@scure/bip39';
import { deriveKeysFromSeed } from '../nostr/crypto';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

const GOLDEN_NPUB: Record<number, string> = {
  0: 'npub1az708q3kd9zy6z6f44zav5ygvdwelkzspf6mtusttx47lft2z38sghk0w7',
  1: 'npub1nnsfd3dfkn308y2zch3gl30d5unpqtk40tral3qzs7802v8edpcq9ugzp9',
  2: 'npub1h2avfv7h6wkat97x0udysvtqz8upkapp78ngzxqtrseyfyvxhxqq5scxp2',
};

const GOLDEN_PUBKEY: Record<number, string> = {
  0: 'e8bcf3823669444d0b49ad45d65088635d9fd8500a75b5f20b59abefa56a144f',
  1: '9ce096c5a9b4e2f39142c5e28fc5eda726102ed57ac7dfc402878ef530f96870',
  2: 'babac4b3d7d3add597c67f1a48316011f81b7421f1e681180b1c32449186b980',
};

describe('deriveKeysFromSeed — nostr npub parity with superhero-app (do not edit expected values)', () => {
  const seed = mnemonicToSeedSync(TEST_MNEMONIC);

  Object.entries(GOLDEN_NPUB).forEach(([indexKey, expectedNpub]) => {
    const index = Number(indexKey);

    it(`derives the known app npub for account index ${index}`, () => {
      const keys = deriveKeysFromSeed(seed, index);
      expect(keys.npub).toBe(expectedNpub);
      expect(keys.publicKey).toBe(GOLDEN_PUBKEY[index]);
    });
  });

  it('is deterministic and self-consistent (npub decodes to the hex pubkey)', () => {
    const first = deriveKeysFromSeed(seed, 0);
    const second = deriveKeysFromSeed(seed, 0);
    expect(first).toEqual(second);
    expect(first.npub).toBe(GOLDEN_NPUB[0]);
    expect(first.nsec.startsWith('nsec1')).toBe(true);
  });

  it('is a distinct key per account index', () => {
    const zero = deriveKeysFromSeed(seed, 0);
    const one = deriveKeysFromSeed(seed, 1);
    expect(zero.publicKey).not.toBe(one.publicKey);
    expect(zero.privateKey).not.toBe(one.privateKey);
  });
});
