import { TokenDto } from '@/api/generated/models/TokenDto';
import { PriceDataFormatter } from '@/features/shared/components';
import { toAe } from '@/utils/bondingCurve';
import { useMemo } from 'react';
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
  const tokenAddress = useMemo(() => token.address, [token.address]);
  const collectionRank = useCollectionRank ? (token as any).collection_rank : rank;
  const saleAddress = useMemo(
    () => token.sale_address || tokenAddress,
    [token.sale_address, tokenAddress],
  );

  const perf24h = token.performance?.past_24h;
  const perf7d = token.performance?.past_7d;
  const perf30d = token.performance?.past_30d;
  const volume = token.volume ? Decimal.from(token.volume) : null;

  const tokenHref = `/trending/tokens/${encodeURIComponent(token.name || token.address)}`;

  return (
    <>
      {/* Mobile compact card row — 4 columns: rank | name+MC | price+30d% | chart */}
      <tr className="mobile-only-card md:hidden relative">
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
        <td className="cell cell-chart py-3 pl-1 pr-3 align-middle text-right relative">
          {saleAddress && (
            <div className="flex justify-end">
              <TokenLineChart saleAddress={saleAddress} height={28} width={64} interval="all-time" />
            </div>
          )}
          <a
            href={tokenHref}
            className="link absolute inset-0 z-10"
            aria-label={`View ${token.name || token.symbol}`}
          />
        </td>
      </tr>

      {/* Desktop table row */}
      <tr className="bctsl-token-list-table-row rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hidden md:table-row">
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
        <td className="cell cell-change30d px-3 text-right hidden lg:table-cell">
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
        <td className="cell cell-volume px-3 text-right hidden xl:table-cell">
          <div className="text-sm text-white/70 tabular-nums">{volume ? volume.shorten() : '—'}</div>
        </td>

        {/* Circulating Supply */}
        <td className="cell cell-supply px-3 text-right hidden xl:table-cell">
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

        {/* Full-row link overlay */}
        <td className="cell cell-link">
          <a
            href={tokenHref}
            className="link absolute inset-0 z-10"
            aria-label={`View ${token.name || token.symbol}`}
          />
        </td>

        <style>
          {`
          .bctsl-token-list-table-row {
            position: relative;
            z-index: 1;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translate(0, 0);
          }

          .bctsl-token-list-table-row::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
            pointer-events: none;
          }

          .bctsl-token-list-table-row:hover::after {
            background: rgba(17, 97, 254, 0.06);
            border-color: rgba(17, 97, 254, 0.2);
          }

          .bctsl-token-list-table-row:hover {
            transform: translateY(-1px);
          }

          .bctsl-token-list-table-row:hover .token-name {
            color: #93c5fd;
          }

          .token-name {
            transition: color 0.2s ease;
          }

          .link {
            position: absolute;
            z-index: 10;
            inset: 0;
          }

          .cell-rank {
            font-family: var(--heading-font-family);
          }

          .mobile-label {
            text-wrap: nowrap;
          }

          @media screen and (max-width: 767px) {
            .mobile-market-cap .price {
              display: none;
            }
          }
          `}
        </style>
      </tr>
    </>
  );
};

export default TokenListTableRow;
