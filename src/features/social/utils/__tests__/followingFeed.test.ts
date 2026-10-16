import {
  describe, expect, it, vi,
} from 'vitest';
import {
  createFollowingFeedState,
  takeFollowingFeedPage,
  type FollowingFeedPost,
} from '../followingFeed';

type Post = FollowingFeedPost & { author: string };

// Builds a fake per-account posts API: each account has posts newest-first,
// served in pages of `perPage`.
function fakeApi(byAccount: Record<string, number[]>, perPage = 2) {
  const fetchPage = vi.fn(async (address: string, page: number) => {
    const all = (byAccount[address] || []).map((minute) => ({
      id: `${address}-${minute}`,
      author: address,
      created_at: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
    }));
    const items = all.slice((page - 1) * perPage, page * perPage);
    return { items, hasMore: page * perPage < all.length };
  });
  return fetchPage;
}

const ids = (posts: Post[]) => posts.map((p) => p.id);

describe('followingFeed k-way merge', () => {
  it('merges accounts newest first across pages and stops when drained', async () => {
    const fetchPage = fakeApi({ a: [50, 30, 10], b: [40, 20], c: [45] });
    const state = createFollowingFeedState<Post>(['a', 'b', 'c']);

    const first = await takeFollowingFeedPage<Post>(state, fetchPage, { pageSize: 3 });
    expect(ids(first.items)).toEqual(['a-50', 'c-45', 'b-40']);
    expect(first.nextState).toBeDefined();

    const second = await takeFollowingFeedPage<Post>(first.nextState!, fetchPage, { pageSize: 3 });
    expect(ids(second.items)).toEqual(['a-30', 'b-20', 'a-10']);
    expect(second.nextState).toBeUndefined();
  });

  it('fetches each account lazily, only when its buffer runs dry', async () => {
    const fetchPage = fakeApi({ a: [9, 8, 7, 6], b: [1] }, 2);
    const first = await takeFollowingFeedPage<Post>(
      createFollowingFeedState<Post>(['a', 'b']),
      fetchPage,
      { pageSize: 2 },
    );
    expect(ids(first.items)).toEqual(['a-9', 'a-8']);
    // One initial page each; a's second page is only needed for the next feed page.
    expect(fetchPage).toHaveBeenCalledTimes(2);
    await takeFollowingFeedPage<Post>(first.nextState!, fetchPage, { pageSize: 1 });
    expect(fetchPage).toHaveBeenCalledWith('a', 2);
  });

  it('does not mutate the input state', async () => {
    const fetchPage = fakeApi({ a: [3, 2, 1] });
    const state = createFollowingFeedState<Post>(['a']);
    const snapshot = JSON.stringify(state);
    await takeFollowingFeedPage<Post>(state, fetchPage, { pageSize: 2 });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('caps parallel requests at the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchPage = vi.fn(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => { setTimeout(r, 1); });
      inFlight -= 1;
      return { items: [], hasMore: false };
    });
    const addresses = Array.from({ length: 20 }, (_, i) => `ak_${i}`);
    const page = await takeFollowingFeedPage<Post>(
      createFollowingFeedState<Post>(addresses),
      fetchPage,
      { concurrency: 6 },
    );
    expect(fetchPage).toHaveBeenCalledTimes(20);
    expect(peak).toBeLessThanOrEqual(6);
    expect(page.items).toEqual([]);
    expect(page.nextState).toBeUndefined();
  });

  it('dedupes addresses and repeated posts', async () => {
    const shared = { id: 'same', author: 'a', created_at: '2026-10-01T00:05:00Z' };
    const fetchPage = vi.fn(async () => ({ items: [shared], hasMore: false }));
    const state = createFollowingFeedState<Post>(['a', 'a', 'b']);
    expect(state.streams).toHaveLength(2);
    const page = await takeFollowingFeedPage<Post>(state, fetchPage);
    expect(ids(page.items)).toEqual(['same']);
  });

  it('skips a failing account but throws when every account fails', async () => {
    const partial = vi.fn(async (address: string) => {
      if (address === 'bad') throw new Error('boom');
      return { items: [{ id: 'ok', author: address, created_at: '2026-10-01T00:00:00Z' }], hasMore: false };
    });
    const page = await takeFollowingFeedPage<Post>(createFollowingFeedState<Post>(['bad', 'good']), partial);
    expect(ids(page.items)).toEqual(['ok']);

    const allBad = vi.fn(async () => { throw new Error('down'); });
    await expect(
      takeFollowingFeedPage<Post>(createFollowingFeedState<Post>(['x', 'y']), allBad),
    ).rejects.toThrow('down');
  });
});
