import { useMemo, useState } from "react";
import { TokenDto } from "@/api/generated/models/TokenDto";
import TokenListTableRow from "./TokenListTableRow";
import TokenRowSkeleton from "./TokenRowSkeleton";

type OrderByOption = 'market_cap' | 'newest' | 'oldest' | 'holders_count' | 'trending_score' | 'name' | 'price';
type OrderDirection = 'ASC' | 'DESC';

interface SortableColumnHeaderProps {
  children: React.ReactNode;
  sortKey: OrderByOption;
  currentSort: OrderByOption;
  currentDirection: OrderDirection;
  onSort: (sortKey: OrderByOption) => void;
  className?: string;
  title?: string;
}

function SortableColumnHeader({ 
  children, 
  sortKey, 
  currentSort, 
  currentDirection, 
  onSort, 
  className = "",
  title 
}: SortableColumnHeaderProps) {
  const isActive = children === 'Rank' || // Rank is always active since it shows current sort direction
    currentSort === sortKey || 
    (sortKey === 'newest' && currentSort === 'oldest') ||
    (sortKey === 'oldest' && currentSort === 'newest');
  
  const getDisplayDirection = () => {
    if (children === 'Rank') {
      // For rank, show the opposite direction (since rank 1 is highest value)
      return currentDirection === 'DESC' ? '↓' : '↑';
    }
    if (sortKey === 'newest' || sortKey === 'oldest') {
      // For date-based sorting, newest = DESC, oldest = ASC
      return sortKey === 'newest' ? 'DESC' : 'ASC';
    }
    return currentDirection;
  };

  const handleClick = () => {
    // Special handling for rank - it should reverse the current sort direction
    if (children === 'Rank') {
      // For rank, we want to reverse whatever the current sort is
      // This will toggle the direction of the current sort field
      onSort(currentSort);
    } else {
      onSort(sortKey);
    }
  };

  return (
    <th 
      className={`${className} cursor-pointer hover:opacity-75 transition-opacity select-none`}
      onClick={handleClick}
      title={title}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive && (
          <span className="text-[#1161FE] text-xs">
            {children === 'Rank' ? getDisplayDirection() : (getDisplayDirection() === 'DESC' ? '↓' : '↑')}
          </span>
        )}
      </div>
    </th>
  );
}

interface TokenListTableProps {
  pages?: Array<{ items: TokenDto[] }> | null;
  loading?: boolean;
  showCollectionColumn?: boolean;
  orderBy: OrderByOption;
  orderDirection: OrderDirection;
  onSort: (sortKey: OrderByOption) => void;
}

export default function TokenListTable({ pages, loading, showCollectionColumn, orderBy, orderDirection, onSort }: TokenListTableProps) {


  const allItems = useMemo(() => 
    pages?.length ? pages.map((page) => page.items).flat() : [],
    [pages]
  );

  return (
    <div className="">
      <table className="w-full bctsl-token-list-table">
        <thead>
          <tr>
            <th className="cell-fake">
              {/* Fake column that fixes ::before problem on rows */}
            </th>
            <SortableColumnHeader
              sortKey={orderBy} // This will be ignored for Rank due to special handling
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-rank text-xs opacity-50 text-left pr-2 pr-md-4"
              title="Click to reverse current ranking order"
            >
              Rank
            </SortableColumnHeader>
            <SortableColumnHeader
              sortKey="name"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-name text-xs opacity-50 text-left py-1 px-1 px-lg-3"
            >
              Token Name
            </SortableColumnHeader>
            {showCollectionColumn && (
              <th className="cell cell-collection text-xs opacity-50 text-left text-md-right py-1 px-1 px-lg-3">
                <div title="Token collection category">
                  Collection
                </div>
              </th>
            )}
            <SortableColumnHeader
              sortKey="price"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-price text-xs opacity-50 text-left text-md-right py-1 px-1 px-lg-3"
            >
              Price
            </SortableColumnHeader>
            <SortableColumnHeader
              sortKey="market_cap"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-market-cap text-xs opacity-50 text-left py-1 px-1 px-lg-3"
            >
              Market Cap
            </SortableColumnHeader>
            <SortableColumnHeader
              sortKey="holders_count"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-holders text-xs opacity-50 text-left py-1 px-1 px-lg-3"
            >
              Holders
            </SortableColumnHeader>
            <th className="cell cell-chart text-xs text-center opacity-50 py-1 pl-3">
              Performance
            </th>
            <th className="cell-link">{/* Links placeholder column */}</th>
          </tr>
        </thead>

        {loading && !allItems?.length ? (
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
              />
            ))}
          </tbody>
        )}
      </table>

      <style>{`
        .bctsl-token-list-table {
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .bctsl-token-list-table th {
          font-weight: bold;
        }

        .cell-name {
          width: auto;
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

          .cell-price {
            width: 170px;
          }
          .cell-market-cap,
          .cell-holders {
            width: 170px;
          }

          .cell-chart {
            width: 210px;
          }

          .cell-chart .chart {
            max-width: 180px;
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

          .bctsl-token-list-table > tbody > tr.mobile-only-card {
            display: table-row;
          }

          .bctsl-token-list-table > tbody > tr:not(.mobile-only-card) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
