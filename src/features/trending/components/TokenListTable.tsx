import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenDto } from '@/api/generated/models/TokenDto';
import { useIsMobile } from '@/hooks';
import TokenListTableRow from './TokenListTableRow';
import TokenRowSkeleton from './TokenRowSkeleton';

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

const SortableColumnHeader = ({
  children,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  className = '',
  title,
}: SortableColumnHeaderProps) => {
  const isRankHeader = typeof children === 'string' && (children === 'Rank' || children === '#');
  const isActive = currentSort === sortKey
    || (sortKey === 'newest' && currentSort === 'oldest')
    || (sortKey === 'oldest' && currentSort === 'newest');

  const getDisplayDirection = () => {
    if (isRankHeader) {
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
    if (isRankHeader) {
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
            {isRankHeader ? getDisplayDirection() : (getDisplayDirection() === 'DESC' ? '↓' : '↑')}
          </span>
        )}
      </div>
    </th>
  );
};

interface TokenListTableProps {
  pages?: Array<{ items: TokenDto[] }> | null;
  loading?: boolean;
  showCollectionColumn?: boolean;
  orderBy: OrderByOption;
  orderDirection: OrderDirection;
  onSort: (sortKey: OrderByOption) => void;
  rankOffset?: number;
  hasNextPage?: boolean;
  isFetching?: boolean;
  onLoadMore?: () => void;
}

