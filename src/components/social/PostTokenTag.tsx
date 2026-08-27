import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { toTokenLookupParam } from '@/utils/address';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import type { TokenTagDisplayOptions } from '@/utils/tokenTagEnvelope';
import EntityPill from './EntityPill';
import TokenTagCandleChart from './TokenTagCandleChart';
import { PillChangeBadge, isFlatChange } from './pillParts';

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
  preview?: boolean; // rendered in the composer ladder, not the post → tighter row sizing
}

function tokenTarget(normalized: string): string {
  return `/trends/tokens/${encodeURIComponent(normalized.toUpperCase())}?showTrade=0`;
}

interface TokenRowProps {
  symbol: string; // normalized, without the leading '#'
  options: TokenTagDisplayOptions;
  token: TokenDto | null | undefined;
  status: TokenPillStatus;
  preview?: boolean; // composer ladder → shorter candlestick, tighter spacing
}

// The advanced full-row: name, price, market cap and a small candlestick, one link to the token.
// Reached only when `options.chart` resolves true (TokenPill dispatches here). Every slot is
// data-gated on its own — a missing part is dropped, the row is never blanked — and the
// candlestick no longer depends on price, so `{mode=advanced;price=0}` is a row without a price.
const TokenRow = ({
  symbol, options, token, status, preview = false,
}: TokenRowProps) => {
  const { t } = useTranslation();
  const normalized = symbol.replace(/^#/, '');
  const loading = status === 'loading';

  const changePct = readChangePercent(token);
  const hasChange = changePct !== null;
  const showChange = options.change && hasChange;
  const isPositive = (changePct ?? 0) >= 0;

  const showPrice = options.price && Boolean(token?.price_data);
  const showMcap = Boolean(token?.market_cap_data);
  const showChart = Boolean(token?.sale_address); // price precondition dropped in the row

  // One spoken label for the whole row, assembled from what actually renders.
  const spoken = [normalized];
  if (loading) spoken.push('loading');
  if (showPrice) spoken.push('with price');
  if (showMcap) spoken.push('market cap');
  if (showChange) {
    spoken.push(isFlatChange(changePct ?? 0)
      ? 'unchanged over 24 hours'
      : `${isPositive ? 'up' : 'down'} ${Math.abs(changePct ?? 0).toFixed(1)} percent`);
  }
  if (showChart) spoken.push('candlestick chart');
  spoken.push('link');
  const ariaLabel = spoken.join(', ').replace(/, link$/, ' — link');

  const chartHeight = preview ? 44 : 72;

  return (
    <Link
      to={tokenTarget(normalized)}
      aria-label={ariaLabel}
      className={`sh-token-row${preview ? ' sh-token-row--preview' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="sh-token-row__head" aria-hidden="true">
        <span className="sh-token-row__symbol">{`#${normalized}`}</span>
        {showChange && <PillChangeBadge changePercent={changePct ?? 0} />}
      </span>

      <span className="sh-token-row__stats" aria-hidden="true">
        {showPrice ? (
          <span className="sh-token-row__stat">
            <span className="sh-token-row__stat-label">{t('social.tokenTag.priceLabel')}</span>
            <span className="sh-token-row__price">
              <PriceDataFormatter priceData={token!.price_data} watchPrice hideFiatPrice />
            </span>
          </span>
        ) : (
          loading && <span className="sh-pill__skel sh-pill__skel--price" />
        )}
        {showMcap && (
          <span className="sh-token-row__stat">
            <span className="sh-token-row__stat-label">{t('social.tokenTag.marketCap')}</span>
            <span className="sh-token-row__mcap">
              <PriceDataFormatter priceData={token!.market_cap_data} bignumber hideFiatPrice />
            </span>
          </span>
        )}
      </span>

      {showChart ? (
        <TokenTagCandleChart token={token!} height={chartHeight} className="sh-token-row__chart" />
      ) : (
        loading && <span className="sh-pill__skel sh-token-row__chart-skel" style={{ height: chartHeight }} />
      )}
    </Link>
  );
};

// Presentational token pill — pure in its inputs, so every state renders directly from props.
export const TokenPill = ({
  symbol, options, token, status, offline = false, staleHours, preview = false,
}: TokenPillProps) => {
  const normalized = symbol.replace(/^#/, '');
  const display = truncateSymbol(normalized);

  // Unknown / delisted: plain dashed text, no pill, no link — the same in either layout.
  if (status === 'unknown') {
    return (
      <EntityPill plain sigil="#" label={display} ariaLabel={`${normalized} — unknown token`} />
    );
  }

  // The row switch: `chart` resolved true promotes the tag to a full row (name · price · market
  // cap · candlestick). It is derived from the parsed options alone, never a wire mode name, so
  // any payload resolving to `chart: true` renders identically. `chart` false is the inline pill.
  if (options.chart) {
    return (
      <TokenRow
        symbol={normalized}
        options={options}
        token={token}
        status={status}
        preview={preview}
      />
    );
  }

  const target = tokenTarget(normalized);
  const loading = status === 'loading';

  const changePct = readChangePercent(token);
  const hasChange = changePct !== null;
  const hasPrice = Boolean(token?.price_data);

  // Inline pill covers rungs 0-2 only; `chart: true` routes to TokenRow above, so no chart slot.
  const showChange = options.change && hasChange;
  const showPrice = options.price && hasPrice;
  const isPositive = (changePct ?? 0) >= 0;

  // Spoken label — one sentence, assembled from what actually renders.
  const spoken = [normalized];
  if (loading) spoken.push('loading');
  if (showPrice) spoken.push('with price');
  if (showChange) {
    spoken.push(isFlatChange(changePct ?? 0)
      ? 'unchanged over 24 hours'
      : `${isPositive ? 'up' : 'down'} ${Math.abs(changePct ?? 0).toFixed(1)} percent`);
  }
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
    </>
  );

  return (
    <EntityPill
      sigil="#"
      label={display}
      to={target}
      ariaLabel={ariaLabel}
      rich={options.price}
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
