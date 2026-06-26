import BigNumber from 'bignumber.js';
import { CONFIG } from '../config';

/**
 * DEX data client.
 *
 * Historically this hit the standalone "dex-backend" service (CONFIG.DEX_BACKEND_URL).
 * It now talks to the unified superhero-api (CONFIG.SUPERHERO_API_URL, the same base
 * the generated OpenAPI client uses) under the `/api/dex/*` routes, and adapts the
 * new (paginated, nested) responses back into the flat shapes the existing
 * consumers expect — so callers (usePairList, useTokenList, useTransactionList,
 * useSwapQuote, TokenDetail, AddTokens, TokenPricePerformance) keep working
 * unchanged.
 *
 * Resilience matches the old behaviour: every call resolves to `null` (or an empty
 * adaptation) on error/timeout rather than throwing, so callers' `data || []`
 * fallbacks still hold.
 */

function apiBaseUrl(): string {
  const base = CONFIG.SUPERHERO_API_URL;
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

async function apiGet<T>(
  path: string,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<T | null> {
  const base = apiBaseUrl();
  if (!base) return null;
  const fullUrl = `${base}/api/${path.startsWith('/') ? path.slice(1) : path}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(fullUrl, { signal: controller.signal });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

// ---- shared types (loose; the new API returns richer objects) ----

interface PageMeta {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  itemCount?: number;
}

interface PaginatedResponse<T> {
  items?: T[];
  meta?: PageMeta;
}

/**
 * Fetches every page of a paginated `/dex/*` list and concatenates the items.
 *
 * The old dex-backend list calls returned the full set in one shot; the new API
 * caps each response (default 100), so a single request silently drops anything
 * past the first page. This walks all pages instead.
 *
 * - Stops at `meta.totalPages` when the server reports it, otherwise stops as
 *   soon as a page comes back shorter than `pageSize` (end reached).
 * - `maxPages` is a hard safety backstop against a runaway loop.
 * - Preserves the module's null-on-error contract only for a failed *first*
 *   page; a failure part-way through returns the items gathered so far rather
 *   than discarding a nearly complete list.
 */
async function apiGetAllPages<T>(
  path: string,
  { pageSize = 100, maxPages = 100 }: { pageSize?: number; maxPages?: number } = {},
): Promise<T[] | null> {
  const sep = path.includes('?') ? '&' : '?';
  const items: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    // Pages must be fetched in order to read each page's meta before the next.
    // eslint-disable-next-line no-await-in-loop
    const res = await apiGet<PaginatedResponse<T>>(
      `${path}${sep}limit=${pageSize}&page=${page}`,
    );
    if (!res?.items) {
      return page === 1 ? null : items;
    }
    items.push(...res.items);

    const { totalPages } = res.meta ?? {};
    if (totalPages != null) {
      if (page >= totalPages) break;
    } else if (res.items.length < pageSize) {
      break;
    }
  }

  return items;
}

interface ApiPrice {
  ae?: number;
  usd?: number;
  [currency: string]: number | undefined;
}

interface ApiPeriodChange {
  volume?: ApiPrice;
  percentage?: string;
}

interface ApiTokenSummary {
  total_volume?: ApiPrice;
  change?: Record<'24h' | '7d' | '30d', ApiPeriodChange | undefined>;
}

interface ApiDexToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  pairs_count?: number;
  is_ae?: boolean;
  listed?: boolean;
  price?: ApiPrice;
  summary?: ApiTokenSummary;
}

interface ApiPair {
  address: string;
  token0: ApiDexToken;
  token1: ApiDexToken;
  transactions_count?: number;
  reserve0?: string;
  reserve1?: string;
  total_supply?: string;
  summary?: {
    total_volume?: ApiPrice;
    change?: Record<'24h' | '7d' | '30d', ApiPeriodChange | undefined>;
  };
}

interface ApiPairTransaction {
  tx_hash: string;
  account_address?: string;
  pair: ApiPair;
  tx_type: string;
  swap_info?: {
    amount0In?: string;
    amount1In?: string;
    amount0Out?: string;
    amount1Out?: string;
    to?: string;
  } | null;
  created_at: string;
}

interface ApiCandle {
  timeOpen: string;
  timeClose: string;
  quote: {
    convertedTo: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: number;
  };
}

// ---- helpers ----

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string | undefined => (
  v === undefined || v === null ? undefined : String(v)
);

const human = (raw: unknown, decimals = 18): BigNumber => new BigNumber(String(raw ?? '0')).shiftedBy(-decimals);

/** Reserve-priced TVL in USD for a pair, computed from reserves × token USD prices. */
function pairTvlUsd(pair: ApiPair): string | undefined {
  const p0 = pair.token0?.price?.usd;
  const p1 = pair.token1?.price?.usd;
  if (p0 == null && p1 == null) return undefined;
  const tvl0 = human(pair.reserve0, pair.token0?.decimals ?? 18).multipliedBy(
    p0 ?? 0,
  );
  const tvl1 = human(pair.reserve1, pair.token1?.decimals ?? 18).multipliedBy(
    p1 ?? 0,
  );
  return tvl0.plus(tvl1).toString();
}

function isSynchronized(pair: ApiPair): boolean {
  return num(pair.reserve0) > 0 && num(pair.reserve1) > 0;
}

// ---- adapters / public API (signatures unchanged) ----

type ListedToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
};

