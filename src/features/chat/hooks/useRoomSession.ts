/**
 * React binding for the token-gated room signing session. Exposes the revocable
 * identity to hand to a {@link GatedRoomClient}, the current nostr pubkey, and an
 * `unlock` action, and re-renders on lock/unlock (including the 30-min idle lock)
 * via `useSyncExternalStore`.
 */
import { useCallback, useState, useSyncExternalStore } from 'react';

import { useAccount } from '@/hooks';
import type { NostrIdentityProvider } from '../identity/nostr-identity';
import {
  lockRoomSession,
  roomKeySession,
  roomRevocableIdentity,
  subscribeRoomSession,
  unlockRoomSession,
} from '../session/room-session';

export interface UseRoomSessionResult {
  /** Revocable provider to sign room posts / NIP-42 AUTH, or `null` when locked. */
  identity: NostrIdentityProvider | null;
  /** The unlocked nostr hex pubkey, or `null` when locked. */
  pubkey: string | null;
  /** Whether the session currently holds a key. */
  isUnlocked: boolean;
  /** True while an unlock is mid-flight (user verification / derivation). */
  isUnlocking: boolean;
  /** Last unlock error, or `null`. */
  error: Error | null;
  /** Unlock the session for the active account (inline wallet only). */
  unlock: () => Promise<void>;
  /** Explicitly lock the session. */
  lock: () => void;
}

export function useRoomSession(): UseRoomSessionResult {
  const { activeAccount } = useAccount();
  const isUnlocked = useSyncExternalStore(
    subscribeRoomSession,
    () => roomKeySession.isUnlocked,
    () => false,
  );
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const unlock = useCallback(async () => {
    if (!activeAccount) {
      setError(new Error('Connect an account to unlock chat.'));
      return;
    }
    setIsUnlocking(true);
    setError(null);
    try {
      await unlockRoomSession(activeAccount);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to unlock chat.'));
    } finally {
      setIsUnlocking(false);
    }
  }, [activeAccount]);

  const lock = useCallback(() => lockRoomSession(), []);

  return {
    identity: isUnlocked ? roomRevocableIdentity : null,
    pubkey: isUnlocked ? roomKeySession.keys?.publicKey ?? null : null,
    isUnlocked,
    isUnlocking,
    error,
    unlock,
    lock,
  };
}
