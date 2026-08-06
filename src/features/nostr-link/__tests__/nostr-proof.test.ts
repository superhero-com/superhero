// @vitest-environment node
//
// nostr-tools finalizeEvent / verifyEvent over @noble — environment-independent.
import { describe, expect, it } from 'vitest';
import { verifyEvent } from 'nostr-tools/pure';
import { mnemonicToSeedSync } from '@scure/bip39';
import { deriveKeysFromSeed } from '@/features/chat/nostr/crypto';
import { createDerivedNostrIdentity } from '@/features/chat/identity/derived-identity';
import { createNostrProofEvent } from '../nostr-proof';

const SEED = mnemonicToSeedSync(
  'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about',
);

describe('createNostrProofEvent — kind-22242 ownership proof through the seam', () => {
  it('produces a fresh, valid event whose content is the claim message', async () => {
    const keys = deriveKeysFromSeed(SEED, 0);
    const identity = createDerivedNostrIdentity(keys);
    const message = 'link:ak_test:nostr:npub1abc:0';

    const json = await createNostrProofEvent(identity, message);
    const event = JSON.parse(json);

    expect(event.kind).toBe(22242);
    expect(event.content).toBe(message);
    expect(event.pubkey).toBe(keys.publicKey);
    expect(verifyEvent(event)).toBe(true);

    const now = Math.floor(Date.now() / 1000);
    expect(now - event.created_at).toBeLessThanOrEqual(5);
  });

  it('binds the proof to the signing identity, not an arbitrary pubkey', async () => {
    const mine = createDerivedNostrIdentity(deriveKeysFromSeed(SEED, 0));
    const other = deriveKeysFromSeed(SEED, 1);
    const event = JSON.parse(await createNostrProofEvent(mine, 'link:ak_test:nostr:x:0'));
    expect(event.pubkey).not.toBe(other.publicKey);
  });
});
