import {
  describe, expect, it, vi, beforeEach, afterEach,
} from 'vitest';
import { NostrKeySession, bindNostrSessionTeardown, DEFAULT_NOSTR_IDLE_TIMEOUT_MS } from '../identity/nostr-session';
import type { UserKeys } from '../core/types';

const KEYS: UserKeys = {
  privateKey: 'aa'.repeat(32),
  publicKey: 'bb'.repeat(32),
  npub: 'npub1test',
  nsec: 'nsec1test',
};

describe('NostrKeySession — memory-only custody cache', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds the key after unlock and reports unlocked', () => {
    const session = new NostrKeySession();
    expect(session.isUnlocked).toBe(false);
    session.unlock(KEYS);
    expect(session.isUnlocked).toBe(true);
    expect(session.keys).toEqual(KEYS);
  });

  it('auto-locks after the idle timeout and fires onLock(idle)', () => {
    const onLock = vi.fn();
    const session = new NostrKeySession({ idleTimeoutMs: 1000, onLock });
    session.unlock(KEYS);
    vi.advanceTimersByTime(999);
    expect(session.isUnlocked).toBe(true);
    vi.advanceTimersByTime(1);
    expect(session.isUnlocked).toBe(false);
    expect(session.keys).toBeNull();
    expect(onLock).toHaveBeenCalledWith('idle');
  });

  it('touch() resets the idle timer', () => {
    const session = new NostrKeySession({ idleTimeoutMs: 1000 });
    session.unlock(KEYS);
    vi.advanceTimersByTime(800);
    session.touch();
    vi.advanceTimersByTime(800); // 1600 total, but only 800 since touch
    expect(session.isUnlocked).toBe(true);
    vi.advanceTimersByTime(200);
    expect(session.isUnlocked).toBe(false);
  });

  it('explicit lock() clears the key and fires onLock(explicit) once', () => {
    const onLock = vi.fn();
    const session = new NostrKeySession({ onLock });
    session.unlock(KEYS);
    session.lock();
    session.lock(); // idempotent — no second fire
    expect(session.isUnlocked).toBe(false);
    expect(onLock).toHaveBeenCalledTimes(1);
    expect(onLock).toHaveBeenCalledWith('explicit');
  });

  it('touch() while locked does not resurrect a key or arm a timer', () => {
    const onLock = vi.fn();
    const session = new NostrKeySession({ idleTimeoutMs: 1000, onLock });
    session.touch();
    vi.advanceTimersByTime(5000);
    expect(session.isUnlocked).toBe(false);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('identity() returns a provider only while unlocked', () => {
    const session = new NostrKeySession();
    expect(session.identity()).toBeNull();
    session.unlock(KEYS);
    expect(session.identity()).not.toBeNull();
    session.lock();
    expect(session.identity()).toBeNull();
  });

  it('defaults the idle window to 30 minutes', () => {
    expect(DEFAULT_NOSTR_IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
    const session = new NostrKeySession();
    session.unlock(KEYS);
    vi.advanceTimersByTime(DEFAULT_NOSTR_IDLE_TIMEOUT_MS - 1);
    expect(session.isUnlocked).toBe(true);
    vi.advanceTimersByTime(1);
    expect(session.isUnlocked).toBe(false);
  });

  it('bindNostrSessionTeardown clears on pagehide and unbinds cleanly', () => {
    const session = new NostrKeySession();
    session.unlock(KEYS);
    const listeners: Record<string, () => void> = {};
    const target = {
      addEventListener: (type: string, cb: () => void) => { listeners[type] = cb; },
      removeEventListener: (type: string) => { delete listeners[type]; },
    };
    const unbind = bindNostrSessionTeardown(session, target);
    listeners.pagehide();
    expect(session.isUnlocked).toBe(false);
    unbind();
    expect(listeners.pagehide).toBeUndefined();
  });
});
