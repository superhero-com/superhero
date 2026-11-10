import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '@/api/backend';
import { useFollowingFeed } from '../useFollowingFeed';

vi.mock('@/api/backend', () => ({ SuperheroApi: { listPosts: vi.fn() } }));
vi.mock('@/api/socialGraphConnections', () => ({
  SocialGraphConnectionsService: { listSocialGraphFollowing: vi.fn() },
}));

function renderFollowingFeed(enabled: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useFollowingFeed('ak_viewer', undefined, enabled), { wrapper });
}

// Query notifies React on a timer, so an assertion that something did NOT change waits for it.
const nextTimer = () => new Promise((resolve) => { setTimeout(resolve, 0); });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(SuperheroApi.listPosts).mockResolvedValue({
    items: [{ id: 'p1', created_at: '2026-10-01T10:00:00Z' }],
    meta: { currentPage: 1, totalPages: 1 },
  } as any);
});

// FeedList memoizes its other feeds on these values, so a fresh identity per
// render would recompute Popular and Latest even while Following is unused.
describe('useFollowingFeed', () => {
  it('keeps stable values across renders while disabled', () => {
    const { result, rerender } = renderFollowingFeed(false);
    const first = result.current;
    rerender();
    expect(result.current.items).toBe(first.items);
    expect(result.current.fetchNextPage).toBe(first.fetchNextPage);
    expect(result.current.refetch).toBe(first.refetch);
    expect(SuperheroApi.listPosts).not.toHaveBeenCalled();
  });

  it('keeps the loaded items identity across renders', async () => {
    const { result, rerender } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const { items } = result.current;
    rerender();
    expect(result.current.items).toBe(items);
  });
});

describe('useFollowingFeed content', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    focusManager.setFocused(undefined);
  });

  it('shows a post once when a new post shifts it onto the next page', async () => {
    vi.mocked(SuperheroApi.listPosts).mockImplementation(async (params: any) => ({
      items: params.page === 1 ? [{ id: 'p3' }, { id: 'p2' }] : [{ id: 'p2' }, { id: 'p1' }],
      meta: { currentPage: params.page, totalPages: 2 },
    }) as any);
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.items.map((post) => post.id)).toEqual(['p3', 'p2', 'p1']));
  });

  it('refreshes a stale feed when the window regains focus', async () => {
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(SuperheroApi.listPosts).toHaveBeenCalledTimes(1);

    vi.mocked(SuperheroApi.listPosts).mockResolvedValue({
      items: [{ id: 'p2' }, { id: 'p1' }],
      meta: { currentPage: 1, totalPages: 1 },
    } as any);
    const later = Date.now() + 11_000;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    act(() => focusManager.setFocused(true));

    await waitFor(() => expect(result.current.items.map((post) => post.id)).toEqual(['p2', 'p1']));
  });

  it('leaves a feed under 10 seconds old alone when the window regains focus', async () => {
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      focusManager.setFocused(true);
      await nextTimer();
    });

    expect(SuperheroApi.listPosts).toHaveBeenCalledTimes(1);
  });
});

describe('useFollowingFeed errors', () => {
  const failRequests = () => vi.mocked(SuperheroApi.listPosts).mockRejectedValue(new Error('down'));
  const respondWith = (items: { id: string }[], totalPages: number) => {
    vi.mocked(SuperheroApi.listPosts).mockResolvedValue({
      items,
      meta: { currentPage: 1, totalPages },
    } as any);
  };

  it('keeps the loaded posts and reports no error when a refresh fails', async () => {
    respondWith([{ id: 'p1' }], 2);
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    failRequests();
    await act(async () => {
      await result.current.refetch();
      await nextTimer();
    });

    expect(SuperheroApi.listPosts).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.items.map((post) => post.id)).toEqual(['p1']);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('reports a first load that fails', async () => {
    failRequests();
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.error?.message).toBe('down'));
  });

  it('reports a next page that fails, keeping the posts already loaded', async () => {
    respondWith([{ id: 'p1' }], 2);
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    failRequests();
    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.error?.message).toBe('down'));
    expect(result.current.items.map((post) => post.id)).toEqual(['p1']);
  });

  it('reports a refresh that fails while the feed is empty', async () => {
    respondWith([], 1);
    const { result } = renderFollowingFeed(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    failRequests();
    await act(async () => { await result.current.refetch(); });

    await waitFor(() => expect(result.current.error?.message).toBe('down'));
  });
});