export async function getListedTokens(): Promise<ListedToken[] | null> {
  const items = await apiGetAllPages<ApiDexToken>('dex/tokens?listed=true');
  if (!items) return null;
  return items.map((t) => ({
    address: t.address,
    name: t.name,
    symbol: t.symbol,
    decimals: t.decimals,
  }));
}

function adaptToken(t: ApiDexToken): Record<string, any> {
  const change = t.summary?.change;
  return {
    address: t.address,
    symbol: t.symbol,
    name: t.name,
    decimals: t.decimals,
    listed: t.listed,
    pairs: t.pairs_count ?? 0,
    priceAe: str(t.price?.ae),
    priceUsd: str(t.price?.usd),
    // No per-token TVL on the new backend (only aggregated volume); left undefined.
    tvlUsd: undefined,
    priceChangeDay: str(change?.['24h']?.percentage),
    priceChangeWeek: str(change?.['7d']?.percentage),
    priceChangeMonth: str(change?.['30d']?.percentage),
    volumeUsdDay: str(change?.['24h']?.volume?.usd),
    volumeUsdWeek: str(change?.['7d']?.volume?.usd),
    volumeUsdMonth: str(change?.['30d']?.volume?.usd),
    volumeUsdAll: str(t.summary?.total_volume?.usd),
  };
}

export async function getAllTokens(): Promise<any[] | null> {
  const items = await apiGetAllPages<ApiDexToken>('dex/tokens');
  if (!items) return null;
  return items.map(adaptToken);
}

export async function getTokenWithUsd(tokenId: string): Promise<any | null> {
  const t = await apiGet<ApiDexToken>(
    `dex/tokens/${encodeURIComponent(tokenId)}`,
  );
  if (!t) return null;
  return {
    ...adaptToken(t),
    // `totalReserve` (token reserves summed across pools) has no equivalent on
    // the new backend; surface an empty string so the UI renders blank rather
    // than crashing.
    totalReserve: '',
  };
}

function adaptPair(p: ApiPair): Record<string, any> {
  return {
    address: p.address,
    token0: p.token0?.address,
    token1: p.token1?.address,
    token0Symbol: p.token0?.symbol,
    token1Symbol: p.token1?.symbol,
    transactions: p.transactions_count ?? 0,
    synchronized: isSynchronized(p),
    tvlUsd: pairTvlUsd(p),
    volume24h: str(p.summary?.change?.['24h']?.volume?.usd),
    volumeUsdAll: str(p.summary?.total_volume?.usd),
  };
}

export async function getPairs(onlyListed = false): Promise<any[] | null> {
  // The new /dex/pairs endpoint has no `only-listed` query filter, so replicate
  // the legacy semantics (both tokens listed) client-side when requested.
  const all = await apiGetAllPages<ApiPair>('dex/pairs');
  if (!all) return null;
  const items = onlyListed
    ? all.filter((p) => p.token0?.listed && p.token1?.listed)
    : all;
  return items.map(adaptPair);
}

export async function getPairsByTokenUsd(tokenId: string): Promise<any[] | null> {
  const items = await apiGetAllPages<ApiPair>(
    `dex/pairs?token_address=${encodeURIComponent(tokenId)}`,
  );
  if (!items) return null;
  return items.map(adaptPair);
}

export async function getSwapRoutes(
  tokenA: string,
  tokenB: string,
): Promise<any[][] | null> {
  // The new /dex/swap-routes endpoint already returns the legacy route shape
  // (address-form tokens + `synchronized` + `liquidityInfo`), so no adaptation
  // is needed.
  return apiGet<any[][]>(
    `dex/swap-routes/${encodeURIComponent(tokenA)}/${encodeURIComponent(tokenB)}`,
  );
}

const TIME_FRAME_TO_HISTORY: Record<
  string,
  { interval: number; limit: number }
> = {
  '1H': { interval: 60, limit: 60 },
  '1D': { interval: 900, limit: 96 },
  '1W': { interval: 3600, limit: 168 },
  '1M': { interval: 14400, limit: 180 },
  '1Y': { interval: 86400, limit: 365 },
  MAX: { interval: 86400, limit: 1000 },
};

