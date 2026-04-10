/* eslint-disable object-curly-newline */
import {
  describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '@/api/backend';
import {
  FEED_RAIL_SEARCH_LIMIT,
  FEED_RAIL_SEARCH_TARGET_PER_CATEGORY,
  fetchFeedRailSearchItems,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchFeedRailSearchItems does not call APIs for empty or whitespace-only search', async () => {
    await expect(fetchFeedRailSearchItems('')).resolves.toEqual([]);
    await expect(fetchFeedRailSearchItems('  \t  ')).resolves.toEqual([]);
    expect(SuperheroApi.listTokens).not.toHaveBeenCalled();
    expect(SuperheroApi.fetchJson).not.toHaveBeenCalled();
    expect(SuperheroApi.listPosts).not.toHaveBeenCalled();
  });

  it('fetchFeedRailSearchItems requests all three endpoints with rail limit and trimmed term', async () => {
    vi.mocked(SuperheroApi.listTokens).mockResolvedValueOnce({ items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } } as any);
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({ items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } } as any);
    vi.mocked(SuperheroApi.listPosts).mockResolvedValueOnce({ items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } } as any);

    await fetchFeedRailSearchItems('  hello  ');

    const tokenArgs = { search: 'hello', limit: FEED_RAIL_SEARCH_LIMIT, page: 1, orderBy: 'market_cap', orderDirection: 'DESC' };
    expect(SuperheroApi.listTokens).toHaveBeenCalledWith(tokenArgs);
    expect(SuperheroApi.fetchJson).toHaveBeenCalledWith(`/api/accounts?limit=${FEED_RAIL_SEARCH_LIMIT}&search=hello`);
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith({
      search: 'hello',
      limit: FEED_RAIL_SEARCH_LIMIT,
      page: 1,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });
  });

  it('fetchFeedRailSearchItems orders trends, then users, then posts', async () => {
    vi.mocked(SuperheroApi.listTokens).mockResolvedValueOnce({
      items: [{ address: 'ct_1', sale_address: 'cs_1', name: 'T1' }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({
      items: [{ address: 'ak_1', chain_name: 'u.chain' }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.listPosts).mockResolvedValueOnce({
      items: [{
        id: 'post_1',
        sender_address: 'ak_x',
        content: 'body',
        media: [],
        topics: [],
        total_comments: 0,
        tx_hash: '',
        tx_args: [],
        contract_address: '',
        type: 'post',
        created_at: '2026-01-01T00:00:00.000Z',
      }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    } as any);

    const result = await fetchFeedRailSearchItems('q');

    expect(result.map((r) => r.type)).toEqual(['token', 'user', 'post']);
  });

  it('fetchFeedRailSearchItems groups trends then users then posts and backfills tokens when posts are thin', async () => {
    const token = (i: number) => ({ address: `ct_${i}`, sale_address: `cs_${i}`, name: `T${i}` });
    const user = (i: number) => ({ address: `ak_${i}`, chain_name: `u${i}.chain` });
    vi.mocked(SuperheroApi.listTokens).mockResolvedValueOnce({
      items: Array.from({ length: 6 }, (_, i) => token(i)),
      meta: { totalItems: 6, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({
      items: Array.from({ length: 6 }, (_, i) => user(i)),
      meta: { totalItems: 6, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.listPosts).mockResolvedValueOnce({
      items: [{ id: 'p1', sender_address: 'ak_x', content: 'c', media: [], topics: [], total_comments: 0, tx_hash: '', tx_args: [], contract_address: '', type: 'post', created_at: '2026-01-01' }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    } as any);

    const result = await fetchFeedRailSearchItems('q');

    expect(result).toHaveLength(FEED_RAIL_SEARCH_LIMIT);
    expect(result.map((r) => r.type)).toEqual([
      ...Array(6).fill('token'),
      ...Array(3).fill('user'),
      'post',
    ]);
  });

  it('fetchFeedRailSearchItems takes up to target per category then one extra token when all buckets are full', async () => {
    const token = (i: number) => ({ address: `ct_${i}`, sale_address: `cs_${i}`, name: `T${i}` });
    const user = (i: number) => ({ address: `ak_${i}`, chain_name: `u${i}.chain` });
    const post = (i: number) => ({
      id: `post_${i}`,
      sender_address: 'ak_x',
      content: `c${i}`,
      media: [],
      topics: [],
      total_comments: 0,
      tx_hash: '',
      tx_args: [],
      contract_address: '',
      type: 'post',
      created_at: '2026-01-01',
    });
    vi.mocked(SuperheroApi.listTokens).mockResolvedValueOnce({
      items: Array.from({ length: 10 }, (_, i) => token(i)),
      meta: { totalItems: 10, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({
      items: Array.from({ length: 10 }, (_, i) => user(i)),
      meta: { totalItems: 10, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.listPosts).mockResolvedValueOnce({
      items: Array.from({ length: 10 }, (_, i) => post(i)),
      meta: { totalItems: 10, totalPages: 1, currentPage: 1 },
    } as any);

    const result = await fetchFeedRailSearchItems('q');

    expect(result).toHaveLength(FEED_RAIL_SEARCH_LIMIT);
    expect(result.map((r) => r.type)).toEqual([
      ...Array(FEED_RAIL_SEARCH_TARGET_PER_CATEGORY + 1).fill('token'),
      ...Array(FEED_RAIL_SEARCH_TARGET_PER_CATEGORY).fill('user'),
      ...Array(FEED_RAIL_SEARCH_TARGET_PER_CATEGORY).fill('post'),
    ]);
  });

  it('fetchFeedRailSearchItems still returns grouped users then posts when listTokens rejects', async () => {
    vi.mocked(SuperheroApi.listTokens).mockRejectedValueOnce(new Error('network'));
    const user = (i: number) => ({ address: `ak_${i}`, chain_name: `u${i}.chain` });
    vi.mocked(SuperheroApi.fetchJson).mockResolvedValueOnce({
      items: Array.from({ length: 10 }, (_, i) => user(i)),
      meta: { totalItems: 10, totalPages: 1, currentPage: 1 },
    } as any);
    vi.mocked(SuperheroApi.listPosts).mockResolvedValueOnce({
      items: [
        {
          id: 'p1',
          sender_address: 'ak_x',
          content: 'c',
          media: [],
          topics: [],
          total_comments: 0,
          tx_hash: '',
          tx_args: [],
          contract_address: '',
          type: 'post',
          created_at: '2026-01-01',
        },
        {
          id: 'p2',
          sender_address: 'ak_x',
          content: 'd',
          media: [],
          topics: [],
          total_comments: 0,
          tx_hash: '',
          tx_args: [],
          contract_address: '',
          type: 'post',
          created_at: '2026-01-01',
        },
        {
          id: 'p3',
          sender_address: 'ak_x',
          content: 'e',
          media: [],
          topics: [],
          total_comments: 0,
          tx_hash: '',
          tx_args: [],
          contract_address: '',
          type: 'post',
          created_at: '2026-01-01',
        },
      ],
      meta: { totalItems: 3, totalPages: 1, currentPage: 1 },
    } as any);

    const result = await fetchFeedRailSearchItems('x');

    expect(result).toHaveLength(FEED_RAIL_SEARCH_LIMIT);
    expect(result.map((r) => r.type)).toEqual([
      ...Array(7).fill('user'),
      ...Array(3).fill('post'),
    ]);
  });

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
