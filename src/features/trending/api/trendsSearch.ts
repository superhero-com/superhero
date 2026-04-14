import type { PostDto, TokenDto } from '@/api/generated';
import { SuperheroApi } from '@/api/backend';
import {
  fetchLeaderboard,
  type LeaderboardItem,
} from './leaderboard';

export type SearchTab = 'tokens' | 'users' | 'posts';

export type SearchMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
};

export type SearchSection<T> = {
  items: T[];
  meta: SearchMeta;
};

export type TrendTokenItem = TokenDto;

export type TrendUserItem = {
  address: string;
  bio?: string | null;
  chain_name?: string | null;
  chain_name_updated_at?: string | null;
  total_volume?: string | number | null;
  total_tx_count?: number | null;
  total_buy_tx_count?: number | null;
  total_sell_tx_count?: number | null;
  total_created_tokens?: number | null;
  created_at?: string | null;
};

export type TrendPostItem = PostDto & {
  slug?: string | null;
  sender?: {
    address?: string;
    public_name?: string | null;
    bio?: string | null;
    avatarurl?: string | null;
  } | null;
  token_mentions?: string[];
};

export const SEARCH_PREVIEW_LIMIT = 3;
export const SEARCH_FULL_LIMIT = 24;
export const DEFAULT_TAB_LIMIT = 12;
export const FALLBACK_LIMIT = 3;

type PaginatedApiResponse<T> = {
  items?: T[];
  meta?: {
    totalItems?: number;
    totalPages?: number;
    currentPage?: number;
    page?: number;
  };
};

function normalizeSection<T>(
  response: PaginatedApiResponse<T> | T[] | null | undefined,
): SearchSection<T> {
  if (Array.isArray(response)) {
    return {
      items: response,
      meta: {
        totalItems: response.length,
        totalPages: 1,
        currentPage: 1,
      },
    };
  }

  const items = response?.items ?? [];
  const totalItems = response?.meta?.totalItems ?? items.length;
  const totalPages = response?.meta?.totalPages ?? 1;
  const currentPage = response?.meta?.currentPage ?? response?.meta?.page ?? 1;

  return {
    items,
    meta: {
      totalItems,
      totalPages,
      currentPage,
    },
  };
}

async function fetchAccountSearch(limit: number, search?: string) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const suffix = params.toString();
  return SuperheroApi.fetchJson(`/api/accounts${suffix ? `?${suffix}` : ''}`) as Promise<
    PaginatedApiResponse<TrendUserItem>
  >;
}

function settledValue<T>(
  result: PromiseSettledResult<T>,
): T | undefined {
  return result.status === 'fulfilled' ? result.value : undefined;
}

async function fetchTrendSearchPreviewWithLimit(search: string, limit: number) {
  const term = search.trim();

  const [tokens, users, posts] = await Promise.allSettled([
    SuperheroApi.listTokens({
      search: term,
      limit,
      page: 1,
      orderBy: 'market_cap',
      orderDirection: 'DESC',
    }) as Promise<PaginatedApiResponse<TrendTokenItem>>,
    fetchAccountSearch(limit, term),
    SuperheroApi.listPosts({
      search: term,
      limit,
      page: 1,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    }) as Promise<PaginatedApiResponse<TrendPostItem>>,
  ]);

  return {
    tokens: normalizeSection(settledValue(tokens)),
    users: normalizeSection(settledValue(users)),
    posts: normalizeSection(settledValue(posts)),
  };
}

export async function fetchTrendSearchPreview(search: string) {
  return fetchTrendSearchPreviewWithLimit(search, SEARCH_PREVIEW_LIMIT);
}

export async function fetchTrendSearchSection(tab: SearchTab, search: string) {
  const term = search.trim();

  switch (tab) {
    case 'tokens':
      return normalizeSection<TrendTokenItem>(await SuperheroApi.listTokens({
        search: term,
        limit: SEARCH_FULL_LIMIT,
        page: 1,
        orderBy: 'market_cap',
        orderDirection: 'DESC',
      }) as PaginatedApiResponse<TrendTokenItem>);
    case 'users':
      return normalizeSection<TrendUserItem>(await fetchAccountSearch(SEARCH_FULL_LIMIT, term));
    case 'posts':
      return normalizeSection<TrendPostItem>(await SuperheroApi.listPosts({
        search: term,
        limit: SEARCH_FULL_LIMIT,
        page: 1,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      }) as PaginatedApiResponse<TrendPostItem>);
    default: {
      const exhaustive: never = tab;
      throw new Error(`Unknown search tab: ${exhaustive}`);
    }
  }
}

