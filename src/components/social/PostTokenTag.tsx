import { useQuery } from '@tanstack/react-query';
import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { toTokenLookupParam } from '@/utils/address';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import type { TokenTagDisplayOptions } from '@/utils/tokenTagEnvelope';
import EntityPill from './EntityPill';
import { PillChangeBadge } from './pillParts';

// Long symbols clip with an ellipsis rather than pushing the price out of the card.
const MAX_SYMBOL_CHARS = 12;

type TokenPillStatus = 'loading' | 'resolved' | 'unknown';

function truncateSymbol(symbol: string): string {
  return symbol.length > MAX_SYMBOL_CHARS ? `${symbol.slice(0, MAX_SYMBOL_CHARS - 1)}…` : symbol;
}

type PerfWindow = { current_change_percent?: number | string };

function readChangePercent(token: TokenDto | null | undefined): number | null {
  const perf = (token?.performance as Record<string, PerfWindow> | undefined);
  const raw = perf?.[DEFAULT_PAST_TIMEFRAME]?.current_change_percent;
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export interface TokenPillProps {
  symbol: string; // without the leading '#'
  options: TokenTagDisplayOptions;
  token: TokenDto | null | undefined;
  status: TokenPillStatus;
  offline?: boolean; // query paused on cached data → last-known, not live
  staleHours?: number; // age of the cached value, spoken label only
}

// Presentational token pill — pure in its inputs, so every state renders directly from props.
export const TokenPill = ({
  symbol, options, token, status, offline = false, staleHours,
}: TokenPillProps) => {
  const normalized = symbol.replace(/^#/, '');
  const display = truncateSymbol(normalized);

  // Unknown / delisted: plain dashed text, no pill, no link.
  if (status === 'unknown') {
    return (
      <EntityPill plain sigil="#" label={display} markShape="square" ariaLabel={`${normalized} — unknown token`} />
    );
  }

  const target = `/trends/tokens/${encodeURIComponent(normalized.toUpperCase())}?showTrade=0`;
  const loading = status === 'loading';

  const changePct = readChangePercent(token);
  const hasChange = changePct !== null;
  const hasPrice = Boolean(token?.price_data);
  const hasChart = Boolean(token?.sale_address);

  // Data-gated in ladder order: the chart needs the price present; a missing part drops it.
  const showChange = options.change && hasChange;
  const showPrice = options.price && hasPrice;
  const showChart = options.chart && hasChart && showPrice;
  const isPositive = (changePct ?? 0) >= 0;

  // Spoken label — one sentence, assembled from what actually renders.
  const spoken = [normalized];
  if (loading) spoken.push('loading');
  if (showPrice) spoken.push('with price');
  if (showChange) spoken.push(`${isPositive ? 'up' : 'down'} ${Math.abs(changePct ?? 0).toFixed(1)} percent`);
  if (showChart) spoken.push('24-hour chart');
  if (offline && staleHours !== undefined) spoken.push(`last known ${staleHours}h ago`);
  spoken.push('link');
  const ariaLabel = `${spoken.join(', ').replace(/, link$/, ' — link')}`;

  const trailing = (
    <>
      {offline && <span className="sh-pill__stale-dot" aria-hidden="true" />}
      {showPrice ? (
        <span className="sh-pill__price" aria-hidden="true">
          <PriceDataFormatter priceData={token!.price_data} watchPrice hideFiatPrice />
        </span>
      ) : (
        loading && options.price && <span className="sh-pill__skel sh-pill__skel--price" aria-hidden="true" />
      )}
      {showChange && <PillChangeBadge changePercent={changePct ?? 0} />}
      {showChart ? (
        <span className="sh-pill__chart" aria-hidden="true">
          <TokenLineChart saleAddress={token!.sale_address!} height={18} width={60} interval="all-time" />
        </span>
      ) : (
        loading && options.chart && <span className="sh-pill__skel sh-pill__skel--chart" aria-hidden="true" />
      )}
    </>
  );

  return (
    <EntityPill
      sigil="#"
      label={display}
      markShape="square"
      to={target}
      ariaLabel={ariaLabel}
      rich={options.price || options.chart}
      trailing={trailing}
    />
  );
};

interface PostTokenTagProps {
  symbol: string;
  options: TokenTagDisplayOptions;
}

// Resolves a token tag and renders the pill; the symbol is known from the string, so only the
// data slots skeleton, and an unknown token degrades to plain text.
const PostTokenTag = ({ symbol, options }: PostTokenTagProps) => {
  const normalized = symbol.replace(/^#/, '');

  const query = useQuery<TokenDto | null>({
    queryKey: ['post-token-tag', normalized.toUpperCase()],
    queryFn: () => TokensService.findByAddress({ address: toTokenLookupParam(normalized) }),
    staleTime: 60 * 1000,
    enabled: Boolean(normalized),
    retry: false,
  });

  const token = query.data;
  const offline = query.fetchStatus === 'paused' && Boolean(token);
  let status: TokenPillStatus;
  if (query.status === 'error' || (query.status === 'success' && !token)) status = 'unknown';
  else if (query.status === 'pending' && !token) status = 'loading';
  else status = 'resolved';

  const staleHours = offline && query.dataUpdatedAt
    ? Math.max(0, Math.round((Date.now() - query.dataUpdatedAt) / (60 * 60 * 1000)))
    : undefined;

  return (
    <TokenPill
      symbol={normalized}
      options={options}
      token={token}
      status={status}
      offline={offline}
      staleHours={staleHours}
    />
  );
};

export default PostTokenTag;
