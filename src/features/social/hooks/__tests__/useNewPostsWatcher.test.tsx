import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '@/api/backend';
import { countNewPosts, newestPostTime, useNewPostsWatcher } from '../useNewPostsWatcher';

vi.mock('@/api/backend', () => ({ SuperheroApi: { listPosts: vi.fn() } }));

const post = (id: string, minute: number) => ({
  id, created_at: `2026-10-16T12:${String(minute).padStart(2, '0')}:00Z`,
});
const WATCH_KEY = ['posts-new-watch', { language: undefined }];
const page = (items: any[]) => ({ items, meta: { currentPage: 1, totalPages: 1 } });

function setup(knownPosts: any[], language?: 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    ({ known }) => useNewPostsWatcher({
      enabled: true, language, knownPosts: known, intervalMs: 60_000,
    }),
    { wrapper, initialProps: { known: knownPosts } },
  );
  return { ...hook, client };
}

describe('countNewPosts', () => {
  it('counts only unseen posts newer than the baseline, once each', () => {
    const since = newestPostTime([post('a', 10)]);
    const polled = [post('c', 12), post('c', 12), post('b', 11), post('a', 10), post('old', 5)];
    expect(countNewPosts(polled, new Set(['a']), since)).toBe(2);
    expect(countNewPosts(polled, new Set(['a', 'b', 'c']), since)).toBe(0);
  });

  it('ignores posts without an id or a usable date', () => {
    expect(countNewPosts([{ id: null, created_at: post('x', 20).created_at }, { id: 'y' }], new Set(), 0))
      .toBe(0);
  });
});

describe('useNewPostsWatcher', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('polls the newest page in the feed language', async () => {
    vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page([post('a', 10)]) as any);
    setup([post('a', 10)], 'en');
    await waitFor(() => expect(SuperheroApi.listPosts).toHaveBeenCalledWith({
      limit: 10, page: 1, orderBy: 'created_at', orderDirection: 'DESC', language: 'en',
    }));
  });

  it('reports posts published after the feed loaded, and clears on acknowledge', async () => {
    vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page([post('a', 10)]) as any);
    const { result, client } = setup([post('a', 10)]);
    await waitFor(() => expect(client.getQueryData(WATCH_KEY)).toBeDefined());
    expect(result.current.count).toBe(0);

    vi.mocked(SuperheroApi.listPosts)
      .mockResolvedValue(page([post('c', 12), post('b', 11), post('a', 10)]) as any);
    await act(async () => { await client.refetchQueries({ queryKey: ['posts-new-watch'] }); });
    await waitFor(() => expect(result.current.count).toBe(2));

    act(() => { result.current.acknowledge(); });
    expect(result.current.count).toBe(0);
  });

  it('does not count posts the feed already shows', async () => {
    vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page([post('a', 10)]) as any);
    const { result, client, rerender } = setup([post('a', 10)]);
    await waitFor(() => expect(client.getQueryData(WATCH_KEY)).toBeDefined());

    vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page([post('b', 11), post('a', 10)]) as any);
    await act(async () => { await client.refetchQueries({ queryKey: ['posts-new-watch'] }); });
    await waitFor(() => expect(result.current.count).toBe(1));

    // The feed refreshed itself (e.g. own post or focus refetch) and now shows b.
    rerender({ known: [post('b', 11), post('a', 10)] });
    expect(result.current.count).toBe(0);
  });
});
