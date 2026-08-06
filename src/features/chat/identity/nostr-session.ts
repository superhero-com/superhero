/**
 * Nostr key session — the in-memory custody cache for the derived nostr key
 * (the chat-key exception).
 *
 * Holds the seed-derived `UserKeys` for one chat session and NOTHING else — no
 * mnemonic, no AE spending key, no DEK. The key is cached in memory ONLY (never
 * localStorage / sessionStorage / IndexedDB) and is cleared on:
 *   - explicit `lock()` (user locks, or the app tears the session down);
 *   - tab / context teardown (`bindNostrSessionTeardown` → `pagehide`);
 *   - `idleTimeoutMs` with no `touch()` — default 30 minutes. The Security
 *     Reviewer may TIGHTEN this, not loosen it.
 *
 * This controller is framework-agnostic and unit-tested with fake timers. A
 * later stage wires it to `userKeysAtom` (see `./nostr.state`) via `onLock` /
 * the setter, and calls `touch()` on chat activity.
 */
import type { UserKeys } from '../core/types';
import type { NostrIdentityProvider } from './nostr-identity';
import { createDerivedNostrIdentity } from './derived-identity';

/** Default idle window before the cached nostr key is dropped. */
export const DEFAULT_NOSTR_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export type NostrSessionLockReason = 'idle' | 'explicit' | 'teardown';

export interface NostrKeySessionOptions {
  /** Idle window in ms before auto-lock. Defaults to 30 minutes. */
  idleTimeoutMs?: number;
  /** Fired every time the key is cleared (idle / explicit / teardown). */
  onLock?: (reason: NostrSessionLockReason) => void;
}

export class NostrKeySession {
  #keys: UserKeys | null = null;

  #timer: ReturnType<typeof setTimeout> | null = null;

  readonly #idleTimeoutMs: number;

  readonly #onLock?: (reason: NostrSessionLockReason) => void;

  constructor(options: NostrKeySessionOptions = {}) {
    this.#idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_NOSTR_IDLE_TIMEOUT_MS;
    this.#onLock = options.onLock;
  }

  /** Cache the derived key for this session and arm the idle timer. */
  unlock(keys: UserKeys): void {
    this.#keys = keys;
    this.#arm();
  }

  /** The cached key, or null when locked. */
  get keys(): UserKeys | null {
    return this.#keys;
  }

  get isUnlocked(): boolean {
    return this.#keys !== null;
  }

  /** Build a NostrIdentityProvider over the cached key, or null when locked. */
  identity(): NostrIdentityProvider | null {
    return this.#keys ? createDerivedNostrIdentity(this.#keys) : null;
  }

  /** Reset the idle timer on chat activity. No-op while locked. */
  touch(): void {
    if (this.#keys) this.#arm();
  }

  /** Drop the cached key and fire `onLock`. Idempotent. */
  lock(reason: NostrSessionLockReason = 'explicit'): void {
    this.#clearTimer();
    if (this.#keys === null) return;
    this.#keys = null;
    this.#onLock?.(reason);
  }

  /** Teardown alias — clears the key and the timer. */
  dispose(): void {
    this.lock('teardown');
  }

  #arm(): void {
    this.#clearTimer();
    this.#timer = setTimeout(() => {
      this.lock('idle');
    }, this.#idleTimeoutMs);
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}

/** The minimal event-target surface `bindNostrSessionTeardown` needs. */
export interface PageLifecycleTarget {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

/**
 * Clear the session on tab/context teardown. Adds a `pagehide` listener (fires
 * on tab close, navigation, and bfcache stash) and returns an unbind function.
 * Belt-and-suspenders over the fact that memory is dropped on real teardown
 * anyway — this makes the clear explicit and observable.
 */
export function bindNostrSessionTeardown(
  session: NostrKeySession,
  target: PageLifecycleTarget = window,
): () => void {
  const onPageHide = () => session.dispose();
  target.addEventListener('pagehide', onPageHide);
  return () => target.removeEventListener('pagehide', onPageHide);
}
