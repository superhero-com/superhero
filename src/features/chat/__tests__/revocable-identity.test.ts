import { describe, it, expect } from 'vitest';

import { NostrKeySession } from '../identity/nostr-session';
import {
  createRevocableNostrIdentity,
  NostrIdentityLockedError,
} from '../identity/revocable-identity';
import { generateKeys } from '../nostr/crypto';

/**
 * precondition 1 (the Security Reviewer's named test): a provider — or a
 * service holding one — obtained BEFORE `NostrKeySession.lock()` must reject
 * AFTER lock, so an explicit lock / idle timeout / teardown actually revokes
 * signing and decryption at the transport layer, not only in the session object.
 */
describe('revocable nostr identity', () => {
  it('signs and encrypts before lock', async () => {
    const session = new NostrKeySession();
    session.unlock(generateKeys());
    const identity = createRevocableNostrIdentity(() => session.identity());

    await expect(identity.getPublicKey()).resolves.toMatch(/^[0-9a-f]{64}$/);
    const signed = await identity.signEvent({
      kind: 1,
      created_at: 0,
      tags: [],
      content: 'before lock',
    });
    expect(signed.sig).toBeTruthy();
  });

  it('rejects every method on a provider held across a lock', async () => {
    const session = new NostrKeySession();
    session.unlock(generateKeys());
    // Provider obtained BEFORE the lock.
    const identity = createRevocableNostrIdentity(() => session.identity());

    session.lock('explicit');

    await expect(identity.getPublicKey()).rejects.toBeInstanceOf(
      NostrIdentityLockedError,
    );
    await expect(
      identity.signEvent({
        kind: 1, created_at: 0, tags: [], content: 'after',
      }),
    ).rejects.toBeInstanceOf(NostrIdentityLockedError);
    await expect(
      identity.nip04Encrypt('0'.repeat(64), 'x'),
    ).rejects.toBeInstanceOf(NostrIdentityLockedError);
    await expect(
      identity.nip04Decrypt('0'.repeat(64), 'x'),
    ).rejects.toBeInstanceOf(NostrIdentityLockedError);
  });

  it('rejects again after an idle-timeout lock, then works after re-unlock', async () => {
    const session = new NostrKeySession();
    const identity = createRevocableNostrIdentity(() => session.identity());

    session.unlock(generateKeys());
    await expect(identity.getPublicKey()).resolves.toMatch(/^[0-9a-f]{64}$/);

    session.lock('idle');
    await expect(identity.getPublicKey()).rejects.toBeInstanceOf(
      NostrIdentityLockedError,
    );

    // Re-unlocking the same session revives the SAME provider handle.
    session.unlock(generateKeys());
    await expect(identity.getPublicKey()).resolves.toMatch(/^[0-9a-f]{64}$/);
  });
});
