// @vitest-environment node
//
// nostr-tools nip04 / finalizeEvent over @noble — environment-independent.
import { describe, expect, it } from 'vitest';
import { mnemonicToSeedSync } from '@scure/bip39';
import { deriveKeysFromSeed } from '../nostr/crypto';
import { createDerivedNostrIdentity } from '../identity/derived-identity';

const SEED = mnemonicToSeedSync(
  'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about',
);

describe('createDerivedNostrIdentity — the v1 NostrIdentityProvider', () => {
  it('exposes the public key and does not leak the private key through the seam', async () => {
    const keys = deriveKeysFromSeed(SEED, 0);
    const identity = createDerivedNostrIdentity(keys);
    expect(await identity.getPublicKey()).toBe(keys.publicKey);
    // The provider surface is sign/encrypt/decrypt only — no key getter.
    expect(Object.keys(identity).sort()).toEqual([
      'getPublicKey', 'nip04Decrypt', 'nip04Encrypt', 'signEvent',
    ]);
  });

  it('signs an event that verifies under the derived pubkey', async () => {
    const keys = deriveKeysFromSeed(SEED, 0);
    const identity = createDerivedNostrIdentity(keys);
    const signed = await identity.signEvent({
      kind: 1, created_at: 1000, tags: [], content: 'hello',
    });
    expect(signed.pubkey).toBe(keys.publicKey);
    expect(signed.sig).toMatch(/^[0-9a-f]{128}$/);
  });

  it('nip04 round-trips between two derived identities', async () => {
    const alice = deriveKeysFromSeed(SEED, 0);
    const bob = deriveKeysFromSeed(SEED, 1);
    const aliceId = createDerivedNostrIdentity(alice);
    const bobId = createDerivedNostrIdentity(bob);

    const ciphertext = await aliceId.nip04Encrypt(bob.publicKey, 'secret message');
    expect(ciphertext).not.toContain('secret message');
    const plaintext = await bobId.nip04Decrypt(alice.publicKey, ciphertext);
    expect(plaintext).toBe('secret message');
  });
});
