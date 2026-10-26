// @vitest-environment node
import {
  describe, expect, it, beforeEach, afterEach,
} from 'vitest';
import { startNostrRelay } from '../../../../e2e/helpers/nostr-relay';
import { generateKeys } from '../nostr/crypto';
import { NostrKeySession } from '../identity/nostr-session';
import { createRevocableNostrIdentity } from '../identity/revocable-identity';
import { NostrClient } from '../nostr/nostr-client';
import { NostrEventHandler } from '../nostr/event-handler';
import { DirectMessageService } from '../domains/direct-messages/dm.service';
import { setChatStore, clearChatStore } from '../storage/chat-store';
import { createInMemoryKeyValueStore } from '../storage/kv-store';

// Opt-in because this suite opens real loopback WebSocket listeners.
describe.skipIf(!process.env.DM_LOCAL_E2E)('two-account authenticated DM delivery', () => {
  let relay: Awaited<ReturnType<typeof startNostrRelay>>;
  const clients: NostrClient[] = [];
  const sessions: NostrKeySession[] = [];

  function account() {
    const keys = generateKeys();
    const session = new NostrKeySession();
    session.unlock(keys);
    sessions.push(session);
    const identity = createRevocableNostrIdentity(() => session.identity());
    const client = new NostrClient(identity, { [relay.url]: { read: true, write: true } });
    clients.push(client);
    const received: string[] = [];
    const handler = new NostrEventHandler(identity, {
      onDirectMessage: (event, text) => { if (event.pubkey !== keys.publicKey) received.push(text); },
      onProfile: () => {},
      onReaction: () => {},
      onEventDeleted: () => {},
    });
    client.on('event', (event) => handler.queueEvent(event));
    client.subscribe([
      { authors: [keys.publicKey], kinds: [0, 4] },
      { kinds: [4], '#p': [keys.publicKey] },
    ]);
    return {
      keys, client, identity, received, service: new DirectMessageService(client, identity),
    };
  }

  beforeEach(async () => {
    relay = await startNostrRelay();
    setChatStore(createInMemoryKeyValueStore());
  });
  afterEach(async () => {
    clients.splice(0).forEach((client) => client.destroy());
    sessions.splice(0).forEach((session) => session.lock('explicit'));
    clearChatStore();
    await relay?.close();
  });

  it('sends valid filters, authenticates reads, and delivers encrypted messages both ways', async () => {
    const alice = account();
    const bob = account();
    await expect.poll(() => relay.authCount).toBe(2);
    expect(relay.invalidRequests).toEqual([]);
    await alice.service.sendMessage(bob.keys.publicKey, 'hello bob');
    await expect.poll(() => bob.received).toEqual(['hello bob']);
    await bob.service.sendMessage(alice.keys.publicKey, 'hello alice');
    await expect.poll(() => alice.received).toEqual(['hello alice']);
    expect([...relay.events.values()].every((event) => !event.content.includes('hello'))).toBe(true);
  });

  it('authenticates a fresh history connection and retrieves offline messages', async () => {
    const alice = account();
    const bob = account();
    await alice.service.sendMessage(bob.keys.publicKey, 'while you were away');
    const fresh = new NostrClient(bob.identity, { [relay.url]: { read: true, write: true } });
    clients.push(fresh);
    const events = await fresh.fetchEvents([{ kinds: [4], '#p': [bob.keys.publicKey] }]);
    expect(events).toHaveLength(1);
    await expect(bob.identity.nip04Decrypt(alice.keys.publicKey, events[0].content))
      .resolves.toBe('while you were away');
  });
});
