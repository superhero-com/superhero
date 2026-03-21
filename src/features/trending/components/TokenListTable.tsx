import { TokenDto } from '@/api/generated/models/TokenDto';
import { useIsMobile } from '@/hooks';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
      return currentDirection === 'DESC' ? '↓' : '↑';
    }
    if (sortKey === 'newest' || sortKey === 'oldest') {
      return sortKey === 'newest' ? 'DESC' : 'ASC';
    }
    return currentDirection;
  };

  const handleClick = () => {
    if (isRankHeader) {
      onSort(currentSort);
    } else {
      onSort(sortKey);
    }
  };

  const displayDirection = getDisplayDirection();
  let activeDirectionIndicator: string;
  if (isRankHeader) {
    activeDirectionIndicator = displayDirection;
  } else {
    activeDirectionIndicator = displayDirection === 'DESC' ? '↓' : '↑';
  }

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
            {activeDirectionIndicator}
          </span>
        )}
      </div>
    </th>
  );
};

interface TokenListTableProps {
  pages?: Array<{ items: TokenDto[] }> | null;
  loading?: boolean;
  orderBy: OrderByOption;
  orderDirection: OrderDirection;
  onSort: (sortKey: OrderByOption) => void;
  rankOffset?: number;
}

const TokenListTable = ({
  pages, loading, orderBy, orderDirection, onSort, rankOffset = 0,
}: TokenListTableProps) => {
  const { t } = useTranslation('common');

  const allItems = useMemo(
    () => (pages?.length ? pages.map((page) => page.items).flat() : []),
    [pages],
  );
  const skeletonRows = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => `row-${idx + 1}`),
    [],
  );

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

            {/* Rank */}
            <SortableColumnHeader
              sortKey={orderBy}
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-rank text-xs opacity-50 text-left pl-3 pr-4 whitespace-nowrap"
              title={t('titles.clickToReverseRankingOrder')}
            >
              <span className="hidden md:inline">#</span>
              <span className="md:hidden inline">#</span>
            </SortableColumnHeader>

            {/* Name */}
            <SortableColumnHeader
              sortKey={isMobile ? 'market_cap' : 'name'}
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-name text-xs opacity-50 text-left py-1 px-3 whitespace-nowrap"
            >
              Name
            </SortableColumnHeader>

            {/* Price */}
            <SortableColumnHeader
              sortKey="price"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-price text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap"
            >
              <span className="hidden md:inline">Price</span>
              <span className="md:hidden">Price</span>
            </SortableColumnHeader>

            {/* 24h % — hidden on mobile */}
            <th className="cell cell-change24h text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap hidden md:table-cell">
              24h %
            </th>

            {/* 7d % — hidden on mobile */}
            <th className="cell cell-change7d text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap hidden md:table-cell">
              7d %
            </th>

            {/* 30d % — hidden on mobile and sm */}
            <th className="cell cell-change30d text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap hidden lg:table-cell">
              30d %
            </th>

            {/* Market Cap */}
            <SortableColumnHeader
              sortKey="market_cap"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-market-cap text-xs opacity-50 text-right py-1 px-3 hidden md:table-cell whitespace-nowrap"
            >
              <span>Market Cap</span>
            </SortableColumnHeader>

            {/* Volume (30d) — xl+ only */}
            <th className="cell cell-volume text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap hidden xl:table-cell">
              Volume (30d)
            </th>

            {/* Circulating Supply — xl+ only */}
            <th className="cell cell-supply text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap hidden xl:table-cell">
              Circ. Supply
            </th>

            {/* Sparkline */}
            <th className="cell cell-chart text-xs text-right opacity-50 py-1 pl-3 pr-2 whitespace-nowrap">
              <span className="hidden md:inline">All Time</span>
            </th>

            <th className="cell-link hidden lg:table-cell">{/* Links placeholder */}</th>
          </tr>
        </thead>

        {loading && !allItems?.length ? (
          <tbody className="token-list-skeleton">
            {skeletonRows.map((rowKey) => (
              <TokenRowSkeleton key={rowKey} />
            ))}
          </tbody>
        ) : (
          <tbody>
            {allItems.map((token, index) => (
              <TokenListTableRow
                key={token.address}
                token={token}
                rank={rankOffset + index + 1}
              />
            ))}
          </tbody>
        )}
      </table>

      <style>
        {`
        .bctsl-token-list-table {
          border-collapse: separate;
          border-spacing: 0 6px;
        }

        @media screen and (max-width: 767px) {
          .bctsl-token-list-table {
            border-spacing: 0;
          }

          .bctsl-token-list-table > tbody > tr.mobile-only-card:not(:last-child) > td:not(.cell-fake) {
            border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
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

          .cell-price {
            width: 145px;
          }

          .cell-change24h {
            width: 110px;
          }

          .cell-change7d {
            width: 110px;
          }

          .cell-change30d {
            width: 110px;
          }

          .cell-market-cap {
            width: 185px;
          }

          .cell-volume {
            width: 115px;
          }

          .cell-supply {
            width: 115px;
          }

          .cell-chart {
            width: 175px;
          }

          .cell-chart .chart {
            max-width: 155px;
          }

          .cell-link {
            width: 8px;
          }
        }

        /* Sticky header — desktop + tablet */
        @media screen and (min-width: 768px) {
          .bctsl-token-list-table > thead {
            position: sticky;
            top: 0;
            z-index: 20;
            background: rgba(10, 10, 20, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }

          .bctsl-token-list-table > thead th {
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 10px;
            padding-bottom: 10px;
          }
        }

        /* Tablet: hide volume and supply (they're xl:table-cell) — handled via Tailwind */

        @media screen and (max-width: 1100px) {
          .cell-name {
            font-size: 15px;
          }

          .cell-price,
          .cell-market-cap {
            font-size: 0.814em;
          }
        }

        /* Mobile header + rows */
        @media screen and (max-width: 767px) {
          .bctsl-token-list-table {
            table-layout: fixed;
            width: 100%;
          }

          /* Sticky header */
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
            font-size: 11px;
            line-height: 1rem;
            white-space: nowrap;
            background: rgba(255, 255, 255, 0.05);
            padding-top: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Column widths */
          .bctsl-token-list-table .cell-fake   { width: 0; padding: 0; }
          .bctsl-token-list-table .cell-rank   { width: 36px; }
          .bctsl-token-list-table .cell-price  { width: 88px; }
          .bctsl-token-list-table .cell-chart  { width: 72px; }
          /* hide all other columns on mobile */
          .bctsl-token-list-table .cell-change24h,
          .bctsl-token-list-table .cell-change7d,
          .bctsl-token-list-table .cell-change30d,
          .bctsl-token-list-table .cell-market-cap,
          .bctsl-token-list-table .cell-volume,
          .bctsl-token-list-table .cell-supply,
          .bctsl-token-list-table .cell-link { display: none; }

          /* Header cell padding */
          .bctsl-token-list-table > thead th.cell-rank  { padding-inline: 12px 4px; text-align: center; }
          .bctsl-token-list-table > thead th.cell-name  { padding-inline: 8px; }
          .bctsl-token-list-table > thead th.cell-price { padding-inline: 4px 8px; text-align: right; }
          .bctsl-token-list-table > thead th.cell-chart { padding-inline: 4px 12px; text-align: right; }

          /* Row visibility */
          .bctsl-token-list-table > tbody > tr.mobile-only-card { display: table-row; }
          .bctsl-token-list-table > tbody > tr:not(.mobile-only-card) { display: none; }

          /* Row separator */
          .bctsl-token-list-table > tbody > tr.mobile-only-card:not(:last-child) > td:not(.cell-fake) {
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          }

          /* Positioning context for the full-row link */
          .bctsl-token-list-table > tbody > tr.mobile-only-card {
            transform: translate(0, 0);
          }
        }
      `}
      </style>
    </div>
  );
};

export default TokenListTable;
