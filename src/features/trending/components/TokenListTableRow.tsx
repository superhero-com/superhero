import { PriceDataFormatter } from "@/features/shared/components";
import { useMemo } from "react";
import { TokenDto } from "@/api/generated/models/TokenDto";
import { TokenLineChart } from "./TokenLineChart";
import TokenMobileCard from "./TokenMobileCard";


interface TokenListTableRowProps {
  token: TokenDto;
  useCollectionRank?: boolean;
  showCollectionColumn?: boolean;
  rank: number;
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
          <div className="bg-gradient-to-r  text-sm from-yellow-400 to-cyan-500 bg-clip-text text-transparent">
            <PriceDataFormatter
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
              height={60}
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
