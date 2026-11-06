import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
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
