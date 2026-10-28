// @vitest-environment node
import {
  describe, expect, it, beforeEach, afterEach,
} from 'vitest';
import { startNostrRelay } from '../../../../e2e/helpers/nostr-relay';
import { generateKeys } from '../nostr/crypto';
import { NostrKeySession } from '../identity/nostr-session';
import { createRevocableNostrIdentity } from '../identity/revocable-identity';
import { GatedRoomClient } from '../nostr/gated-room';

const ROOM = 'ct_test_room';

describe.skipIf(!process.env.DM_LOCAL_E2E)('authenticated token-room transport', () => {
  let relay: Awaited<ReturnType<typeof startNostrRelay>>;
  const clients: GatedRoomClient[] = [];
  const sessions: NostrKeySession[] = [];
  function account() {
    const keys = generateKeys();
    const session = new NostrKeySession();
    session.unlock(keys);
    sessions.push(session);
    const identity = createRevocableNostrIdentity(() => session.identity());
    const client = new GatedRoomClient(identity, relay.url);
    clients.push(client);
    return { keys, client, session };
  }
  beforeEach(async () => { relay = await startNostrRelay(); });
  afterEach(async () => {
    clients.splice(0).forEach((client) => client.close());
    sessions.splice(0).forEach((session) => session.lock('explicit'));
    await relay?.close();
  });

  it('delivers both ways, backfills history and shares concurrent connections', async () => {
    const alice = account();
    const bob = account();
    relay.rooms.set(ROOM, { private: true, members: new Set([alice.keys.publicKey, bob.keys.publicKey]) });
    await Promise.all([alice.client.connect(), alice.client.connect(), alice.client.connect()]);
    expect(relay.connectionCount).toBe(1);
    const receivedA: string[] = [];
    const receivedB: string[] = [];
    await Promise.all([
      alice.client.subscribeRoom(ROOM, (event) => receivedA.push(event.content)),
      bob.client.subscribeRoom(ROOM, (event) => receivedB.push(event.content)),
    ]);
    await expect.poll(() => relay.authCount).toBe(2);
    await alice.client.sendRoomMessage(ROOM, 'member alice');
    await bob.client.sendRoomMessage(ROOM, 'member bob');
    await expect.poll(() => receivedA).toEqual(['member alice', 'member bob']);
    await expect.poll(() => receivedB).toEqual(['member alice', 'member bob']);
    const history = await bob.client.fetchRoomHistory(ROOM);
    expect(history.map((event) => event.content).sort()).toEqual(['member alice', 'member bob']);
    expect(relay.invalidRequests).toEqual([]);
  });

  it('denies a nonmember private history, live subscription and posting; allows it after membership is granted', async () => {
    const alice = account();
    const bob = account();
    const members = new Set([alice.keys.publicKey]);
    relay.rooms.set(ROOM, { private: true, members });
    await alice.client.sendRoomMessage(ROOM, 'members only');
    await expect(bob.client.fetchRoomHistory(ROOM)).rejects.toThrow('not a member');
    const errors: Error[] = [];
    const received: string[] = [];
    await bob.client.subscribeRoom(ROOM, (event) => received.push(event.content), {
      onError: (error) => errors.push(error),
    });
    await expect.poll(() => errors.length).toBe(1);
    expect(received).toEqual([]);
    await expect(bob.client.sendRoomMessage(ROOM, 'denied')).rejects.toThrow('not a member');
    members.add(bob.keys.publicKey);
    await bob.client.sendRoomMessage(ROOM, 'now eligible');
    expect(await bob.client.fetchRoomHistory(ROOM)).toHaveLength(2);
    members.delete(bob.keys.publicKey);
    await expect(bob.client.sendRoomMessage(ROOM, 'revoked')).rejects.toThrow('not a member');
    await expect(bob.client.fetchRoomHistory(ROOM)).rejects.toThrow('not a member');
  });

  it('cannot sign after lock or reopen a closed client', async () => {
    const alice = account();
    alice.session.lock('explicit');
    await expect(alice.client.sendRoomMessage(ROOM, 'locked')).rejects.toThrow();
    const pending = alice.client.connect();
    alice.client.close();
    await expect(pending).rejects.toThrow();
    await expect(alice.client.connect()).rejects.toThrow('closed');
  });
});
