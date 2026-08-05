import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { wasDismissedRecently, markDismissed, clearDismissal } from '../storage';

const KEY = 'nostr_link_dismissed_at';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('nostr-link dismissal cooldown (localStorage)', () => {
  it('is not dismissed when nothing is stored', () => {
    expect(wasDismissedRecently()).toBe(false);
  });

  it('marks and reads a recent dismissal', () => {
    markDismissed();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(wasDismissedRecently()).toBe(true);
  });

  it('expires after 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markDismissed();
    expect(wasDismissedRecently()).toBe(true);

    vi.setSystemTime(new Date('2026-01-02T00:00:01Z')); // +24h1s
    expect(wasDismissedRecently()).toBe(false);
  });

  it('clearDismissal removes the flag', () => {
    markDismissed();
    clearDismissal();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(wasDismissedRecently()).toBe(false);
  });
});