export async function fetchTrendingTokens(limit: number = DEFAULT_TAB_LIMIT) {
  return normalizeSection<TrendTokenItem>(await SuperheroApi.listTokens({
    limit,
    page: 1,
    orderBy: 'trending_score',
    orderDirection: 'DESC',
  }) as PaginatedApiResponse<TrendTokenItem>);
}

export async function fetchPopularPosts(limit: number = DEFAULT_TAB_LIMIT) {
  return normalizeSection<TrendPostItem>(await SuperheroApi.listPopularPosts({
    window: 'all',
    limit,
    page: 1,
  }) as PaginatedApiResponse<TrendPostItem>);
}

export async function fetchTopTraders(limit: number = DEFAULT_TAB_LIMIT) {
  return fetchLeaderboard({
    timeframe: '7d',
    metric: 'pnl',
    page: 1,
    limit,
    sortDir: 'DESC',
  }) as Promise<SearchSection<LeaderboardItem>>;
}

/** Max combined results for the home right-rail search dropdown (no fallback lists). */
export const FEED_RAIL_SEARCH_LIMIT = 10;

/** Try to show this many hits per category before redistributing spare slots. */
export const FEED_RAIL_SEARCH_TARGET_PER_CATEGORY = 3;

/**
 * Delay before a rail search triggers one batched triple fetch (tokens + accounts + posts).
 * UI should debounce input by this amount so each keystroke burst does not call the trio
 * repeatedly.
 */
export const FEED_RAIL_SEARCH_DEBOUNCE_MS = 400;

/** URL query param for prefilled Explore search (`/trends/tokens?q=…`). */
export const EXPLORE_SEARCH_QUERY_KEY = 'q';

export type FeedRailSearchItem =
  | { type: 'token'; item: TrendTokenItem }
  | { type: 'user'; item: TrendUserItem }
  | { type: 'post'; item: TrendPostItem };

/**
 * Take up to {@link FEED_RAIL_SEARCH_TARGET_PER_CATEGORY} from each bucket, then output
 * **all trends, then all users, then all posts** (grouped by type). Remaining slots up to
 * `max` are filled in **trends → users → posts** order so empty buckets donate capacity
 * to earlier types first.
 */
function mergeFeedRailSearchGroupedWithBackfill(
  preview: Awaited<ReturnType<typeof fetchTrendSearchPreviewWithLimit>>,
  max: number,
): FeedRailSearchItem[] {
  const tokenItems: FeedRailSearchItem[] = preview.tokens.items.map((item) => ({
    type: 'token',
    item,
  }));
  const userItems: FeedRailSearchItem[] = preview.users.items.map((item) => ({
    type: 'user',
    item,
  }));
  const postItems: FeedRailSearchItem[] = preview.posts.items.map((item) => ({
    type: 'post',
    item,
  }));

  const buckets = [tokenItems, userItems, postItems];
  const t = FEED_RAIL_SEARCH_TARGET_PER_CATEGORY;
  const counts = [
    Math.min(t, buckets[0].length),
    Math.min(t, buckets[1].length),
    Math.min(t, buckets[2].length),
  ];

  let total = counts[0] + counts[1] + counts[2];

  while (total < max) {
    let added = false;
    for (let i = 0; i < 3; i += 1) {
      if (total >= max) break;
      if (counts[i] < buckets[i].length) {
        counts[i] += 1;
        total += 1;
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  const out: FeedRailSearchItem[] = [];
  for (let i = 0; i < 3; i += 1) {
    out.push(...buckets[i].slice(0, counts[i]));
  }
  return out;
}

/**
 * Search tokens, users, and posts (same APIs as Explore). Up to
 * {@link FEED_RAIL_SEARCH_TARGET_PER_CATEGORY} per category when available, grouped as
 * trends → users → posts; spare slots (when a category is short or empty) backfill in that
 * same type order. Capped at {@link FEED_RAIL_SEARCH_LIMIT}. No trending/leaderboard fallbacks.
 */
export async function fetchFeedRailSearchItems(search: string): Promise<FeedRailSearchItem[]> {
  const term = search.trim();
  if (!term) return [];

  const preview = await fetchTrendSearchPreviewWithLimit(term, FEED_RAIL_SEARCH_LIMIT);
  return mergeFeedRailSearchGroupedWithBackfill(preview, FEED_RAIL_SEARCH_LIMIT);
}
