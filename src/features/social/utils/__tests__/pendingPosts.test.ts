import { QueryClient } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  PENDING_TRANSACTIONS_STORAGE_KEY,
  PENDING_TRANSACTION_POLL_MS,
  clearPendingTransactions,
  listPendingTransactions,
  onPendingTransactionSettled,
} from '@/features/pending-transactions/store';
import {
  refreshAfterPostSettled,
  trackPublishedPost,
  trackPublishedReply,
  watchPendingPosts,
} from '../pendingPosts';

const mockGetById = vi.fn();

vi.mock('@/api/generated', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PostsService: { ...actual.PostsService, getById: (...args: any[]) => mockGetById(...args) },
  };
});

const LATEST = ['posts', {
  limit: 10, sortBy: 'latest', search: '', filterBy: 'all',
}];

const page = (items: unknown[]) => ({
  pages: [{ items, meta: { currentPage: 1, totalPages: 1 } }],
  pageParams: [1],
});

const mine = {
  id: '42_v3', content: '#nancy gm', sender_address: 'ak_author', tx_hash: 'th_mined',
};

// What a previous page load left behind.
const leftPending = (entries: unknown[]) => {
  window.localStorage.setItem(PENDING_TRANSACTIONS_STORAGE_KEY, JSON.stringify(entries));
};

describe('pending posts', () => {
  let queryClient: QueryClient;
  let stop: () => void;

  beforeEach(() => {
    clearPendingTransactions();
    mockGetById.mockRejectedValue(new Error('Not found'));
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    stop?.();
    clearPendingTransactions();
    vi.useRealTimers();
  });

  it('after a reload, puts a post the backend does not have yet back on top of the feed', async () => {
    leftPending([{
      kind: 'create_post',
      account: 'ak_author',
      txHash: 'th_mined',
      startedAt: Date.now() - 30_000,
      step: 'confirmed',
      meta: { postId: '42_v3', post: JSON.stringify(mine), topic: '#nancy' },
    }]);
    stop = watchPendingPosts(queryClient);

    await queryClient.fetchQuery({ queryKey: LATEST, queryFn: async () => page([{ id: 'older_v3' }]) });
    expect(queryClient.getQueryData<any>(LATEST).pages[0].items.map((p: any) => p.id))
      .toEqual(['42_v3', 'older_v3']);

    await queryClient.fetchQuery({
      queryKey: ['topic-by-name', '#nancy'],
      queryFn: async () => ({ posts: [{ id: 'older_v3' }], post_count: 1 }),
    });
    expect(queryClient.getQueryData<any>(['topic-by-name', '#nancy'])).toEqual({
      posts: [expect.objectContaining({ id: '42_v3' }), { id: 'older_v3' }],
      post_count: 2,
    });
    // Other hashtags are left alone.
    await queryClient.fetchQuery({
      queryKey: ['topic-by-name', '#other'],
      queryFn: async () => ({ posts: [], post_count: 0 }),
    });
    expect(queryClient.getQueryData<any>(['topic-by-name', '#other']).posts).toEqual([]);
  });

  it('adds nothing once the backend serves the post itself', async () => {
    trackPublishedPost({ account: 'ak_author', txHash: 'th_mined', post: mine });
    stop = watchPendingPosts(queryClient);

    await queryClient.fetchQuery({
      queryKey: LATEST,
      queryFn: async () => page([{ ...mine, content: 'from the backend' }, { id: 'older_v3' }]),
    });
    expect(queryClient.getQueryData<any>(LATEST).pages[0].items).toEqual([
      expect.objectContaining({ id: '42_v3', content: 'from the backend' }),
      { id: 'older_v3' },
    ]);
  });

  it('keeps a post out of feeds filtered to a language the backend has not given it', async () => {
    trackPublishedPost({ account: 'ak_author', txHash: 'th_mined', post: mine });
    stop = watchPendingPosts(queryClient);
    const english = ['posts', { sortBy: 'latest', language: 'en' }];

    await queryClient.fetchQuery({ queryKey: english, queryFn: async () => page([]) });
    expect(queryClient.getQueryData<any>(english).pages[0].items).toEqual([]);
  });

  it('puts a pending reply back at the end of its thread, and only its own', async () => {
    trackPublishedReply({
      account: 'ak_author', txHash: 'th_reply', parentId: '7', reply: { id: '43_v3', content: 'nice' },
    });
    stop = watchPendingPosts(queryClient);

    await queryClient.fetchQuery({
      queryKey: ['comment-replies', '7_v3'],
      queryFn: async () => [{ id: 'first_v3' }],
    });
    expect(queryClient.getQueryData<any>(['comment-replies', '7_v3']).map((p: any) => p.id))
      .toEqual(['first_v3', '43_v3']);

    await queryClient.fetchQuery({
      queryKey: ['post-comments', '7', 'infinite'],
      queryFn: async () => page([{ id: 'first_v3' }]),
    });
    expect(queryClient.getQueryData<any>(['post-comments', '7', 'infinite']).pages[0].items.map((p: any) => p.id))
      .toEqual(['first_v3', '43_v3']);

    await queryClient.fetchQuery({ queryKey: ['comment-replies', '8_v3'], queryFn: async () => [] });
    expect(queryClient.getQueryData<any>(['comment-replies', '8_v3'])).toEqual([]);
  });

  it('is done once the backend serves it', async () => {
    const settled = vi.fn();
    const unsubscribe = onPendingTransactionSettled(settled);
    trackPublishedPost({ account: 'ak_author', txHash: 'th_mined', post: mine });
    await vi.advanceTimersByTimeAsync(0);
    expect(listPendingTransactions({ kind: 'create_post' })).toHaveLength(1);

    mockGetById.mockResolvedValue(mine);
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);

    expect(mockGetById).toHaveBeenCalledWith({ id: '42_v3' });
    expect(listPendingTransactions({ kind: 'create_post' })).toEqual([]);
    expect(settled).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'settled' }));
    unsubscribe();
  });

  it('then refetches the feeds, or the thread and its parent for a reply', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const post = trackPublishedPost({
      account: 'ak_author', txHash: 'th_mined', post: mine, topic: '#Nancy',
    });
    refreshAfterPostSettled(queryClient, post);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['posts'], exact: false });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['topic-by-name', '#nancy'] });

    queryClient.setQueryData(['comment-replies', '7'], []);
    queryClient.setQueryData(['comment-replies', '8_v3'], []);
    queryClient.setQueryData(['post', '7_v3'], {});
    const reply = trackPublishedReply({
      account: 'ak_author', txHash: 'th_reply', parentId: '7_v3', reply: { id: '43_v3' },
    });
    const stale = () => queryClient.getQueryCache().getAll()
      .filter((query) => query.state.isInvalidated)
      .map((query) => JSON.stringify(query.queryKey));
    refreshAfterPostSettled(queryClient, reply);
    expect(stale()).toEqual(expect.arrayContaining(['["comment-replies","7"]', '["post","7_v3"]']));
    expect(stale()).not.toContain('["comment-replies","8_v3"]');
  });
});
