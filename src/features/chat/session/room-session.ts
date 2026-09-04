/**
 * Token-gated room signing session.
 *
 * One `NostrKeySession` per tab holds the derived nostr key for room posting and
 * NIP-42 AUTH. Transports never receive the raw key: they sign through
 * `roomRevocableIdentity`, a {@link createRevocableNostrIdentity} bound to this
 * session, so once it is locked (explicit / 30-min idle / tab teardown) every
 * sign + decrypt rejects instead of using a stale key.
 *
 * Unlocking is the inline-wallet-only path (`deriveNostrIdentity` + the unlock
 * broker): an extension / WalletConnect account has no seed on this origin, so
 * `unlockRoomSession` throws and the caller surfaces "chat needs the in-app
 * wallet" — the same constraint as the stage-2 link flow.
 */
import { createIndexedDbVaultStore } from '@/features/wallet/vault-store';
import { deriveNostrIdentity } from '@/features/wallet/nostr-key';
import { requestUnlock } from '@/features/wallet/unlock-broker';
import { indexForAddress } from '@/features/wallet/manifest-store';
import {
  NostrKeySession, bindNostrSessionTeardown, DEFAULT_NOSTR_IDLE_TIMEOUT_MS,
} from '../identity/nostr-session';
import { createRevocableNostrIdentity } from '../identity/revocable-identity';

/** Subscribers notified whenever the session locks or unlocks. */
const changeListeners = new Set<() => void>();

function notifyChange(): void {
  changeListeners.forEach((listener) => listener());
}

/** Subscribe to lock/unlock transitions (for `useSyncExternalStore`). */
export function subscribeRoomSession(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** The tab-scoped session that custodies the room signing key. */
export const roomKeySession = new NostrKeySession({ onLock: () => notifyChange() });

/**
 * The single revocable identity every DM and room transport signs through. Holds
 * no key — it re-reads {@link roomKeySession} on each call and rejects once
 * locked. Each locally-initiated sign/encrypt re-arms the idle timer via
 * `touch()`, so an actively-used session does not hard-lock 30 minutes after
 * unlock. Inbound
 * decryption is excluded — it is relay-driven, not local activity.
 */
export const roomRevocableIdentity = createRevocableNostrIdentity(
  () => roomKeySession.identity(),
  { onActivity: () => roomKeySession.touch() },
);

let teardownBound = false;

/** Bind the `pagehide` teardown once, lazily (safe to call repeatedly). */
export function ensureRoomSessionTeardown(): void {
  if (teardownBound || typeof window === 'undefined') return;
  bindNostrSessionTeardown(roomKeySession);
  teardownBound = true;
}

/**
 * Unlock the room session for `address` (inline wallet only). Verifies the user,
 * derives the account's nostr key, and caches it in the session. Throws when the
 * device has no in-app wallet vault.
 */
export async function unlockRoomSession(address: string): Promise<string> {
  const record = await createIndexedDbVaultStore().load();
  if (!record) {
    throw new Error('Chat needs the in-app wallet on this device.');
  }
  const accountIndex = indexForAddress(address) ?? 0;
  // Name the grant: this approval yields a key cached for a rolling idle window,
  // not the single signature the prompt otherwise describes.
  const keys = await deriveNostrIdentity(
    record,
    (r) => requestUnlock(r, {
      kind: 'chat-session',
      idleMinutes: Math.round(DEFAULT_NOSTR_IDLE_TIMEOUT_MS / 60_000),
    }),
    accountIndex,
  );
  roomKeySession.unlock(keys);
  ensureRoomSessionTeardown();
  notifyChange();
  return keys.publicKey;
}

/** Explicitly lock the room session (drops the key; notifies subscribers). */
export function lockRoomSession(): void {
  roomKeySession.lock('explicit');
}
