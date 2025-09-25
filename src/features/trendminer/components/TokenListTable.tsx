import { useMemo, useState } from "react";
import { TokenDto } from "../../../api/generated";
import TokenListTableRow from "./TokenListTableRow";
import TokenRowSkeleton from "./TokenRowSkeleton";
import PerformanceTimeframeSelector from "./PerformanceTimeframeSelector";

type PriceMovementTimeframe = '1D' | '7D' | '30D';

interface TokenListTableProps {
  pages?: Array<{ items: TokenDto[] }> | null;
  loading?: boolean;
}

export default function TokenListTable({ pages, loading }: TokenListTableProps) {
  const [performanceChartTimeframe, setPerformanceChartTimeframe] = useState<PriceMovementTimeframe>('30D');

  // Show collection column if we have multiple collections (for now just show it)
  const showCollectionColumn = true; // This would be determined by factory collections

  const allItems = useMemo(() => 
    pages?.length ? pages.map((page) => page.items).flat() : [],
    [pages]
  );

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden">
      <table className="w-full bctsl-token-list-table">
        <thead>
          <tr>
            <th className="cell-fake">
              {/* Fake column that fixes ::before problem on rows */}
            </th>
            <th className="cell cell-rank text-xs opacity-50 text-left pr-2 pr-md-4 p-4">
              <div title="Ranking based on current sort criteria">
                Rank
              </div>
            </th>
            <th className="cell cell-name text-xs opacity-50 text-left py-1 px-1 px-lg-3">
              <div>Token Name</div>
            </th>
            {showCollectionColumn && (
              <th className="cell cell-collection text-xs opacity-50 text-left text-md-right py-1 px-1 px-lg-3">
                <div title="Token collection category">
                  Collection
                </div>
              </th>
            )}
            <th className="cell cell-price text-xs opacity-50 text-left text-md-right py-1 px-1 px-lg-3">
              Price
            </th>
            <th className="cell cell-market-cap text-xs opacity-50 text-right py-1 px-1 px-lg-3">
              Market Cap
            </th>
            <th className="cell cell-address text-xs opacity-50 text-right py-1 px-1 px-lg-3">
              Contract Address
            </th>
            <th className="cell cell-chart text-xs text-right py-1 pl-3">
              <PerformanceTimeframeSelector 
                value={performanceChartTimeframe}
                onChange={setPerformanceChartTimeframe}
              />
            </th>
            <th className="cell-link">{/* Links placeholder column */}</th>
          </tr>
        </thead>

        {loading && !pages?.length ? (
          <tbody className="token-list-skeleton">
            {Array.from({ length: 12 }).map((_, index) => (
              <TokenRowSkeleton key={index} />
            ))}
          </tbody>
        ) : (
          <tbody>
            {allItems.map((token, index) => (
              <TokenListTableRow
                key={token.address}
                token={token}
                showCollectionColumn={showCollectionColumn}
                rank={index + 1}
                timeframe={performanceChartTimeframe}
              />
            ))}
          </tbody>
        )}
      </table>

      <style jsx>{`
        .bctsl-token-list-table {
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .bctsl-token-list-table th {
          font-weight: bold;
        }

        .cell-name {
          width: auto;
          font-size: 21px;
        }

        .cell-clickable-item {
          color: inherit;
          cursor: pointer;
        }

        .cell-clickable-item:hover {
          text-decoration: underline;
        }

        @media screen and (min-width: 961px) {
          .cell-rank {
            width: 52px;
          }

          .cell-collection {
            width: 120px;
          }

          .cell-price,
          .cell-market-cap,
          .cell-address {
            width: 170px;
          }

          .cell-chart {
            width: 170px;
          }

          .cell-chart .chart {
            max-width: 140px;
          }

          .cell-link {
            width: 8px;
          }
        }

        @media screen and (max-width: 1100px) {
          .cell-name {
            font-size: 16px;
          }

          .cell-price,
          .cell-market-cap {
            font-size: 0.814em;
          }
        }

        @media screen and (max-width: 960px) {
          .bctsl-token-list-table > thead {
            display: none;
          }

          .bctsl-token-list-table > tbody > tr {
            display: grid;
            grid-template-columns: 42px 5fr 2fr;
            grid-template-rows: 1fr 20px 20px;
            grid-template-areas:
              'rank name       chart'
              'rank price      chart'
              'rank market-cap chart';
            margin-top: 4px;
            padding-block: 8px;
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
          .bctsl-token-list-table > tbody > tr {
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
    </div>
  );
}
