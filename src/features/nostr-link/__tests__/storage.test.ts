import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import {
  wasDismissedRecently, markDismissed, clearDismissal, rememberNostrSubmission, readNostrSubmission,
} from '../storage';

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

describe('public submission receipts', () => {
  it('retains the original submission time while waiting for the account index', () => {
    vi.useFakeTimers();
    const submittedAt = Date.now();
    rememberNostrSubmission('api-a', A, 'npub1test', 'th_test');
    vi.advanceTimersByTime(14 * 60_000);
    expect(readNostrSubmission('api-a', A)).toEqual({ npub: 'npub1test', txHash: 'th_test', submittedAt });
    vi.advanceTimersByTime(60_000);
    expect(readNostrSubmission('api-a', A)?.submittedAt).toBe(submittedAt);
  });

  it('cannot cross accounts or API networks', () => {
    rememberNostrSubmission('api-a', A, 'npub1test', 'th_test');
    expect(readNostrSubmission('api-a', B)).toBeNull();
    expect(readNostrSubmission('api-b', A)).toBeNull();
  });

  it('ignores malformed receipts and timestamps in the future', () => {
    localStorage.setItem('nostr_link_submitted:api-a:ak_first', '{bad json');
    expect(readNostrSubmission('api-a', A)).toBeNull();
    vi.useFakeTimers();
    rememberNostrSubmission('api-a', A, 'npub1test', 'th_test');
    vi.setSystemTime(Date.now() - 1);
    expect(readNostrSubmission('api-a', A)).toBeNull();
  });

  it('does not require browser storage to be available', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readNostrSubmission('api-a', A)).toBeNull();
    read.mockRestore();
  });
});
