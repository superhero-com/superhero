import { TokenDto } from '@/api/generated/models/TokenDto';
import { PriceDataFormatter } from '@/features/shared/components';
import { toAe } from '@/utils/bondingCurve';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Decimal } from '../../../libs/decimal';
import { TokenLineChart } from './TokenLineChart';

interface TokenListTableRowProps {
  token: TokenDto;
  useCollectionRank?: boolean;
  rank: number;
}

const PercentChange = ({
  percent,
  direction,
}: {
  percent?: number | null;
  direction?: string | null;
}) => {
  if (percent == null) {
    return <span className="text-white/30 text-xs tabular-nums">—</span>;
  }
  const isUp = direction ? direction === 'up' : percent >= 0;
  const formatted = Decimal.from(Math.abs(percent)).prettify(2);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
        isUp ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      <span className="text-[9px]">{isUp ? '▲' : '▼'}</span>
      {formatted}
      %
    </span>
  );
};

const TokenListTableRow = ({
  token,
  useCollectionRank = false,
  rank,
}: TokenListTableRowProps) => {
  const navigate = useNavigate();
  const tokenAddress = useMemo(() => token.address, [token.address]);
  const collectionRank = useCollectionRank ? (token as any).collection_rank : rank;
  const saleAddress = useMemo(
    () => token.sale_address || tokenAddress,
    [token.sale_address, tokenAddress],
  );

  const perf24h = token.performance?.past_24h;
  const perf7d = token.performance?.past_7d;
  const perf30d: any = token.performance?.past_30d;
  const volume = perf30d?.volume ? Decimal.from(perf30d.volume) : null;

  const tokenHref = `/trending/tokens/${encodeURIComponent(token.name || token.address)}`;
  const tokenLabel = token.name || token.symbol || token.address;

  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      if (event.metaKey || event.ctrlKey) {
        window.open(tokenHref, '_blank', 'noopener');
      } else if (event.shiftKey) {
        window.open(tokenHref);
      } else {
        navigate(tokenHref);
      }
    },
    [navigate, tokenHref],
  );

  const handleRowAuxClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      if (event.button === 1) {
        event.preventDefault();
        window.open(tokenHref, '_blank', 'noopener');
      }
    },
    [tokenHref],
  );

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          window.open(tokenHref, '_blank', 'noopener');
        } else {
          navigate(tokenHref);
        }
      }
    },
    [navigate, tokenHref],
  );

  return (
    <>
      {/* Mobile compact card row — 4 columns: rank | name+MC | price+30d% | chart */}
      <tr
        className="mobile-only-card relative"
        onClick={handleRowClick}
        onAuxClick={handleRowAuxClick}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="link"
        aria-label={`View ${tokenLabel}`}
      >
        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
        <td className="cell-fake" />

        {/* Rank */}
        <td className="cell cell-rank py-3 align-middle text-white/40 text-xs font-semibold text-center">
          {collectionRank}
        </td>

        {/* Name + Market Cap */}
        <td className="cell cell-name py-3 pl-2 pr-1 align-middle">
          <div className="text-[13px] font-bold text-white truncate">
            <span className="text-white/40 text-[.85em] mr-0.5">#</span>
            {token.symbol || token.name}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5 tabular-nums">
            <PriceDataFormatter
              bignumber
              hideFiatPrice
              watchPrice={false}
              priceData={token.market_cap_data}
            />
          </div>
        </td>

        {/* Price + 30d % */}
        <td className="cell cell-price py-3 px-2 align-middle text-right">
          <div className="text-[12px] font-semibold text-white tabular-nums">
            <PriceDataFormatter
              hideFiatPrice
              watchPrice={false}
              priceData={token.price_data}
            />
          </div>
          <div className="mt-0.5">
            <PercentChange
              percent={perf30d?.current_change_percent}
              direction={perf30d?.current_change_direction}
            />
          </div>
        </td>

        {/* All Time chart */}
        <td className="cell cell-chart py-3 pl-1 pr-3 align-middle text-right">
          {saleAddress && (
            <div className="flex justify-end">
              <TokenLineChart saleAddress={saleAddress} height={40} width={64} interval="all-time" />
            </div>
          )}
        </td>
      </tr>

      {/* Desktop row: Safari-safe — no overlay links, no row transforms */}
      <tr
        className="bctsl-token-list-table-row"
        onClick={handleRowClick}
        onAuxClick={handleRowAuxClick}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="link"
        aria-label={`View ${tokenLabel}`}
      >
        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
        <td className="cell-fake" />

        {/* Rank */}
        <td className="cell cell-rank pl-3 pr-4">
          <div className="text-sm font-semibold text-white/40 tabular-nums">{collectionRank}</div>
        </td>

        {/* Token Name + Avatar + Buy */}
        <td className="cell cell-name px-3">
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="token-name text-sm font-bold text-white truncate">
                <span className="text-white/40 text-[.85em] mr-0.5">#</span>
                {token.symbol || token.name}
              </div>
              {token.name && token.symbol && token.name !== token.symbol && (
                <div className="text-[11px] text-white/40 truncate leading-3 mt-0.5">
                  {token.name}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Price */}
        <td className="cell cell-price px-3 text-right">
          <div className="text-sm font-semibold tabular-nums text-white">
            <PriceDataFormatter hideFiatPrice priceData={token.price_data} />
          </div>
        </td>

        {/* 24h % change */}
        <td className="cell cell-change24h px-3 text-right">
          <PercentChange
            percent={perf24h?.current_change_percent}
            direction={perf24h?.current_change_direction}
          />
        </td>

        {/* 7d % change */}
        <td className="cell cell-change7d px-3 text-right">
          <PercentChange
            percent={perf7d?.current_change_percent}
            direction={perf7d?.current_change_direction}
          />
        </td>

        {/* 30d % change */}
        <td className="cell cell-change30d px-3 text-right">
          <PercentChange
            percent={perf30d?.current_change_percent}
            direction={perf30d?.current_change_direction}
          />
        </td>

        {/* Market Cap */}
        <td className="cell cell-market-cap px-3 text-right">
          <div className="text-sm text-white/80 tabular-nums">
            <PriceDataFormatter bignumber hideFiatPrice priceData={token.market_cap_data} />
          </div>
        </td>

        {/* Volume (7d) */}
        <td className="cell cell-volume px-3 text-right">
          <div className="text-sm text-white/70 tabular-nums">{volume ? volume.shorten() : '—'}</div>
        </td>

        {/* Circulating Supply */}
        <td className="cell cell-supply px-3 text-right">
          <div className="text-sm text-white/70 tabular-nums">
            {Decimal.from(toAe(token.total_supply)).shorten()}
          </div>
        </td>

        {/* Sparkline Chart */}
        <td className="cell cell-chart pr-2 pr-md-4 align-middle">
          {tokenAddress && (
            <div className="flex justify-end items-center">
              <TokenLineChart saleAddress={saleAddress} height={40} interval="all-time" />
            </div>
          )}
        </td>

        <td className="cell cell-link" aria-hidden="true" />
      </tr>
    </>
  );
};

export default TokenListTableRow;
