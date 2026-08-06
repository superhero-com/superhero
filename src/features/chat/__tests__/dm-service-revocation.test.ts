import { describe, it, expect } from 'vitest';

import { NostrKeySession } from '../identity/nostr-session';
import {
  createRevocableNostrIdentity,
  NostrIdentityLockedError,
} from '../identity/revocable-identity';
import { generateKeys } from '../nostr/crypto';
import { DirectMessageService } from '../domains/direct-messages/dm.service';
import { setChatStore } from '../storage/chat-store';
import { createInMemoryKeyValueStore } from '../storage/kv-store';
import type { NostrClient } from '../nostr/nostr-client';
import type { NostrEvent } from '../core/types';

/**
 * Finding #1 (the Security Reviewer's named test), enforced at the TRANSPORT
 * layer: a DM service obtained BEFORE `NostrKeySession.lock()` must stop sending
 * and decoding AFTER lock. The service holds a revocable identity, not a raw key,
 * so every path (`sendMessage`, `processIncomingDM`) first awaits the identity
 * and rejects with {@link NostrIdentityLockedError} once the session is locked —
 * no retained private key keeps the DM plane alive past an explicit lock, a
 * 30-min idle timeout, or tab teardown.
 */
describe('DM service revocation on session lock', () => {
  const publishStub = {
    publishEvent: async () => 'event-id',
  } as unknown as NostrClient;

  const otherPubkey = 'a'.repeat(64);
  const inboundEvent: NostrEvent = {
    id: 'evt1',
    pubkey: otherPubkey,
    created_at: 0,
    kind: 4,
    tags: [],
    content: 'ciphertext',
    sig: '',
  };

  it('sends and receives while unlocked, then rejects both after lock', async () => {
    setChatStore(createInMemoryKeyValueStore());
    const session = new NostrKeySession();
    session.unlock(generateKeys());
    const identity = createRevocableNostrIdentity(() => session.identity());

    // Service obtained BEFORE the lock.
    const dmService = new DirectMessageService(publishStub, identity);

    // Sanity: the identity resolves while unlocked.
    await expect(identity.getPublicKey()).resolves.toMatch(/^[0-9a-f]{64}$/);

    session.lock('explicit');

    await expect(dmService.sendMessage(otherPubkey, 'hello')).rejects.toBeInstanceOf(
      NostrIdentityLockedError,
    );
    await expect(
      dmService.processIncomingDM(inboundEvent, 'hello', otherPubkey),
    ).rejects.toBeInstanceOf(NostrIdentityLockedError);
  });

  it('also rejects after an idle-timeout lock', async () => {
    setChatStore(createInMemoryKeyValueStore());
    const session = new NostrKeySession();
    session.unlock(generateKeys());
    const identity = createRevocableNostrIdentity(() => session.identity());
    const dmService = new DirectMessageService(publishStub, identity);

    session.lock('idle');

    await expect(
      dmService.processIncomingDM(inboundEvent, 'hello', otherPubkey),
    ).rejects.toBeInstanceOf(NostrIdentityLockedError);
  });
});
