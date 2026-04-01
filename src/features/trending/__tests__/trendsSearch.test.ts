/* eslint-disable object-curly-newline */
import {
  describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '@/api/backend';
import {
  fetchPopularPosts,
  fetchTopTraders,
  fetchTrendingTokens,
  fetchTrendSearchPreview,
  fetchTrendSearchSection,
} from '../api/trendsSearch';
import { fetchLeaderboard } from '../api/leaderboard';

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    fetchJson: vi.fn(),
    listTokens: vi.fn(),
    listPosts: vi.fn(),
    listPopularPosts: vi.fn(),
  },
}));

vi.mock('../api/leaderboard', () => ({
  fetchLeaderboard: vi.fn(),
}));

describe('trendsSearch api helpers', () => {
  it('loads preview results from all three search endpoints', async () => {
    vi.mocked(SuperheroApi.listTokens).mockResolvedValueOnce({
      items: [{ address: 'ct_token', sale_address: 'ct_sale', name: 'HELLO' }],
      meta: { totalItems: 8, totalPages: 3, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({
      items: [{ address: 'ak_user', chain_name: 'hello.chain' }],
      meta: { totalItems: 5, totalPages: 2, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.listPosts).mockResolvedValueOnce({
      items: [{ id: 'post_1_v3', sender_address: 'ak_user', content: 'hello post', media: [], topics: [], total_comments: 0, tx_hash: '', tx_args: [], contract_address: '', type: 'post', created_at: '2026-03-27T12:00:00.000Z' }],
      meta: { totalItems: 4, totalPages: 2, currentPage: 1 },
    } as any);

    const result = await fetchTrendSearchPreview('hello');

    expect(SuperheroApi.listTokens).toHaveBeenCalledWith({
      search: 'hello',
      limit: 3,
      page: 1,
      orderBy: 'market_cap',
      orderDirection: 'DESC',
    });
    expect(SuperheroApi.fetchJson).toHaveBeenCalledWith('/api/accounts?limit=3&search=hello');
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith({
      search: 'hello',
      limit: 3,
      page: 1,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
    expect(result.tokens.meta.totalItems).toBe(8);
    expect(result.users.items[0].address).toBe('ak_user');
    expect(result.posts.items[0].id).toBe('post_1_v3');
  });

  it('loads a full section result set for users', async () => {
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({
      items: [{ address: 'ak_full', chain_name: 'full.chain' }],
      meta: { totalItems: 14, totalPages: 1, currentPage: 1 },
    } as any);

    const result = await fetchTrendSearchSection('users', 'full');

    expect(SuperheroApi.fetchJson).toHaveBeenCalledWith('/api/accounts?limit=24&search=full');
    expect(result.meta.totalItems).toBe(14);
    expect(result.items[0].address).toBe('ak_full');
  });

  it('loads fallback content for tokens, posts and traders', async () => {
    vi.mocked(SuperheroApi.listTokens).mockResolvedValueOnce({
      items: [{ address: 'ct_fallback', sale_address: 'ct_fallback_sale', name: 'TREND' }],
    } as any);
    vi.mocked(SuperheroApi.listPopularPosts).mockResolvedValueOnce({
      items: [{ id: 'popular_v3', sender_address: 'ak_popular', content: 'popular', media: [], topics: [], total_comments: 2, tx_hash: '', tx_args: [], contract_address: '', type: 'post', created_at: '2026-03-27T12:00:00.000Z' }],
    } as any);
    vi.mocked(fetchLeaderboard).mockResolvedValueOnce({
      items: [{ address: 'ak_trader', pnl_usd: 1200 }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    });

    const [tokens, posts, traders] = await Promise.all([
      fetchTrendingTokens(3),
      fetchPopularPosts(3),
      fetchTopTraders(3),
    ]);

    expect(SuperheroApi.listTokens).toHaveBeenCalledWith({
      limit: 3,
      page: 1,
      orderBy: 'trending_score',
      orderDirection: 'DESC',
    });
    expect(SuperheroApi.listPopularPosts).toHaveBeenCalledWith({
      window: 'all',
      limit: 3,
      page: 1,
    });
    expect(fetchLeaderboard).toHaveBeenCalledWith({
      timeframe: '7d',
      metric: 'pnl',
      page: 1,
      limit: 3,
      sortDir: 'DESC',
    });
    expect(tokens.items[0].name).toBe('TREND');
    expect(posts.items[0].id).toBe('popular_v3');
    expect(traders.items[0].address).toBe('ak_trader');
  });
});
