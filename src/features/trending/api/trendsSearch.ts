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

export async function fetchTrendSearchPreview(search: string) {
  const term = search.trim();

  const [tokens, users, posts] = await Promise.allSettled([
    SuperheroApi.listTokens({
      search: term,
      limit: SEARCH_PREVIEW_LIMIT,
      page: 1,
      orderBy: 'market_cap',
      orderDirection: 'DESC',
    }) as Promise<PaginatedApiResponse<TrendTokenItem>>,
    fetchAccountSearch(SEARCH_PREVIEW_LIMIT, term),
    SuperheroApi.listPosts({
      search: term,
      limit: SEARCH_PREVIEW_LIMIT,
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
