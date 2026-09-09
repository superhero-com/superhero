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
 *
 * KNOWN BACKEND STATE (2026-08-18, testnet.api.dev.tokensale.org): everything the
 * client controls checks out — `claim` returns 201, the AE signature verifies
 * locally, the proof is well-formed — and then `submit` answers
 * `500 {"statusCode":500,"message":"Internal server error"}`, for a brand-new
 * account and for one funded from the faucet so it exists on chain. That is a
 * server-side fault, not a client contract mismatch.
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { OpenAPI, NostrLinkService } from '@/api/generated';
import { deriveSigner, deriveAccount } from '@/features/wallet/derivation';
import { deriveKeysFromSeed } from '@/features/chat/nostr/crypto';
import { createDerivedNostrIdentity } from '@/features/chat/identity/derived-identity';
import { verifyLinkMessageSignature } from '@/utils/signLinkMessage';
import { createNostrProofEvent } from '../nostr-proof';
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

    // Everything the CLIENT controls, checked first so a failure below is
    // attributable: the claim challenge, an AE signature that verifies against
    // the signing account (the exact digest the contract's verify_user_sig
    // checks), and a well-formed kind-22242 proof. Against a throwaway claim —
    // the link itself goes through the production entry point.
    const claim = (await NostrLinkService.nostrLinkControllerClaim({
      requestBody: { address, value: keys.npub },
    })) as { message: string };
    expect(claim.message).toContain(address);
    expect(claim.message).toContain(keys.npub);

    expect(verifyLinkMessageSignature(address, claim.message, await signMessage(claim.message)))
      .toBe(true);

    const proof = JSON.parse(await createNostrProofEvent(identity, claim.message));
    expect(proof.kind).toBe(22242);
    expect(proof.content).toBe(claim.message);
    expect(proof.sig).toMatch(/^[0-9a-f]{128}$/);

    // The link itself, through the production entry point rather than a copy of
    // it, so a change to link-flow's payload is exercised here too.
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
