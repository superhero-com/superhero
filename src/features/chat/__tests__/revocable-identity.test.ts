import {
  describe, it, expect, vi,
} from 'vitest';

import { NostrKeySession } from '../identity/nostr-session';
import {
  createRevocableNostrIdentity,
  NostrIdentityLockedError,
} from '../identity/revocable-identity';
import { generateKeys } from '../nostr/crypto';

/**
 * A provider — or a
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

  it('fires onActivity on locally-initiated ops (sign / encrypt) but not on getPublicKey or inbound decrypt', async () => {
    const session = new NostrKeySession();
    session.unlock(generateKeys());
    const onActivity = vi.fn();
    const identity = createRevocableNostrIdentity(() => session.identity(), { onActivity });

    await identity.getPublicKey();
    expect(onActivity).not.toHaveBeenCalled();

    await identity.signEvent({
      kind: 1, created_at: 0, tags: [], content: 'x',
    });
    expect(onActivity).toHaveBeenCalledTimes(1);

    const otherPubkey = generateKeys().publicKey;
    const ciphertext = await identity.nip04Encrypt(otherPubkey, 'hi');
    expect(onActivity).toHaveBeenCalledTimes(2);

    // Inbound decryption is driven by relay delivery, not local user action — it
    // must NOT count as activity, else a remote sender could keep the key resident
    // by trickling in DMs.
    await identity.nip04Decrypt(otherPubkey, ciphertext);
    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it('activity through the identity re-arms the session idle timer (an active chat stays unlocked)', async () => {
    vi.useFakeTimers();
    try {
      const session = new NostrKeySession({ idleTimeoutMs: 1000 });
      const identity = createRevocableNostrIdentity(
        () => session.identity(),
        { onActivity: () => session.touch() },
      );
      session.unlock(generateKeys());

      vi.advanceTimersByTime(800);
      // A message signed 800ms in is chat activity — it must reset the idle window,
      // exactly what the never-reset-timer defect broke.
      await identity.signEvent({
        kind: 1, created_at: 0, tags: [], content: 'active',
      });

      vi.advanceTimersByTime(800); // 1600ms since unlock, only 800ms since activity
      expect(session.isUnlocked).toBe(true);

      vi.advanceTimersByTime(200); // 1000ms since activity — now it idles out
      expect(session.isUnlocked).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('inbound decryption does NOT re-arm the idle timer (a remote sender cannot keep the key resident)', async () => {
    vi.useFakeTimers();
    try {
      const session = new NostrKeySession({ idleTimeoutMs: 1000 });
      const identity = createRevocableNostrIdentity(
        () => session.identity(),
        { onActivity: () => session.touch() },
      );
      session.unlock(generateKeys()); // arms the 1000ms window at t=0

      // Prepare a ciphertext to "receive" via the underlying provider, so building
      // it does not itself count as activity.
      const otherPubkey = generateKeys().publicKey;
      const ciphertext = await session.identity()!.nip04Encrypt(otherPubkey, 'inbound');

      vi.advanceTimersByTime(800);
      // A DM arriving from a relay at 800ms is decrypted, but that must not extend
      // the window past the original unlock.
      await identity.nip04Decrypt(otherPubkey, ciphertext);

      vi.advanceTimersByTime(200); // 1000ms since unlock, decrypt bought no extension
      expect(session.isUnlocked).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
