/**
 * Full-stack DM round-trip between two accounts over an in-process NIP-01 relay —
 * GATED (spins up a WebSocket server), so it is skipped in the normal gate. Run:
 *
 *   DM_LOCAL_E2E=1 npx vitest run \
 *     src/features/chat/__tests__/dm-local-relay.e2e.test.ts
 *
 * It derives TWO fresh accounts (A, B), builds the exact stage-4 transport
 * (revocable identity → NostrClient → DirectMessageService → NostrEventHandler),
 * and sends an encrypted kind-4 DM A→B and B→A through a real relay socket,
 * asserting each side DECRYPTS the other's plaintext. This exercises the whole
 * path — encrypt → sign → publish → relay store/forward → subscribe → decrypt —
 * deterministically, without depending on an external relay's spam policy.
 */
// @vitest-environment node
import {
  describe, expect, it, beforeAll, afterAll,
} from 'vitest';
import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { deriveKeysFromSeed } from '@/features/chat/nostr/crypto';
import { NostrKeySession } from '@/features/chat/identity/nostr-session';
import { createRevocableNostrIdentity } from '@/features/chat/identity/revocable-identity';
import { NostrClient } from '@/features/chat/nostr/nostr-client';
import { NostrEventHandler } from '@/features/chat/nostr/event-handler';
import { DirectMessageService } from '@/features/chat/domains/direct-messages/dm.service';
import { setChatStore } from '@/features/chat/storage/chat-store';
import { createInMemoryKeyValueStore } from '@/features/chat/storage/kv-store';
import type { NostrEvent, RelayDict } from '@/features/chat/core/types';

type Filter = Record<string, unknown>;

function matches(filter: Filter, event: NostrEvent): boolean {
  if (Array.isArray(filter.ids) && !filter.ids.includes(event.id)) return false;
  if (Array.isArray(filter.authors) && !filter.authors.includes(event.pubkey)) return false;
  if (Array.isArray(filter.kinds) && !filter.kinds.includes(event.kind)) return false;
  const tagFilters = Object.entries(filter).filter(([k]) => k.startsWith('#'));
  return tagFilters.every(([k, wanted]) => {
    const tagName = k.slice(1);
    return event.tags.some((t) => t[0] === tagName && (wanted as string[]).includes(t[1]));
  });
}

/** A minimal NIP-01 relay: stores events and forwards to matching REQ subs. */
function startRelay(): Promise<{ url: string; close: () => void }> {
  const events: NostrEvent[] = [];
  const subs = new Map<WsSocket, Map<string, Filter[]>>();
  const wss = new WebSocketServer({ port: 0 });

  wss.on('connection', (ws) => {
    subs.set(ws, new Map());
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const [type] = msg;
      if (type === 'EVENT') {
        const event = msg[1] as NostrEvent;
        events.push(event);
        ws.send(JSON.stringify(['OK', event.id, true, '']));
        subs.forEach((clientSubs, client) => {
          clientSubs.forEach((filters, subId) => {
            if (filters.some((f) => matches(f, event))) {
              client.send(JSON.stringify(['EVENT', subId, event]));
            }
          });
        });
      } else if (type === 'REQ') {
        const subId = msg[1] as string;
        const filters = msg.slice(2) as Filter[];
        events.filter((e) => filters.some((f) => matches(f, e)))
          .forEach((e) => ws.send(JSON.stringify(['EVENT', subId, e])));
        ws.send(JSON.stringify(['EOSE', subId]));
        subs.get(ws)!.set(subId, filters);
      } else if (type === 'CLOSE') {
        subs.get(ws)?.delete(msg[1] as string);
      }
    });
    ws.on('close', () => subs.delete(ws));
  });

  return new Promise((resolve) => {
    wss.on('listening', () => {
      const { port } = wss.address() as { port: number };
      resolve({ url: `ws://127.0.0.1:${port}`, close: () => wss.close() });
    });
  });
}

function makeAccount() {
  const keys = deriveKeysFromSeed(mnemonicToSeedSync(generateMnemonic(wordlist)), 0);
  const session = new NostrKeySession();
  session.unlock(keys);
  return { keys, identity: createRevocableNostrIdentity(() => session.identity()) };
}

/**
 * Resolve with the first INBOUND DM from `expectedFrom`. The handler also fires
 * for the account's own outbound echoes (the app subscribes to `authors:[me]` to
 * sync sent messages across devices), so gate on the event author being the peer.
 */
function waitForDMFrom(
  client: NostrClient,
  identity: ReturnType<typeof makeAccount>['identity'],
  expectedFrom: string,
) {
  return new Promise<{ from: string; text: string }>((resolve) => {
    const handler = new NostrEventHandler(identity, {
      onDirectMessage: (event, decrypted, otherPubkey) => {
        if (event.pubkey === expectedFrom) resolve({ from: otherPubkey, text: decrypted });
      },
      onProfile: () => {},
      onReaction: () => {},
      onEventDeleted: () => {},
    });
    client.on('event', (event) => handler.queueEvent(event));
  });
}

describe.skipIf(!process.env.DM_LOCAL_E2E)('DM round-trip between two accounts (in-process relay)', () => {
  let relay: { url: string; close: () => void };

  beforeAll(async () => { relay = await startRelay(); });
  afterAll(() => relay?.close());

  it('encrypts, publishes, and decrypts a DM each way', async () => {
    setChatStore(createInMemoryKeyValueStore());
    const relays: RelayDict = { [relay.url]: { read: true, write: true } };

    const alice = makeAccount();
    const bob = makeAccount();
    const clientA = new NostrClient(alice.identity, relays);
    const clientB = new NostrClient(bob.identity, relays);

    const bobReceives = waitForDMFrom(clientB, bob.identity, alice.keys.publicKey);
    const aliceReceives = waitForDMFrom(clientA, alice.identity, bob.keys.publicKey);

    clientB.subscribe([{ kinds: [4], '#p': [bob.keys.publicKey] }]);
    clientA.subscribe([{ kinds: [4], '#p': [alice.keys.publicKey] }]);
    await new Promise((r) => { setTimeout(r, 300); });

    const dmA = new DirectMessageService(clientA, alice.identity);
    const dmB = new DirectMessageService(clientB, bob.identity);

    const sentToBob = await dmA.sendMessage(bob.keys.publicKey, 'hello bob — from alice');
    expect(sentToBob.status.type).toBe('sent');
    const received = await bobReceives;
    expect(received.text).toBe('hello bob — from alice');
    expect(received.from).toBe(alice.keys.publicKey);

    const sentToAlice = await dmB.sendMessage(alice.keys.publicKey, 'hi alice — from bob');
    expect(sentToAlice.status.type).toBe('sent');
    const back = await aliceReceives;
    expect(back.text).toBe('hi alice — from bob');
    expect(back.from).toBe(bob.keys.publicKey);

    clientA.destroy();
    clientB.destroy();
  }, 30_000);
});
