import { SuperheroApi } from "../../../api/backend";

// Generic pagination shape used across the app
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

// Timeframe options: 7d, 30d, all-time
export const LEADERBOARD_TIMEFRAMES = ["7d", "30d", "all"] as const;
export type LeaderboardTimeframe = (typeof LEADERBOARD_TIMEFRAMES)[number];

// Metrics map directly to /api/accounts/leaderboard?sortBy=<metric>.
export type LeaderboardMetric = "pnl" | "roi" | "aum" | "mdd";

export type LeaderboardItem = {
  address: string;
  chain_name?: string | null;
  aum_usd?: number;
  pnl_usd?: number;
  roi_pct?: number;
  mdd_pct?: number;
  buy_count?: number;
  sell_count?: number;
  created_tokens_count?: number;
  owned_trends_count?: number;
  portfolio_value_usd_sparkline?: [number, number][];
};

export interface LeaderboardQueryParams {
  timeframe: LeaderboardTimeframe;
  metric: LeaderboardMetric;
  page?: number;
  limit?: number;
}

function mapTimeframeToWindow(timeframe: LeaderboardTimeframe): string {
  switch (timeframe) {
    case "7d":
      return "7d";
    case "30d":
      return "30d";
    case "all":
    default:
      return "all";
  }
}

function mapTimeframeToPoints(timeframe: LeaderboardTimeframe): number {
  switch (timeframe) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "all":
    default:
      return 30;
  }
}

export async function fetchLeaderboard(
  params: LeaderboardQueryParams
): Promise<PaginatedResponse<LeaderboardItem>> {
  const { timeframe, metric, page = 1, limit = 20 } = params;

  const windowParam = mapTimeframeToWindow(timeframe);
  const points = mapTimeframeToPoints(timeframe);

  const searchParams = new URLSearchParams();
  searchParams.set("window", windowParam);
  searchParams.set("sortBy", metric);
  searchParams.set("sortDir", "DESC");
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("points", String(points));

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
    };
  };

  const items = json?.items ?? [];
  const metaSource = json?.meta ?? {};

  const meta = {
    totalItems: metaSource.totalItems ?? items.length,
    totalPages: metaSource.totalPages ?? 1,
    currentPage: metaSource.page ?? page,
  };

  return { items, meta };
}