/**
 * Adapts the legacy `/graph` endpoint to the new OHLCV history endpoints.
 *
 * Supported: graphType Price and Volume, derived from price candles
 * (token-level via /dex/tokens/:addr/history, pair-level via
 * /dex/pairs/:addr/history). graphType TVL / Fees / Locked have NO data source
 * on the new backend and resolve to null (the chart shows no series for them).
 */
export async function getGraph(
  params: Record<string, any>,
): Promise<any | null> {
  const graphType = String(params.graphType ?? 'Price');
  const timeFrame = String(params.timeFrame ?? 'MAX');
  const { interval, limit } = TIME_FRAME_TO_HISTORY[timeFrame]
    ?? TIME_FRAME_TO_HISTORY.MAX;

  const valueFor = (candle: ApiCandle): number => {
    if (graphType === 'Volume') return num(candle.quote.volume);
    // Price (default): use the candle close.
    return num(candle.quote.close);
  };

  if (graphType !== 'Price' && graphType !== 'Volume') {
    // TVL / Fees / Locked time-series are not produced by the new backend.
    return null;
  }

  const query = `interval=${interval}&limit=${limit}`;
  let candles: ApiCandle[] | null = null;
  if (params.tokenAddress) {
    candles = await apiGet<ApiCandle[]>(
      `dex/tokens/${encodeURIComponent(params.tokenAddress)}/history?${query}`,
    );
  } else if (params.pairAddress) {
    candles = await apiGet<ApiCandle[]>(
      `dex/pairs/${encodeURIComponent(params.pairAddress)}/history?${query}`,
    );
  }
  if (!candles) return null;

  // The denomination the series is priced in ('ae' or another token's symbol
  // when the token has no AE pool). Surfaced so the UI can label the axis and
  // avoid implying an AE price where there isn't one.
  const unit = candles[candles.length - 1]?.quote?.convertedTo ?? null;

  return {
    graphType,
    timeFrame,
    unit,
    labels: candles.map((c) => new Date(c.timeClose).getTime()),
    data: candles.map(valueFor),
  };
}

/** Map an on-chain DEX function name to the legacy category used by the UI. */
function txCategory(txType: string): 'swap' | 'add' | 'remove' | string {
  if (txType?.startsWith('swap')) return 'swap';
  if (txType === 'add_liquidity') return 'add';
  if (txType === 'remove_liquidity') return 'remove';
  return txType;
}

function adaptTransaction(tx: ApiPairTransaction): Record<string, any> {
  const category = txCategory(tx.tx_type);
  const token0 = tx.pair?.token0;
  const token1 = tx.pair?.token1;

  let tokenInSymbol: string | undefined;
  let tokenOutSymbol: string | undefined;
  let amountIn: string | undefined;
  let amountOut: string | undefined;

  if (category === 'swap' && tx.swap_info) {
    const token0IsInput = num(tx.swap_info.amount0In) > 0;
    if (token0IsInput) {
      tokenInSymbol = token0?.symbol;
      tokenOutSymbol = token1?.symbol;
      amountIn = human(tx.swap_info.amount0In, token0?.decimals).toString();
      amountOut = human(tx.swap_info.amount1Out, token1?.decimals).toString();
    } else {
      tokenInSymbol = token1?.symbol;
      tokenOutSymbol = token0?.symbol;
      amountIn = human(tx.swap_info.amount1In, token1?.decimals).toString();
      amountOut = human(tx.swap_info.amount0Out, token0?.decimals).toString();
    }
  }

  return {
    txHash: tx.tx_hash,
    type: category,
    event: tx.tx_type,
    senderAccount: tx.account_address,
    pairAddress: tx.pair?.address,
    token0Symbol: token0?.symbol,
    token1Symbol: token1?.symbol,
    tokenInSymbol,
    tokenOutSymbol,
    amountIn,
    amountOut,
    microBlockTime: tx.created_at,
  };
}

export async function getHistory(
  params: Record<string, any>,
): Promise<any[] | null> {
  const limit = params.limit ?? 100;
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  query.set('order_by', 'created_at');
  query.set('order_direction', 'DESC');
  // The legacy `since` is epoch ms; the new endpoint filters by an ISO date.
  if (params.since != null) {
    query.set('from_date', new Date(Number(params.since)).toISOString());
  }

  const res = await apiGet<PaginatedResponse<ApiPairTransaction>>(
    `dex/transactions?${query.toString()}`,
  );
  if (!res?.items) return null;

  let items = res.items.map(adaptTransaction);
  // The new endpoint filters tx_type by exact on-chain function name, not by the
  // legacy 'swap'|'add'|'remove' category, so apply the category filter here.
  if (params.type && params.type !== 'all') {
    items = items.filter((tx) => tx.type === params.type);
  }
  return items;
}