export default function TokenListTable({
  pages, loading, showCollectionColumn, orderBy, orderDirection, onSort, rankOffset = 0, hasNextPage, isFetching, onLoadMore,
}: TokenListTableProps) {
  const { t } = useTranslation('common');

  const allItems = useMemo(
    () => (pages?.length ? pages.map((page) => page.items).flat() : []),
    [pages],
  );

  // Detect mobile viewport to map the "Market cap" header to market_cap sorting
  const isMobile = useIsMobile();

  const isEmptyLoading = !!loading && !allItems?.length;

  return (
    <div className="relative -mx-4 md:mx-0">
      <table className="w-full bctsl-token-list-table">
        <thead className={`${isMobile && isEmptyLoading ? 'hidden md:table-header-group' : ''}`}>
          <tr>
            <th className="cell-fake">
              {/* Fake column that fixes ::before problem on rows */}
            </th>
            <SortableColumnHeader
              sortKey={orderBy} // This will be ignored for Rank due to special handling
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-rank text-xs opacity-50 text-left pr-2 pr-md-4 whitespace-nowrap"
              title={t('titles.clickToReverseRankingOrder')}
            >
              <span className="hidden md:inline">Rank</span>
              <span className="md:hidden inline">#</span>
            </SortableColumnHeader>
            <SortableColumnHeader
              sortKey={isMobile ? 'market_cap' : 'name'}
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-name text-xs opacity-50 text-left py-1 px-1 px-lg-3 whitespace-nowrap"
            >
              <span className="hidden md:inline">Token Name</span>
              <span className="md:hidden inline">Market cap</span>
            </SortableColumnHeader>
            {showCollectionColumn && (
              <th className="cell cell-collection text-xs opacity-50 text-left text-md-right py-1 px-1 px-lg-3 hidden md:table-cell">
                <div title={t('titles.tokenCollectionCategory')}>
                  Collection
                </div>
              </th>
            )}
            <SortableColumnHeader
              sortKey="price"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-price text-xs opacity-50 text-left text-md-right py-1 px-1 px-lg-3 whitespace-nowrap"
            >
              Price
            </SortableColumnHeader>
            <SortableColumnHeader
              sortKey="market_cap"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-market-cap text-xs opacity-50 text-left py-1 px-1 px-lg-3 hidden md:table-cell"
            >
              Market Cap
            </SortableColumnHeader>
            <SortableColumnHeader
              sortKey="holders_count"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-holders text-xs opacity-50 text-left py-1 px-1 px-lg-3 hidden md:table-cell"
            >
              Holders
            </SortableColumnHeader>
            <th className="cell cell-chart text-xs text-center opacity-50 py-1 pl-3 whitespace-nowrap">
              <span className="hidden md:inline">Performance</span>
              <span className="md:hidden inline">Performance</span>
            </th>
            <th className="cell-link hidden lg:table-cell">{/* Links placeholder column */}</th>
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
                rank={rankOffset + index + 1}
              />
            ))}
          </tbody>
        )}
      </table>

      {/* Mobile-only Load More inside the list */}
      {hasNextPage && onLoadMore && (
        <div className="md:hidden text-center pt-2 pb-3">
          <button
            onClick={() => onLoadMore()}
            disabled={isFetching}
            className={`${isFetching
              ? 'bg-white/10 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300'} px-6 py-2 rounded-full border-none text-white cursor-pointer text-sm font-semibold tracking-wide`}
          >
            {isFetching ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      <style>
        {`
        .bctsl-token-list-table {
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        @media screen and (max-width: 767px) {
          .bctsl-token-list-table {
            border-spacing: 0;
          }

          .bctsl-token-list-table > tbody > tr.mobile-only-card:not(:last-child) > td {
            border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
          }
          
          .bctsl-token-list-table > tbody > tr.mobile-only-card:not(:last-child) > td.cell-fake {
            border-bottom: none !important;
          }
        }

        .bctsl-token-list-table th {
          font-weight: bold;
        }

        .bctsl-token-list-table .cell-fake {
          width: 0 !important;
          padding: 0 !important;
          border: none !important;
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
        
        /* Hide cell-link on tablets (768px - 1024px) */
        @media screen and (min-width: 768px) and (max-width: 1024px) {
          .bctsl-token-list-table .cell-link,
          .bctsl-token-list-table > thead > tr > th.cell-link,
          .bctsl-token-list-table > tbody > tr > td.cell-link {
            display: none !important;
            width: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          
          /* Ensure chart column has same width as desktop for consistent chart sizes */
          .bctsl-token-list-table .cell-chart {
            width: 210px;
          }
          
          .bctsl-token-list-table .cell-chart .chart {
            max-width: 180px;
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

        /* Mobile header + rows (only for screens < 768px) */
        @media screen and (max-width: 767px) {
          .bctsl-token-list-table {
            table-layout: fixed; /* stabilize widths during skeleton */
            width: 100%;
          }

          .bctsl-token-list-table > thead {
            display: table-header-group;
            position: sticky;
            top: calc(var(--mobile-navigation-height) + env(safe-area-inset-top));
            z-index: 20;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          
          .bctsl-token-list-table > thead th {
            font-size: 11px; /* slightly smaller to fit labels */
            line-height: 1rem;
            white-space: nowrap; /* prevent wrapping by default */
            background: rgba(255, 255, 255, 0.05);
            padding-top: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            /* Full-width header - restore padding for content alignment */
            padding-left: 16px;
            padding-right: 16px;
          }
          
          .bctsl-token-list-table > thead th.cell-rank {
            padding-left: 16px;
            padding-right: 12px;
          }
          
          .bctsl-token-list-table > thead th.cell-name {
            padding-left: 8px;
          }
          
          .bctsl-token-list-table > thead th.cell-chart {
            padding-inline: 0 16px;
          }
          
          /* Center Price header on mobile */
          .bctsl-token-list-table > thead > tr > th.cell-price {
            text-align: center !important;
            padding-right: 0 !important;
          }
          
          .bctsl-token-list-table > thead > tr > th.cell-price > div {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100% !important;
            gap: 4px !important;
          }

          /* Keep consistent column widths */
          .bctsl-token-list-table .cell-fake { width: 0; padding: 0; }
          .bctsl-token-list-table .cell-rank { 
            width: 36px; 
            padding-left: 8px !important; 
            text-align: center !important;
          }
          .bctsl-token-list-table > thead > tr > th.cell-rank {
            text-align: center !important;
          }
          .bctsl-token-list-table .cell-price { width: 32%; }
          .bctsl-token-list-table .cell-chart { width: 24%; padding-right: 8px; }
          
          /* Ensure price alignment in mobile view */
          .bctsl-token-list-table .mobile-only-card .only-fiat {
            text-align: right;
          }
          
          /* Allow wrapping for Price and Performance labels on very small screens */
          @media screen and (max-width: 420px) {
            .bctsl-token-list-table > thead > tr > th.cell-price,
            .bctsl-token-list-table > thead > tr > th.cell-chart {
              white-space: normal;
            }
          }
          
          /* Right-align Performance header on mobile */
          .bctsl-token-list-table > thead > tr > th.cell-chart {
            text-align: right !important;
          }

          .bctsl-token-list-table > tbody > tr.mobile-only-card td {
            font-size: 14px;
          }

          .bctsl-token-list-table > tbody > tr.mobile-only-card {
            display: table-row;
          }

          .bctsl-token-list-table > tbody > tr:not(.mobile-only-card) {
            display: none;
          }
        }
      `}
      </style>
    </div>
  );
}
