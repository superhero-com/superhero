/**
 * Live round-trip against the real Superhero API. GATED — it hits the network
 * and relays an on-chain testnet link tx, so it is skipped in the normal gate
 * and CI. Run it explicitly for proof:
 *
 *   NOSTR_LINK_E2E=1 VITE_NETWORK=ae_uat \
 *     npx vitest run src/features/nostr-link/__tests__/link-roundtrip.e2e.test.ts
 *
 * It derives a FRESH throwaway seed each run (so nonce/replay never collide),
 * derives the AE account + nostr identity from it, and links them.
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

import { OpenAPI } from '@/api/generated';
import { deriveSigner, deriveAccount } from '@/features/wallet/derivation';
import { deriveKeysFromSeed } from '@/features/chat/nostr/crypto';
import { createDerivedNostrIdentity } from '@/features/chat/identity/derived-identity';
import { linkNostrIdentity, fetchNostrLink } from '../link-flow';

const TESTNET_API = 'https://testnet.api.dev.tokensale.org';

describe.skipIf(!process.env.NOSTR_LINK_E2E)('AE↔Nostr link — live testnet round-trip', () => {
  it('claims, signs, and submits a real link', async () => {
    OpenAPI.BASE = (process.env.SUPERHERO_API_URL || TESTNET_API).replace(/\/$/, '');

    const mnemonic = generateMnemonic(wordlist);
    const { address } = deriveAccount(mnemonic, 0);
    const account = deriveSigner(mnemonic, 0);
    const keys = deriveKeysFromSeed(mnemonicToSeedSync(mnemonic), 0);
    const identity = createDerivedNostrIdentity(keys);

    // eslint-disable-next-line no-console
    console.log('[e2e] address', address, '\n[e2e] npub', keys.npub);

    const signMessage = async (m: string) => Buffer.from(await account.signMessage(m)).toString('hex');

    const result = await linkNostrIdentity({
      address, npub: keys.npub, identity, signMessage,
    });

    // eslint-disable-next-line no-console
    console.log('[e2e] submit result', JSON.stringify(result));
    expect(result?.txHash).toMatch(/^th_/);

    const linked = await fetchNostrLink(address);
    // eslint-disable-next-line no-console
    console.log('[e2e] account links.nostr', linked);
  }, 120_000);
});
