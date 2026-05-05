import { SuperheroApi } from '../../../api/backend';

export interface LeaderboardTimeFilterMeta {
  value: number;
  unit: 'minutes' | 'hours';
  start: string;
  end: string;
}

// Generic pagination shape used across the app
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    timeFilter?: LeaderboardTimeFilterMeta;
  };
}

// Timeframe options: preset windows plus optional custom start/end dates.
export const LEADERBOARD_TIMEFRAMES = ['7d', '30d', 'all'] as const;
export type LeaderboardTimeframe = (typeof LEADERBOARD_TIMEFRAMES)[number];

// Metrics map directly to /api/accounts/leaderboard?sortBy=<metric>.
export type LeaderboardMetric = 'pnl' | 'roi' | 'aum' | 'mdd';

export type LeaderboardItem = {
  address: string;
  chain_name?: string | null;
  aum_usd?: number;
  pnl_usd?: number;
  roi_pct?: number;
  mdd_pct?: number;
  buy_count?: number;
  sell_count?: number;
  volume_usd?: number;
  created_tokens_count?: number;
  owned_trends_count?: number;
  portfolio_value_usd_sparkline?: [number, number][];
};

export interface LeaderboardQueryParams {
  timeframe: LeaderboardTimeframe;
  metric: LeaderboardMetric;
  page?: number;
  limit?: number;
  sortDir?: 'ASC' | 'DESC';
  startDate?: string;
  endDate?: string;
}

interface LeaderboardApiTimeframeParams {
  window?: string;
  points?: number;
}

function mapTimeframeToApiParams(
  timeframe: LeaderboardTimeframe,
): LeaderboardApiTimeframeParams {
  switch (timeframe) {
    case '7d':
      return { window: '7d', points: 7 };
    case '30d':
      return { window: '30d', points: 30 };
    case 'all':
    default:
      return { window: 'all', points: 30 };
  }
}

export async function fetchLeaderboard(
  params: LeaderboardQueryParams,
): Promise<PaginatedResponse<LeaderboardItem>> {
  const {
    timeframe, metric, page = 1, limit = 18, sortDir, startDate, endDate,
  } = params;

  const timeframeParams = mapTimeframeToApiParams(timeframe);
  const resolvedSortDir = sortDir ?? (metric === 'mdd' ? 'ASC' : 'DESC');

  const searchParams = new URLSearchParams();
  if (startDate && endDate) {
    searchParams.set('startDate', startDate);
    searchParams.set('endDate', endDate);
  } else {
    if (timeframeParams.window) searchParams.set('window', timeframeParams.window);
    if (timeframeParams.points) searchParams.set('points', String(timeframeParams.points));
  }
  searchParams.set('sortBy', metric);
  searchParams.set('sortDir', resolvedSortDir);
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));

  const path = `/api/accounts/leaderboard?${searchParams.toString()}`;

  const json = (await SuperheroApi.fetchJson(path)) as {
    items?: LeaderboardItem[];
    meta?: {
      page?: number;
      limit?: number;
      totalItems?: number;
      totalPages?: number;
      window?: string;
      sortBy?: string;
      sortDir?: string;
      timeFilter?: LeaderboardTimeFilterMeta;
    };
  };

  const items = json?.items ?? [];
  const metaSource = json?.meta ?? {};

  const meta = {
    totalItems: metaSource.totalItems ?? items.length,
    totalPages: metaSource.totalPages ?? 1,
    currentPage: metaSource.page ?? page,
    timeFilter: metaSource.timeFilter,
  };

  return { items, meta };
}
