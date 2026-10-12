import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { verifyEvent, type EventTemplate, type VerifiedEvent } from 'nostr-tools/pure';
import { makeAuthEvent } from 'nostr-tools/nip42';

import { NostrKeySession } from '../identity/nostr-session';
import {
  createRevocableNostrIdentity,
  NostrIdentityLockedError,
} from '../identity/revocable-identity';
import { generateKeys } from '../nostr/crypto';
import { NostrClient } from '../nostr/nostr-client';
import { RelayPublishError } from '../nostr/relay-publish-error';

type PublishParams = { onauth?: (evt: EventTemplate) => Promise<VerifiedEvent> };

const pool = vi.hoisted(() => ({
  publish: vi.fn<(relays: string[], event: unknown, params?: PublishParams) => Promise<string>[]>(),
  close: vi.fn(),
}));

vi.mock('nostr-tools/pool', () => ({
  SimplePool: class {
    publish = pool.publish;

    close = pool.close;
  },
}));

/** The pool rejects with a plain string, not an Error, when a socket never opens. */
function connectionFailure(reason: string): Promise<string> {
  // eslint-disable-next-line prefer-promise-reject-errors
  return Promise.reject(`connection failure: ${reason}`);
}

const RELAY_A = 'wss://relay.superhero.chat';
const RELAY_B = 'wss://relay.two.example';
const relays = {
  [RELAY_A]: { read: true, write: true },
  [RELAY_B]: { read: true, write: true },
};

const dm = (): EventTemplate => ({
  kind: 4,
  created_at: Math.floor(Date.now() / 1000),
  tags: [['p', 'a'.repeat(64)]],
  content: 'ciphertext',
});

function makeClient() {
  const session = new NostrKeySession();
  const keys = generateKeys();
  session.unlock(keys);
  const identity = createRevocableNostrIdentity(() => session.identity());
  return { client: new NostrClient(identity, relays), session, keys };
}

/**
 * `publishEvent` used to collapse every per-relay failure into a bare "all
 * relays rejected the event" (issue #742), hiding whether the relay refused the
 * event or was never reached, and it never answered a NIP-42 `auth-required:`.
 */
describe('NostrClient.publishEvent', () => {
  beforeEach(() => {
    pool.publish.mockReset();
  });

  it('resolves with the event id once any relay accepts', async () => {
    pool.publish.mockImplementation(() => [
      Promise.reject(new Error('blocked: not today')),
      Promise.resolve(''),
    ]);
    const { client } = makeClient();

    await expect(client.publishEvent(dm())).resolves.toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps each relay's own reason when every relay refuses", async () => {
    pool.publish.mockImplementation(() => [
      Promise.reject(new Error('restricted: not a member')),
      Promise.reject(new Error('rate-limited: slow down')),
    ]);
    const { client } = makeClient();

    const error = await client.publishEvent(dm()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RelayPublishError);
    const rejection = error as RelayPublishError;
    expect(rejection.rejections).toEqual([
      { relay: RELAY_A, reason: 'restricted: not a member' },
      { relay: RELAY_B, reason: 'rate-limited: slow down' },
    ]);
    expect(rejection.isConnectionFailure).toBe(false);
    expect(rejection.message).toContain('relay.superhero.chat: restricted: not a member');
    expect(rejection.message).toContain('relay.two.example: rate-limited: slow down');
    expect(rejection.message).not.toContain('all relays rejected');
  });

  it('reports a relay it could not reach as unreachable, not as a refusal', async () => {
    // What the pool hands back when the socket never opens (DNS, TLS, timeout).
    pool.publish.mockImplementation(() => [
      connectionFailure('connection failed'),
      connectionFailure('connection timed out'),
    ]);
    const { client } = makeClient();

    const error = await client.publishEvent(dm()).catch((e: unknown) => e) as RelayPublishError;

    expect(error).toBeInstanceOf(RelayPublishError);
    expect(error.isConnectionFailure).toBe(true);
    expect(error.message).toBe(
      'The chat relay is not reachable right now (relay.superhero.chat: connection failed; '
      + 'relay.two.example: connection timed out). Please try again in a moment.',
    );
  });

  it('answers a NIP-42 challenge by signing the AUTH event with the same identity', async () => {
    pool.publish.mockImplementation(() => [Promise.resolve(''), Promise.resolve('')]);
    const { client, keys } = makeClient();

    await client.publishEvent(dm());

    const [writeRelays, , params] = pool.publish.mock.calls[0];
    expect(writeRelays).toEqual([RELAY_A, RELAY_B]);
    expect(params?.onauth).toBeTypeOf('function');
    const auth = await params!.onauth!(makeAuthEvent(RELAY_A, 'challenge-123'));
    expect(auth.kind).toBe(22242);
    expect(auth.pubkey).toBe(keys.publicKey);
    expect(auth.tags).toContainEqual(['challenge', 'challenge-123']);
    expect(verifyEvent(auth)).toBe(true);
  });

  it('cannot answer AUTH once the session is locked', async () => {
    pool.publish.mockImplementation(() => [Promise.resolve(''), Promise.resolve('')]);
    const { client, session } = makeClient();
    await client.publishEvent(dm());
    const [, , params] = pool.publish.mock.calls[0];

    session.lock('explicit');

    await expect(params!.onauth!(makeAuthEvent(RELAY_A, 'challenge-123'))).rejects.toBeInstanceOf(
      NostrIdentityLockedError,
    );
  });
});
