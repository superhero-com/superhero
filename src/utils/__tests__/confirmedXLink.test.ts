import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  CONFIRMED_X_LINK_TTL_MS,
  X_UNLINK_POLL_MS,
  X_UNLINK_TRACK_TIMEOUT_MS,
  clearConfirmedXLinks,
  effectiveXLink,
  pendingXUnlink,
  rememberConfirmedXLink,
  resolveXLink,
  subscribeXLinkChanges,
  trackXUnlink,
} from '../confirmedXLink';

vi.mock('@/utils/apiRead', () => ({ isTransactionMined: vi.fn().mockResolvedValue(false) }));

const ADDRESS = 'ak_owner';

describe('confirmed X link changes', () => {
  beforeEach(() => {
    clearConfirmedXLinks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes the API answer through when nothing was confirmed', () => {
    expect(resolveXLink(ADDRESS, 'someone')).toBe('someone');
    expect(resolveXLink(ADDRESS, null)).toBeNull();
  });

  it('keeps a confirmed unlink while the API still lists the handle', () => {
    rememberConfirmedXLink(ADDRESS, null);
    expect(resolveXLink(ADDRESS, 'untracenetwork')).toBeNull();
    // Still holding on the next read too: the indexer can take a while.
    expect(resolveXLink(ADDRESS, 'untracenetwork')).toBeNull();
  });

  it('lets go as soon as the API agrees, so later changes show normally', () => {
    rememberConfirmedXLink(ADDRESS, null);
    expect(resolveXLink(ADDRESS, null)).toBeNull();
    // A fresh link made later is shown, not masked by the old unlink.
    expect(resolveXLink(ADDRESS, 'relinked')).toBe('relinked');
  });

  it('gives way to the API once the note is old', () => {
    rememberConfirmedXLink(ADDRESS, null);
    vi.advanceTimersByTime(CONFIRMED_X_LINK_TTL_MS + 1);
    expect(resolveXLink(ADDRESS, 'untracenetwork')).toBe('untracenetwork');
  });

  it('is per wallet', () => {
    rememberConfirmedXLink(ADDRESS, null);
    expect(resolveXLink('ak_other', 'someone')).toBe('someone');
  });

  it('treats @Handle and handle as the same account', () => {
    rememberConfirmedXLink(ADDRESS, '@SomeOne');
    expect(resolveXLink(ADDRESS, 'someone')).toBe('someone');
    expect(resolveXLink(ADDRESS, 'old_handle')).toBe('old_handle');
  });

  describe('what the editor renders', () => {
    const linked = { linked: true, username: 'untracenetwork' };
    const unlinked = { linked: false, username: null };

    it('shows what was loaded when nothing was confirmed', () => {
      expect(effectiveXLink(ADDRESS, linked)).toEqual(linked);
      expect(effectiveXLink(ADDRESS, unlinked)).toEqual(unlinked);
    });

    it('keeps a confirmed unlink even when a stale load lands after it', () => {
      // The editor's load() read "linked" before the unlink confirmed, then
      // finished its other requests and wrote that stale value last.
      rememberConfirmedXLink(ADDRESS, null);
      expect(effectiveXLink(ADDRESS, linked)).toEqual(unlinked);
    });

    it('never clears the note on local state alone', () => {
      rememberConfirmedXLink(ADDRESS, null);
      // The row flipped local state to unlinked: that must not count as the
      // API agreeing, or a stale "linked" written next would show again.
      expect(effectiveXLink(ADDRESS, unlinked)).toEqual(unlinked);
      expect(effectiveXLink(ADDRESS, linked)).toEqual(unlinked);
    });

    it('goes back to what was loaded once the API has agreed', () => {
      rememberConfirmedXLink(ADDRESS, null);
      resolveXLink(ADDRESS, null);
      expect(effectiveXLink(ADDRESS, linked)).toEqual(linked);
    });

    it('goes back to what was loaded once the note is old', () => {
      rememberConfirmedXLink(ADDRESS, null);
      vi.advanceTimersByTime(CONFIRMED_X_LINK_TTL_MS + 1);
      expect(effectiveXLink(ADDRESS, linked)).toEqual(linked);
    });
  });

  describe('tracking an unlink until it is mined', () => {
    // Lets the tracker's async check finish inside fake time.
    const tick = async (ms: number) => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
      await Promise.resolve();
    };

    it('shows it as on its way, then records it once mined', async () => {
      const isMined = vi.fn().mockResolvedValue(false);
      const onConfirmed = vi.fn();
      trackXUnlink(ADDRESS, 'th_unlink', { isMined, onConfirmed });

      expect(pendingXUnlink(ADDRESS)).toBe('th_unlink');
      await tick(X_UNLINK_POLL_MS);
      expect(onConfirmed).not.toHaveBeenCalled();

      isMined.mockResolvedValue(true);
      await tick(X_UNLINK_POLL_MS);

      expect(onConfirmed).toHaveBeenCalledTimes(1);
      expect(pendingXUnlink(ADDRESS)).toBeNull();
      expect(resolveXLink(ADDRESS, 'untracenetwork')).toBeNull();
    });

    it('stops asking once settled', async () => {
      const isMined = vi.fn().mockResolvedValue(true);
      trackXUnlink(ADDRESS, 'th_unlink', { isMined });
      await tick(0);
      const calls = isMined.mock.calls.length;

      await tick(X_UNLINK_POLL_MS * 5);
      expect(isMined).toHaveBeenCalledTimes(calls);
    });

    it('keeps asking through a failed read', async () => {
      const isMined = vi.fn()
        .mockRejectedValueOnce(new Error('node down'))
        .mockResolvedValue(true);
      const onConfirmed = vi.fn();
      trackXUnlink(ADDRESS, 'th_unlink', { isMined, onConfirmed });
      await tick(0);
      expect(onConfirmed).not.toHaveBeenCalled();

      await tick(X_UNLINK_POLL_MS);
      expect(onConfirmed).toHaveBeenCalledTimes(1);
    });

    it('gives up on a transaction that never lands', async () => {
      const isMined = vi.fn().mockResolvedValue(false);
      const onConfirmed = vi.fn();
      trackXUnlink(ADDRESS, 'th_dropped', { isMined, onConfirmed });

      await tick(X_UNLINK_TRACK_TIMEOUT_MS + X_UNLINK_POLL_MS);

      expect(pendingXUnlink(ADDRESS)).toBeNull();
      expect(onConfirmed).not.toHaveBeenCalled();
      // Nothing was confirmed, so the account shows as the API says.
      expect(resolveXLink(ADDRESS, 'untracenetwork')).toBe('untracenetwork');
    });

    it('tells subscribers when it starts and when it settles', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeXLinkChanges(listener);
      const isMined = vi.fn().mockResolvedValue(false);
      trackXUnlink(ADDRESS, 'th_unlink', { isMined });
      expect(listener).toHaveBeenCalledTimes(1);
      await tick(0); // the first check, answered "not yet"

      isMined.mockResolvedValue(true);
      await tick(X_UNLINK_POLL_MS);
      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
    });
  });
});
