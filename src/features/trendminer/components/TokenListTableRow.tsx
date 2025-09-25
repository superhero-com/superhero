import { PriceDataFormatter } from "@/features/shared/components";
import { useMemo } from "react";
import { TokenDto } from "../../../api/generated";
import { AddressChip } from "../../../components/AddressChip";
import { TokenLineChart } from "./TokenLineChart";
import TokenMobileCard from "./TokenMobileCard";

type PriceMovementTimeframe = '1D' | '7D' | '30D';

interface TokenListTableRowProps {
  token: TokenDto;
  useCollectionRank?: boolean;
  showCollectionColumn?: boolean;
  rank: number;
  timeframe?: PriceMovementTimeframe;
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
    <span className="px-2 py-1 bg-white/10 text-white/80 rounded-full text-xs font-medium">
      {children}
    </span>
  );
}

export default function TokenListTableRow({
  token,
  useCollectionRank = false,
  showCollectionColumn = false,
  rank,
  timeframe = '30D'
}: TokenListTableRowProps) {
  const tokenAddress = useMemo(() => {
    return token.address;
  }, [token.address]);

  const collectionRank = useCollectionRank ? (token as any).collection_rank : rank;

  // Show mobile card on screens smaller than 960px
  return (
    <>
      {/* Mobile card for small screens */}
      <tr className="mobile-only-card md:hidden">
        <td colSpan={8} className="p-0">
          <TokenMobileCard
            token={token}
            useCollectionRank={useCollectionRank}
            showCollectionColumn={showCollectionColumn}
            rank={rank}
            timeframe={timeframe}
          />
        </td>
      </tr>

      {/* Desktop table row for larger screens */}
      <tr className="bctsl-token-list-table-row rounded relative bg-white/5 hover:bg-white/10 transition-colors hidden md:table-row">
      {/* Rank */}
      <td className="cell cell-rank pl-2 pl-md-4">
        <div className="rank text-sm font-medium text-white/90 font-bold opacity-50">
          {collectionRank}
        </div>
      </td>

      {/* Name */}
      <td className="cell cell-name px-1 px-lg-3">
        <div className="token-name text-sm font-semibold text-white transition-colors">
          #{token.symbol || token.name}
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
          <PriceDataFormatter
            priceData={token.price_data}
            rowOnSm
          />

        </div>
      </td>

      {/* Market Cap */}
      <td className="cell cell-market-cap px-1 px-lg-3 text-md-right">
        <div className="flex align-center md:block justify-between">
          <div className="mobile-label block md:hidden text-white/60 w-16">MC:</div>
          <PriceDataFormatter
            bignumber
            priceData={token.market_cap_data}
            rowOnSm
          />
        </div>
      </td>

      {/* Contract Address */}
      <td className="cell cell-address text-right px-1 px-lg-3">
        {tokenAddress && (
          <AddressChip
            address={tokenAddress}
            copyable
            className="text-xs"
          />
        )}
      </td>

      {/* Chart */}
      <td className="cell cell-chart text-right pr-md-4">
        {tokenAddress && (
          <div className="ml-auto chart max-w-[140px]">
            <TokenLineChart
              saleAddress={token.sale_address || tokenAddress}
              height={60}
              hideTimeframe={true}
            />
          </div>
        )}
      </td>

      {/* Link that covers whole row */}
      <td className="cell cell-link">
        <a
          href={`/trendminer/tokens/${encodeURIComponent(token.name || token.address)}`}
          className="link absolute inset-0 z-10"
          aria-label={`View details for ${token.name || token.symbol}`}
        />
      </td>

      <style>{`
        .bctsl-token-list-table-row {
          position: relative;
          z-index: 1;
          transition: all 0.15s;
          /* Fix for Safari that doesn't support position: relative on tr */
          transform: translate(0, 0);
          clip-path: inset(0);
        }

        .bctsl-token-list-table-row::before,
        .bctsl-token-list-table-row::after {
          content: '';
          display: block;
          position: absolute;
          z-index: -1;
          border-radius: inherit;
          transition: all 0.15s;
        }

        .bctsl-token-list-table-row::before {
          inset: 0;
          opacity: 0;
          background: linear-gradient(0deg, rgba(255, 255, 255, 0.2) 20%, rgba(255, 255, 255, 0) 100%);
        }

        .bctsl-token-list-table-row::after {
          inset: 1px;
          background-color: rgb(var(--surface));
        }

        .bctsl-token-list-table-row:hover::before {
          opacity: 1;
        }

        .bctsl-token-list-table-row:hover::after {
          background-color: #2a2a2a;
        }

        .bctsl-token-list-table-row:hover .token-name {
          color: rgb(var(--primary));
        }

        .bctsl-token-list-table-row:active {
          transform: translateY(3px);
        }

        .bctsl-token-list-table-row:active::after {
          background-color: #333333;
        }

        .token-name {
          transition: all 0.15s;
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
          .bctsl-token-list-table-row {
            display: grid;
            grid-template-columns: 42px 5fr 2fr;
            grid-template-rows: 1fr 10px 10px;
            grid-template-areas:
              'rank name       chart'
              'rank price      chart'
              'rank market-cap chart';
            margin-top: 4px;
            padding-block: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            margin: 0.5rem 0;
          }

          .cell-rank {
            grid-area: rank;
            padding-top: 4px;
            font-size: 10px;
            font-weight: normal;
            letter-spacing: -0.1em;
          }

          .cell-name {
            grid-area: name;
          }

          .cell-price {
            grid-area: price;
          }

          .cell-market-cap {
            grid-area: market-cap;
          }

          .cell-chart {
            grid-area: chart;
          }

          .cell-collection,
          .cell-address {
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
