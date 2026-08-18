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
 * KNOWN BACKEND STATE (2026-08-18, testnet.api.dev.tokensale.org): `claim`
 * returns 201 and the AE signature verifies locally, but `submit` answers
 * `500 {"statusCode":500,"message":"Internal server error"}` — for a brand-new
 * account AND for one funded from the faucet so it exists on chain. The payload
 * matches what the app sends (same endpoint, `nostr_event` as a JSON string), so
 * this is a server-side fault, not a client contract mismatch. The failure is
 * asserted per stage below so a run says WHICH step broke instead of just
 * "Internal Server Error".
 */
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

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

  /**
   * Stage-by-stage version of the same flow. When the round-trip above fails,
   * this says whether the client built a bad payload or the server broke: each
   * step is asserted on its own, and the submit body is printed so it can be
   * replayed with curl against another environment.
   */
  it('isolates which stage fails', async () => {
    OpenAPI.BASE = (process.env.SUPERHERO_API_URL || TESTNET_API).replace(/\/$/, '');

    const mnemonic = generateMnemonic(wordlist);
    const { address } = deriveAccount(mnemonic, 0);
    const account = deriveSigner(mnemonic, 0);
    const keys = deriveKeysFromSeed(mnemonicToSeedSync(mnemonic), 0);
    const identity = createDerivedNostrIdentity(keys);

    // 1. claim
    const claim = (await NostrLinkService.nostrLinkControllerClaim({
      requestBody: { address, value: keys.npub },
    })) as { message: string; nonce: number; value: string };

    expect(claim.message).toContain(address);
    expect(claim.message).toContain(keys.npub);

    // 2. AE signature — must verify locally against the signing account, which is
    //    the exact digest the contract's verify_user_sig checks.
    const signature = Buffer.from(await account.signMessage(claim.message)).toString('hex');
    expect(signature).toMatch(/^[0-9a-f]{128}$/);
    expect(verifyLinkMessageSignature(address, claim.message, signature)).toBe(true);

    // 3. nostr proof — a kind-22242 event, serialized as a JSON STRING (what the
    //    backend's DTO expects; an object is rejected with a 400).
    const nostrEvent = await createNostrProofEvent(identity, claim.message);
    expect(typeof nostrEvent).toBe('string');
    const parsed = JSON.parse(nostrEvent);
    expect(parsed.kind).toBe(22242);
    expect(parsed.content).toBe(claim.message);
    expect(parsed.sig).toMatch(/^[0-9a-f]{128}$/);

    // Everything the client controls is now provably well-formed. Print the body
    // so a failure here is reproducible outside the test.
    const body = {
      address, value: keys.npub, nonce: claim.nonce, signature, nostr_event: nostrEvent,
    };
    // eslint-disable-next-line no-console
    console.log('[e2e] submit body', JSON.stringify(body));

    // 4. submit — the stage that is currently 500ing server-side.
    const submitted = (await NostrLinkService.nostrLinkControllerSubmit({
      requestBody: body,
    })) as { txHash?: string };

    expect(submitted?.txHash).toMatch(/^th_/);
  }, 120_000);
});
