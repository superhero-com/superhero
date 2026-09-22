import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  CONFIRMED_X_LINK_TTL_MS,
  clearConfirmedXLinks,
  rememberConfirmedXLink,
  resolveXLink,
} from '../confirmedXLink';

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
});
