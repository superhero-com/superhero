import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { wasDismissedRecently, markDismissed, clearDismissal } from '../storage';

const A = 'ak_first';
const B = 'ak_second';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('nostr-link dismissal cooldown (per-account, localStorage)', () => {
  it('is not dismissed when nothing is stored', () => {
    expect(wasDismissedRecently(A)).toBe(false);
  });

  it('marks and reads a recent dismissal for one account', () => {
    markDismissed(A);
    expect(wasDismissedRecently(A)).toBe(true);
  });

  it('does NOT leak a dismissal across accounts', () => {
    // The gate QA/Delivery-Lead flagged: dismissing on A must not silence B.
    markDismissed(A);
    expect(wasDismissedRecently(A)).toBe(true);
    expect(wasDismissedRecently(B)).toBe(false);
  });

  it('expires after 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markDismissed(A);
    expect(wasDismissedRecently(A)).toBe(true);

    vi.setSystemTime(new Date('2026-01-02T00:00:01Z')); // +24h1s
    expect(wasDismissedRecently(A)).toBe(false);
  });

  it('clearDismissal removes only that account’s flag', () => {
    markDismissed(A);
    markDismissed(B);
    clearDismissal(A);
    expect(wasDismissedRecently(A)).toBe(false);
    expect(wasDismissedRecently(B)).toBe(true);
  });
});
