/**
 * Revocable `NostrIdentityProvider`.
 *
 * Stage 1's `createDerivedNostrIdentity` captures the key in a closure at
 * construction time, so a provider handed to a long-lived transport keeps
 * signing and decrypting even after `NostrKeySession.lock()` drops the session
 * key — the medium finding that blocks transport. This wrapper closes that gap:
 * it holds NO key, only a `source` that re-reads the CURRENT session provider on
 * every call. Once the session is locked the source yields `null` and every
 * method rejects with {@link NostrIdentityLockedError}.
 *
 * Property (the reviewer-named test): a provider obtained BEFORE lock rejects
 * AFTER lock, because the wrapper resolves late rather than snapshotting. Every
 * chat transport (rooms, and later DMs) signs through this — never a raw key and
 * never a pre-lock snapshot.
 */
import type { EventTemplate } from 'nostr-tools/pure';
import type { NostrEvent } from '../core/types';
import type { NostrIdentityProvider } from './nostr-identity';

/** Thrown by a revocable identity when the backing session is locked. */
export class NostrIdentityLockedError extends Error {
  constructor() {
    super('Nostr identity is locked — unlock chat to sign or decrypt.');
    this.name = 'NostrIdentityLockedError';
  }
}

/**
 * Yields the current identity provider, or `null` when the session is locked.
 * Typically `() => nostrKeySession.identity()`.
 */
export type NostrIdentitySource = () => NostrIdentityProvider | null;

export interface RevocableNostrIdentityOptions {
  /**
   * Fired after each successful LOCALLY-INITIATED message operation — `signEvent`
   * (posting / sending) and `nip04Encrypt` (composing an outgoing DM) — the "chat
   * activity" signal the idle timeout watches. Every DM and room transport
   * signs and encrypts through this one provider, so a single hook here re-arms
   * the session idle timer on real chat use across DMs and communities alike.
   *
   * `getPublicKey` (a passive read of public material, used by NIP-42 AUTH) and
   * `nip04Decrypt` deliberately do NOT count: inbound decryption is driven by
   * relay delivery, not local user action, so counting it would let a remote
   * sender keep the key resident indefinitely by trickling in DMs — turning the
   * idle window into a remote-input-controlled one.
   */
  onActivity?: () => void;
}

/**
 * Wrap a late-resolving {@link NostrIdentitySource} as a `NostrIdentityProvider`.
 * The returned provider is safe to hand to a service that outlives a lock: after
 * lock, every method rejects instead of using a stale key.
 */
export function createRevocableNostrIdentity(
  source: NostrIdentitySource,
  { onActivity }: RevocableNostrIdentityOptions = {},
): NostrIdentityProvider {
  const resolve = (): NostrIdentityProvider => {
    const identity = source();
    if (!identity) throw new NostrIdentityLockedError();
    return identity;
  };
  return {
    async getPublicKey(): Promise<string> {
      return resolve().getPublicKey();
    },
    async signEvent(template: EventTemplate): Promise<NostrEvent> {
      const event = await resolve().signEvent(template);
      onActivity?.();
      return event;
    },
    async nip04Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
      const ciphertext = await resolve().nip04Encrypt(recipientPubkey, plaintext);
      onActivity?.();
      return ciphertext;
    },
    async nip04Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
      // No onActivity: inbound decryption is relay-driven, not local user action.
      return resolve().nip04Decrypt(senderPubkey, ciphertext);
    },
  };
}
