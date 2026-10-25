// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  AccountsService, ApiError, NostrLinkService, OpenAPI,
} from '@/api/generated';
import { deriveSigner } from '@/features/wallet/derivation';
import { linkNostrIdentity } from '@/features/nostr-link/link-flow';
import { createDerivedNostrIdentity } from '../identity/derived-identity';
import { generateKeys } from '../nostr/crypto';
import { NostrKeySession } from '../identity/nostr-session';
import { createRevocableNostrIdentity } from '../identity/revocable-identity';
import { NostrClient } from '../nostr/nostr-client';
import type { NostrEvent } from '../core/types';
import { readTestWallets, testWalletKeys } from './helpers/live-wallets';

// Explicit opt-in. An optional PRIVATE fixture allows repeatable wallet identities;
// never commit its contents or include mnemonic values in assertions/log output.
const url = process.env.NOSTR_LIVE_RELAY_URL;
const fixturePath = process.env.NOSTR_LIVE_WALLETS_FILE;
const linkApi = process.env.NOSTR_LIVE_LINK_API;
async function accountLink(address: string): Promise<string | null> {
  try {
    const account = await AccountsService.getAccount({ address }) as {
      links?: { nostr?: string };
    };
    return account.links?.nostr ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Separate opt-in: registers the test accounts' AE↔Nostr links through the API.
// Refuse to overwrite any different existing link. This does not transfer funds.
describe.skipIf(!fixturePath || !linkApi)('live test-wallet Nostr registration', () => {
  it.each([0, 1])('registers wallet %i and confirms its indexed link', async (index) => {
    const previousBase = OpenAPI.BASE;
    OpenAPI.BASE = linkApi!;
    try {
      const wallet = readTestWallets(fixturePath)![index];
      const signer = deriveSigner(wallet.mnemonic, wallet.accountIndex);
      const keys = testWalletKeys(wallet);
      const current = await accountLink(signer.address);
      if (current && current !== keys.npub) throw new Error('Test account has a different Nostr link.');
      if (!current) {
        const claim = await NostrLinkService.nostrLinkControllerClaim({
          requestBody: { address: signer.address, value: keys.npub },
        }) as { nonce: number };
        // A previous run may have submitted successfully while indexing still
        // lags. Never submit again when the on-chain nonce has already advanced.
        if (claim.nonce === 0) {
          const result = await linkNostrIdentity({
            address: signer.address,
            npub: keys.npub,
            identity: createDerivedNostrIdentity(keys),
            signMessage: async (message) => (
              Buffer.from(await signer.signMessage(message)).toString('hex')
            ),
          });
          expect(result.txHash).toMatch(/^th_/);
          // Public receipt only; distinguishes delayed indexing from a rejected link.
          // eslint-disable-next-line no-console
          console.info('[live-link]', { address: signer.address, txHash: result.txHash });
        }
      }
      await expect.poll(() => accountLink(signer.address), {
        timeout: 180_000, interval: 5_000,
      }).toBe(keys.npub);
    } finally {
      OpenAPI.BASE = previousBase;
    }
  }, 210_000);
});

describe.skipIf(!url)('live relay two-account DM delivery', () => {
  it('delivers and decrypts both ways, then retrieves history from a new connection', async () => {
    const sessions: NostrKeySession[] = [];
    const clients: NostrClient[] = [];
    const wallets = readTestWallets(fixturePath);
    const makeAccount = (index: number) => {
      const session = new NostrKeySession();
      session.unlock(wallets ? testWalletKeys(wallets[index]) : generateKeys());
      sessions.push(session);
      const identity = createRevocableNostrIdentity(() => session.identity());
      const client = new NostrClient(identity, { [url!]: { read: true, write: true } });
      clients.push(client);
      return { identity, client };
    };
    try {
      const alice = makeAccount(0);
      const bob = makeAccount(1);
      const a = await alice.identity.getPublicKey();
      const b = await bob.identity.getPublicKey();
      expect(a).not.toBe(b);
      const receivedA: NostrEvent[] = [];
      const receivedB: NostrEvent[] = [];
      alice.client.subscribe([{ kinds: [4], '#p': [a] }], (event) => receivedA.push(event));
      bob.client.subscribe([{ kinds: [4], '#p': [b] }], (event) => receivedB.push(event));
      const idA = await alice.client.publishEvent({
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', b]],
        content: await alice.identity.nip04Encrypt(b, 'Superhero delivery test A to B'),
      });
      await expect.poll(() => receivedB.some((event) => event.id === idA), { timeout: 20_000 }).toBe(true);
      await expect(bob.identity.nip04Decrypt(a, receivedB.find((event) => event.id === idA)!.content))
        .resolves.toBe('Superhero delivery test A to B');
      const idB = await bob.client.publishEvent({
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', a]],
        content: await bob.identity.nip04Encrypt(a, 'Superhero delivery test B to A'),
      });
      await expect.poll(() => receivedA.some((event) => event.id === idB), { timeout: 20_000 }).toBe(true);
      await expect(alice.identity.nip04Decrypt(b, receivedA.find((event) => event.id === idB)!.content))
        .resolves.toBe('Superhero delivery test B to A');
      const fresh = new NostrClient(bob.identity, { [url!]: { read: true, write: true } });
      clients.push(fresh);
      expect((await fresh.fetchEvents([{ ids: [idA] }])).map((event) => event.id)).toContain(idA);
    } finally {
      clients.forEach((client) => client.destroy());
      sessions.forEach((session) => session.lock('explicit'));
    }
  }, 60_000);
});
