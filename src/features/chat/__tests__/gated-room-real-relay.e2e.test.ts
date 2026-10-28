// @vitest-environment node
import {
  afterEach, describe, expect, it,
} from 'vitest';
import { Relay } from 'nostr-tools/relay';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { decode } from 'nostr-tools/nip19';
import { generateKeys } from '../nostr/crypto';
import { NostrKeySession } from '../identity/nostr-session';
import { createRevocableNostrIdentity } from '../identity/revocable-identity';
import { GatedRoomClient } from '../nostr/gated-room';
import { readTestWallets, testWalletKeys } from './helpers/live-wallets';

// Local mode uses the public key fixture from groups_relay/settings.test.yml.
// Live mode explicitly creates a disposable private group with a fresh owner;
// it never uses a relay admin key or changes an existing group's membership.
const localUrl = process.env.NOSTR_LOCAL_GROUPS_RELAY_URL;
const url = localUrl || process.env.NOSTR_LIVE_GROUPS_RELAY_URL;
const adminNsec = process.env.NOSTR_LOCAL_GROUPS_RELAY_ADMIN_NSEC
  || 'nsec1dwg3l5mumawgr4xq4kc6klagytkj2w4s4kd2rrthy47g3v5mwx8qwrh7sx';

describe.skipIf(!url)('real groups_relay private-room delivery', () => {
  const clients: GatedRoomClient[] = [];
  const sessions: NostrKeySession[] = [];
  let admin: Relay | undefined;
  let deleteGroup: (() => Promise<void>) | undefined;

  function account(index: number) {
    const wallets = readTestWallets(process.env.NOSTR_LIVE_WALLETS_FILE);
    const keys = wallets ? testWalletKeys(wallets[index]) : generateKeys();
    const session = new NostrKeySession();
    session.unlock(keys);
    sessions.push(session);
    const identity = createRevocableNostrIdentity(() => session.identity());
    const client = new GatedRoomClient(identity, url!);
    clients.push(client);
    return { keys, identity, client };
  }

  afterEach(async () => {
    try { await deleteGroup?.(); } finally {
      deleteGroup = undefined;
      clients.splice(0).forEach((client) => client.close());
      sessions.splice(0).forEach((session) => session.lock('explicit'));
      admin?.close();
    }
  });

  it('enforces membership, delivers both ways, reloads history and revokes existing readers', async () => {
    if (localUrl && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(localUrl).hostname)) {
      throw new Error('This test requires a disposable loopback relay.');
    }
    if (!localUrl && new URL(url!).protocol !== 'wss:') {
      throw new Error('Live relay testing requires wss.');
    }
    let key = generateSecretKey();
    if (localUrl) {
      const decoded = decode(adminNsec);
      if (decoded.type !== 'nsec') throw new Error('Invalid local relay admin key.');
      key = decoded.data;
    }
    admin = new Relay(url!);
    admin.onauth = async (event) => finalizeEvent(event, key);
    await admin.connect({ timeout: 5000 });
    const room = `ct_web_delivery_${crypto.randomUUID()}`;
    const manage = async (kind: number, tags: string[][] = [], group = room) => {
      const event = finalizeEvent({
        kind,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['h', group], ...tags],
        content: '',
      }, key);
      await admin!.publish(event);
    };
    const alice = account(0);
    const bob = account(1);
    await manage(9007);
    deleteGroup = () => manage(9008);
    await manage(9002, [['name', 'Disposable delivery test'], ['private'], ['closed']]);
    await manage(9000, [['p', alice.keys.publicKey]]);

    await expect(bob.client.sendRoomMessage(room, 'not yet a member')).rejects.toThrow();
    await expect(bob.client.fetchRoomHistory(room)).rejects.toThrow();
    await manage(9000, [['p', bob.keys.publicKey]]);

    const receivedA: string[] = [];
    const receivedB: string[] = [];
    const errors: Error[] = [];
    await Promise.all([
      alice.client.subscribeRoom(room, (event) => receivedA.push(event.id), {
        onError: (error) => errors.push(error),
      }),
      bob.client.subscribeRoom(room, (event) => receivedB.push(event.id), {
        onError: (error) => errors.push(error),
      }),
    ]);
    const first = await alice.client.sendRoomMessage(room, 'alice to bob');
    const reply = await bob.client.sendRoomMessage(room, 'bob to alice');
    await expect.poll(() => receivedA, { timeout: 10_000 })
      .toEqual(expect.arrayContaining([first, reply]));
    await expect.poll(() => receivedB, { timeout: 10_000 })
      .toEqual(expect.arrayContaining([first, reply]));
    expect(errors).toEqual([]);

    const fresh = new GatedRoomClient(bob.identity, url!);
    clients.push(fresh);
    const history = await fresh.fetchRoomHistory(room);
    expect(history.map((event) => event.content).sort()).toEqual(['alice to bob', 'bob to alice']);

    await manage(9001, [['p', bob.keys.publicKey]]);
    await expect(bob.client.sendRoomMessage(room, 'membership revoked')).rejects.toThrow();
    await expect(fresh.fetchRoomHistory(room)).rejects.toThrow();
    const afterRemoval = await alice.client.sendRoomMessage(room, 'remaining members only');
    await expect.poll(() => receivedA.includes(afterRemoval)).toBe(true);
    await new Promise((resolve) => { setTimeout(resolve, 500); });
    expect(receivedB).not.toContain(afterRemoval);

    // Concurrent token-room updates must keep a separate roster for each d tag.
    const secondRoom = `ct_web_delivery_${crypto.randomUUID()}`;
    await manage(9007, [], secondRoom);
    deleteGroup = async () => {
      await Promise.all([manage(9008), manage(9008, [], secondRoom)]);
    };
    await manage(9000, [['p', alice.keys.publicKey]], secondRoom);
    await Promise.all([
      manage(9000, [['p', bob.keys.publicKey]]),
      manage(9000, [['p', bob.keys.publicKey]], secondRoom),
    ]);
    await expect.poll(async () => {
      const rosters = await Promise.all([
        alice.client.getGroupMembers(room), alice.client.getGroupMembers(secondRoom),
      ]);
      return rosters.every((members) => members.includes(bob.keys.publicKey));
    }, { timeout: 5000 }).toBe(true);
  }, 45_000);
});
