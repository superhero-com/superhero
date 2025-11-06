import { PriceDataFormatter } from "@/features/shared/components";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TokenDto } from "@/api/generated/models/TokenDto";
import { TransactionHistoricalService } from "@/api/generated";
import Token24hChange from "@/components/Trendminer/Token24hChange";
import { TokenLineChart } from "./TokenLineChart";


interface TokenListTableRowProps {
  token: TokenDto;
  useCollectionRank?: boolean;
  showCollectionColumn?: boolean;
  rank: number;
  changePercentMap?: Record<string, number>;
}

// Helper function to parse collection name
function parseCollectionName(collection: string): string {
  // For now, just return the collection string as is
  // In the Vue version, this was used to extract collection names
  return collection || 'default';
}


// Component for token label
function TokenLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 bg-white/[0.08] text-white/80 rounded-full text-xs font-medium backdrop-blur-[10px]">
      {children}
    </span>
  );
}

export default function TokenListTableRow({
  token,
  useCollectionRank = false,
  showCollectionColumn = false,
  rank,
  changePercentMap,
}: TokenListTableRowProps) {
  const tokenAddress = useMemo(() => {
    return token.address;
  }, [token.address]);

  const collectionRank = useCollectionRank ? (token as any).collection_rank : rank;

  // For mobile 24h change
  const saleAddress = useMemo(() => token.sale_address || tokenAddress, [token.sale_address, tokenAddress]);
  const externalChange = changePercentMap?.[saleAddress as string];

  const { data: previewData } = useQuery({
    queryFn: () =>
      TransactionHistoricalService.getForPreview({ address: saleAddress, interval: '1d' }),
    enabled: !!saleAddress && externalChange === undefined,
    queryKey: ['TransactionHistoricalService.getForPreview:1d', saleAddress],
    staleTime: 1000 * 60 * 5,
  });

  const performance24h = useMemo(() => {
    try {
      if (externalChange !== undefined) {
        return { current_change_percent: externalChange } as any;
      }
      const result = (previewData as any)?.result as Array<{ last_price: number }>;
      if (!result || result.length === 0) return null;
      const first = Number(result[0].last_price || 0);
      const last = Number(result[result.length - 1].last_price || 0);
      if (!first) return null;
      return { current_change_percent: ((last - first) / first) * 100 } as any;
    } catch {
      return null;
    }
  }, [previewData, externalChange]);

  // Show mobile card on screens smaller than 960px
  return (
    <>
      {/* Mobile compact two-row layout */}
      <tr className="mobile-only-card md:hidden relative">
        <td className="cell-fake" />
        {/* Rank */}
        <td className="pl-3 pr-3 py-1.5 align-middle text-white/60 text-xs font-semibold">{collectionRank}</td>
        {/* Content cell spans remaining columns: Row 1 name, Row 2 mc/price/24h */}
        <td className="pl-2 py-1.5 pr-3 align-middle relative" colSpan={3}>
          {/* Row 1: full name (wrap allowed) */}
          <div className="text-[15px] font-bold text-white leading-5 whitespace-normal break-words">
            {token.symbol || token.name}
          </div>
          {/* Row 2: left = MC, right = Price + 24h */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="only-fiat text-[11px] text-white/60 leading-4 font-medium">
              <PriceDataFormatter
                bignumber
                watchPrice={false}
                className=""
                priceData={token.market_cap_data}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="only-fiat text-sm text-white font-semibold text-right tabular-nums min-w-[80px]">
                <PriceDataFormatter
                  watchPrice={false}
                  className="text-white"
                  priceData={token.price_data}
                />
              </div>
              <div className="w-[70px] flex justify-end">
              <Token24hChange tokenAddress={saleAddress} createdAt={token.created_at} performance24h={performance24h} />
              </div>
            </div>
          </div>
          <a
            href={`/trending/tokens/${encodeURIComponent(token.name || token.address)}`}
            className="absolute inset-0 z-10"
            aria-label={`View details for ${token.name || token.symbol}`}
          />
        </td>
      </tr>

      {/* Desktop table row for larger screens */}
      <tr className="bctsl-token-list-table-row rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hidden md:table-row">
        {/* Fake cell to match header structure */}
        <td className="cell-fake"></td>

        {/* Rank */}
        <td className="cell cell-rank pl-2 pl-md-4">
          <div className="rank text-md font-bold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent opacity-50">
            {collectionRank}
          </div>
        </td>

        {/* Name */}
        <td className="cell cell-name px-1 px-lg-3">
          <div className="token-name text-md font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent transition-colors">
            <span className="text-white/60 text-[.85em] mr-0.5 align-baseline">#</span>
            <span>{token.symbol || token.name}</span>
          </div>
        </td>

        {/* Collection Label*/}
        {showCollectionColumn && (
          <td className="cell cell-collection text-right px-1 px-md-3">
            <TokenLabel>
              {parseCollectionName(token.collection)}
            </TokenLabel>
          </td>
        )}

        {/* Price */}
        <td className="cell cell-price px-1 px-lg-3 text-md-right">
          <div className="flex align-center md:block">
            <div className="mobile-label block md:hidden text-white/60 w-16">Price:</div>
            <div className="bg-gradient-to-r  text-sm from-yellow-400 to-cyan-500 bg-clip-text text-transparent">
              <PriceDataFormatter
                hideFiatPrice
                priceData={token.price_data}
              />
            </div>
          </div>
        </td>

        {/* Market Cap */}
        <td className="cell cell-market-cap px-1 px-lg-3 text-md-right">
          <div className="flex align-center md:block justify-between">
            <div className="mobile-label block md:hidden text-white/60 w-16">MC:</div>
            <div className="bg-gradient-to-r text-sm  from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              <PriceDataFormatter
                bignumber
                hideFiatPrice
                priceData={token.market_cap_data}
              />
            </div>
          </div>
        </td>

        {/* Holders */}
        <td className="cell cell-holders text-left px-1 px-lg-3">
          <div className="bg-gradient-to-r from-blue-400 to-green-500 bg-clip-text text-transparent font-medium">
            {token.holders_count?.toLocaleString() || '0'}
          </div>
        </td>

        {/* Chart */}
        <td className="cell cell-chart text-right pr-md-4">
          {tokenAddress && (
            <div className="ml-auto chart max-w-[180px]">
              <TokenLineChart
                saleAddress={token.sale_address || tokenAddress}
                height={40}
                hideTimeframe={true}
              />
            </div>
          )}
        </td>

        {/* Link that covers whole row */}
        <td className="cell cell-link">
          <a
            href={`/trending/tokens/${encodeURIComponent(token.name || token.address)}`}
            className="link absolute inset-0 z-10"
            aria-label={`View details for ${token.name || token.symbol}`}
          />
        </td>

        <style>{`
        .bctsl-token-list-table-row {
          position: relative;
          z-index: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          /* Fix for Safari that doesn't support position: relative on tr */
          transform: translate(0, 0);
          

        }


        .bctsl-token-list-table-row:hover .token-name {
          background: linear-gradient(to right, #fb923c, #fbbf24);
          -webkit-background-clip: text;
          background-clip: text;
        }

        .bctsl-token-list-table-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(17, 97, 254, 0.15);
        }

        .bctsl-token-list-table-row:active {
          transform: translateY(0);
        }

        .bctsl-token-list-table-row:active::after {
          background-color: rgba(255, 255, 255, 0.08);
        }

        .token-name {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cell-rank {
          font-family: var(--heading-font-family);
          font-weight: bold;
          opacity: 0.5;
        }

        .link {
          position: absolute;
          z-index: 2;
          inset: 0;
        }

        .mobile-label {
          text-wrap: nowrap;
        }

        /* Mobile responsive styles */
        @media screen and (max-width: 960px) {
          .only-fiat .price { display: none; }
          .bctsl-token-list-table-row {
            display: grid;
            grid-template-columns: 42px 1fr 1fr 1fr; /* rank + 3 cols */
            grid-template-rows: auto auto; /* row1: name, row2: mc/price/24h */
            grid-template-areas:
              'rank name       name      name'
              'rank market-cap price     chart';
            margin-top: 0;
            padding-block: 6px;
            margin: 0;
          }

          .cell-rank {
            grid-area: rank;
            padding-top: 4px;
            font-size: 16px;
            font-weight: normal;
            letter-spacing: -0.1em;
          }

          .cell-name { grid-area: name; }
          .cell-market-cap { grid-area: market-cap; }
          .cell-price { grid-area: price; align-self: start; }
          .cell-chart { grid-area: chart; align-self: start; }

          .cell-collection,
          .cell-holders {
            display: none;
          }
        }

        /* On small screens put the chart below the token name */
        @media screen and (max-width: 520px) {
          .bctsl-token-list-table-row {
            grid-template-areas:
              'rank name       name'
              'rank price      chart'
              'rank market-cap chart';
          }
        }

        /* On tiny screens hide the chart */
        @media screen and (max-width: 370px) {
          .cell-chart {
            display: none;
          }
        }
      `}</style>
      </tr>
    </>
  );
}
