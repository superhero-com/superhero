import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  CONFIRMED_X_LINK_TTL_MS,
  X_LINK_CHANGES_STORAGE_KEY,
  X_LINK_CHANGE_POLL_MS,
  X_LINK_CHANGE_TIMEOUT_MS,
  clearConfirmedXLinks,
  effectiveXLink,
  onXLinkChangeSettled,
  pendingXLinkChange,
  rememberConfirmedXLink,
  resolveXLink,
  subscribeXLinkChanges,
  trackXLinkChange,
} from '../confirmedXLink';

const ADDRESS = 'ak_owner';

describe('confirmed X link changes', () => {
  beforeEach(() => {
    clearConfirmedXLinks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearConfirmedXLinks();
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

  describe('tracking a change until the API has it', () => {
    // Lets the tracker's async check finish inside fake time.
    const tick = async (ms: number) => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };

    it('keeps an unlink pending while the API still shows the handle, mined or not', async () => {
      // The chain has the unlink within seconds; the backend's account record,
      // which every screen reads, only minutes later. Pending means the latter.
      const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink', username: '@UntraceNetwork' }, { readLinkedUsername });

      await tick(X_LINK_CHANGE_POLL_MS * 20);

      expect(pendingXLinkChange(ADDRESS)).toMatchObject({
        kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork',
      });
      expect(readLinkedUsername).toHaveBeenCalledWith(ADDRESS);
    });

    it('settles an unlink once the API drops the handle', async () => {
      const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
      const settled = vi.fn();
      const unsubscribe = onXLinkChangeSettled(settled);
      const change = trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork' }, { readLinkedUsername });
      await tick(0);
      expect(settled).not.toHaveBeenCalled();

      readLinkedUsername.mockResolvedValue(null);
      await tick(X_LINK_CHANGE_POLL_MS);

      expect(pendingXLinkChange(ADDRESS)).toBeNull();
      expect(settled).toHaveBeenCalledTimes(1);
      expect(settled).toHaveBeenCalledWith({
        address: ADDRESS, change, outcome: 'settled', username: null,
      });
      // A reopened editor whose load read the account a moment earlier still
      // shows it unlinked.
      expect(resolveXLink(ADDRESS, 'untracenetwork')).toBeNull();
      unsubscribe();
    });

    it('settles a link once the API shows a handle', async () => {
      const readLinkedUsername = vi.fn().mockResolvedValue(null);
      const settled = vi.fn();
      const unsubscribe = onXLinkChangeSettled(settled);
      trackXLinkChange(ADDRESS, { kind: 'link', txHash: 'th_link' }, { readLinkedUsername });
      await tick(X_LINK_CHANGE_POLL_MS);
      expect(pendingXLinkChange(ADDRESS)).toMatchObject({ kind: 'link', username: null });

      readLinkedUsername.mockResolvedValue('superherocom');
      await tick(X_LINK_CHANGE_POLL_MS);

      expect(pendingXLinkChange(ADDRESS)).toBeNull();
      expect(settled).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'settled', username: 'superherocom' }));
      unsubscribe();
    });

    it('stops asking once settled', async () => {
      const readLinkedUsername = vi.fn().mockResolvedValue(null);
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink' }, { readLinkedUsername });
      await tick(0);
      const calls = readLinkedUsername.mock.calls.length;

      await tick(X_LINK_CHANGE_POLL_MS * 5);
      expect(readLinkedUsername).toHaveBeenCalledTimes(calls);
    });

    it('keeps asking through a failed read', async () => {
      const readLinkedUsername = vi.fn()
        .mockRejectedValueOnce(new Error('API down'))
        .mockResolvedValue(null);
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink' }, { readLinkedUsername });
      await tick(0);
      expect(pendingXLinkChange(ADDRESS)).not.toBeNull();

      await tick(X_LINK_CHANGE_POLL_MS);
      expect(pendingXLinkChange(ADDRESS)).toBeNull();
    });

    it('gives up once the wait is far past anything expected', async () => {
      const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
      const settled = vi.fn();
      const unsubscribe = onXLinkChangeSettled(settled);
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_dropped' }, { readLinkedUsername });

      await tick(X_LINK_CHANGE_TIMEOUT_MS + X_LINK_CHANGE_POLL_MS);

      expect(pendingXLinkChange(ADDRESS)).toBeNull();
      expect(settled).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'timed_out' }));
      // Nothing settled, so the account shows as the API says.
      expect(resolveXLink(ADDRESS, 'untracenetwork')).toBe('untracenetwork');
      unsubscribe();
    });

    it('lets a newer change replace an older one for the same wallet', async () => {
      const first = vi.fn().mockResolvedValue('untracenetwork');
      const second = vi.fn().mockResolvedValue('untracenetwork');
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_one' }, { readLinkedUsername: first });
      await tick(0);
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_two' }, { readLinkedUsername: second });
      await tick(0);
      const firstCalls = first.mock.calls.length;

      await tick(X_LINK_CHANGE_POLL_MS * 3);
      expect(first).toHaveBeenCalledTimes(firstCalls);
      expect(pendingXLinkChange(ADDRESS)?.txHash).toBe('th_two');
    });

    it('ends when a final state is recorded directly', async () => {
      const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink' }, { readLinkedUsername });
      await tick(0);

      rememberConfirmedXLink(ADDRESS, null);

      expect(pendingXLinkChange(ADDRESS)).toBeNull();
      expect(window.localStorage.getItem(X_LINK_CHANGES_STORAGE_KEY)).toBeNull();
    });

    it('tells subscribers when it starts and when it settles', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeXLinkChanges(listener);
      const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink' }, { readLinkedUsername });
      expect(listener).toHaveBeenCalledTimes(1);
      await tick(0); // the first check, answered "not yet"

      readLinkedUsername.mockResolvedValue(null);
      await tick(X_LINK_CHANGE_POLL_MS);
      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
    });
  });

  describe('across a reload', () => {
    const tick = async (ms: number) => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    };

    // A fresh copy of the module: what the next page load starts from, with
    // only localStorage carried over.
    const reload = async () => {
      vi.resetModules();
      return import('../confirmedXLink');
    };

    afterEach(async () => {
      (await import('../confirmedXLink')).clearConfirmedXLinks();
    });

    it('is still pending after a reload, and resumes waiting on the API', async () => {
      trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork' }, {
        readLinkedUsername: vi.fn().mockResolvedValue('untracenetwork'),
      });
      await tick(0);
      const { startedAt } = pendingXLinkChange(ADDRESS)!;

      const next = await reload();
      expect(next.pendingXLinkChange(ADDRESS)).toEqual({
        kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork', startedAt,
      });

      const readLinkedUsername = vi.fn().mockResolvedValue(null);
      next.resumeXLinkChanges({ readLinkedUsername });
      await tick(0);
      expect(readLinkedUsername).toHaveBeenCalledWith(ADDRESS);
      expect(next.pendingXLinkChange(ADDRESS)).toBeNull();
      expect(window.localStorage.getItem(next.X_LINK_CHANGES_STORAGE_KEY)).toBeNull();
    });

    it('does not start a second poll for a change already being watched', async () => {
      const next = await reload();
      const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
      next.trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink' }, { readLinkedUsername });
      await tick(0);
      next.resumeXLinkChanges({ readLinkedUsername });
      await tick(0);

      readLinkedUsername.mockClear();
      await tick(X_LINK_CHANGE_POLL_MS);
      expect(readLinkedUsername).toHaveBeenCalledTimes(1);
    });

    it('drops a change older than the give-up point instead of resuming it', async () => {
      window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
        [ADDRESS]: {
          kind: 'unlink', txHash: 'th_old', username: null, startedAt: Date.now() - X_LINK_CHANGE_TIMEOUT_MS - 1,
        },
      }));
      const next = await reload();

      expect(next.pendingXLinkChange(ADDRESS)).toBeNull();
      expect(window.localStorage.getItem(X_LINK_CHANGES_STORAGE_KEY)).toBeNull();
    });

    it('ignores storage it cannot read', async () => {
      window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, '{not json');
      let next = await reload();
      expect(next.pendingXLinkChange(ADDRESS)).toBeNull();

      window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
        [ADDRESS]: { kind: 'relink', txHash: 5, startedAt: 'yesterday' },
      }));
      next = await reload();
      expect(next.pendingXLinkChange(ADDRESS)).toBeNull();
    });
  });
});
