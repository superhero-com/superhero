import { TokenDto } from '@/api/generated/models/TokenDto';
import { useIsMobile } from '@/hooks';
import {
  useLayoutEffect, useMemo, useRef, useState,
} from 'react';
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
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const skeletonRows = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => `row-${idx + 1}`),
    [],
  );
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const isViewportMobile = useIsMobile();
  const isEmptyLoading = !!loading && !allItems?.length;
  const isCompactTable = containerWidth !== null && containerWidth < 768;
  const isContainerMd = (containerWidth ?? 0) >= 768;
  const isContainerLg = (containerWidth ?? 0) >= 960;
  const isContainerXl = (containerWidth ?? 0) >= 1200;
  const isContainerNarrow = containerWidth !== null && containerWidth <= 1100;

  useLayoutEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.round(container.getBoundingClientRect().width);
      setContainerWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => {
        window.removeEventListener('resize', updateWidth);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={tableContainerRef}
      className="bctsl-token-list-container relative -mx-4 md:mx-0"
      data-compact={isCompactTable}
      data-container-md={isContainerMd}
      data-container-lg={isContainerLg}
      data-container-xl={isContainerXl}
      data-container-narrow={isContainerNarrow}
      style={{
        '--token-list-sticky-top': isViewportMobile
          ? 'calc(var(--mobile-navigation-height) + env(safe-area-inset-top))'
          : '0px',
      } as React.CSSProperties}
    >
      <table className="w-full bctsl-token-list-table">
        <thead className={isCompactTable && isEmptyLoading ? 'hidden' : ''}>
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
              #
            </SortableColumnHeader>

            {/* Name */}
            <SortableColumnHeader
              sortKey={isCompactTable ? 'market_cap' : 'name'}
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
              {isCompactTable ? 'Price (30d)' : 'Price'}
            </SortableColumnHeader>

            {/* 24h % — hidden on mobile */}
            <th className="cell cell-change24h text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap">
              24h %
            </th>

            {/* 7d % — hidden on mobile */}
            <th className="cell cell-change7d text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap">
              7d %
            </th>

            {/* 30d % — hidden on mobile and sm */}
            <th className="cell cell-change30d text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap">
              30d %
            </th>

            {/* Market Cap */}
            <SortableColumnHeader
              sortKey="market_cap"
              currentSort={orderBy}
              currentDirection={orderDirection}
              onSort={onSort}
              className="cell cell-market-cap text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap"
            >
              <span>Market Cap</span>
            </SortableColumnHeader>

            {/* Volume (30d) — xl+ only */}
            <th className="cell cell-volume text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap">
              Volume (30d)
            </th>

            {/* Circulating Supply — xl+ only */}
            <th className="cell cell-supply text-xs opacity-50 text-right py-1 px-3 whitespace-nowrap">
              Circ. Supply
            </th>

            {/* Sparkline */}
            <th className="cell cell-chart text-xs text-right opacity-50 py-1 pl-3 pr-2 whitespace-nowrap">
              {isCompactTable ? null : <span>All Time</span>}
            </th>

            <th className="cell-link">{/* Links placeholder */}</th>
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

        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table {
          border-spacing: 0;
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

        /* --- Container-width-based column visibility --- */
        /* Default: hide all optional columns (narrow container / mobile) */
        .bctsl-token-list-table .cell-change24h,
        .bctsl-token-list-table .cell-change7d,
        .bctsl-token-list-table .cell-change30d,
        .bctsl-token-list-table .cell-market-cap,
        .bctsl-token-list-table .cell-volume,
        .bctsl-token-list-table .cell-supply,
        .bctsl-token-list-table .cell-link {
          display: none;
        }

        /* ≥ 768px container: show 24h%, 7d%, Market Cap, link */
        .bctsl-token-list-container[data-container-md="true"] .bctsl-token-list-table .cell-change24h,
        .bctsl-token-list-container[data-container-md="true"] .bctsl-token-list-table .cell-change7d,
        .bctsl-token-list-container[data-container-md="true"] .bctsl-token-list-table .cell-market-cap,
        .bctsl-token-list-container[data-container-md="true"] .bctsl-token-list-table .cell-link {
          display: table-cell;
        }

        /* ≥ 960px container: show 30d%, set column widths */
        .bctsl-token-list-container[data-container-lg="true"] .bctsl-token-list-table .cell-change30d {
          display: table-cell;
        }

        .bctsl-token-list-container[data-container-lg="true"] .cell-rank { width: 52px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-price { width: 145px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-change24h { width: 110px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-change7d { width: 110px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-change30d { width: 110px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-market-cap { width: 185px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-chart { width: 175px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-chart .chart { max-width: 155px; }
        .bctsl-token-list-container[data-container-lg="true"] .cell-link { width: 8px; }

        /* ≥ 1200px container: show Volume and Supply */
        .bctsl-token-list-container[data-container-xl="true"] .bctsl-token-list-table .cell-volume,
        .bctsl-token-list-container[data-container-xl="true"] .bctsl-token-list-table .cell-supply {
          display: table-cell;
        }

        .bctsl-token-list-container[data-container-xl="true"] .cell-volume { width: 115px; }
        .bctsl-token-list-container[data-container-xl="true"] .cell-supply { width: 115px; }

        /* Sticky header — when container is ≥ 768px */
        .bctsl-token-list-container[data-container-md="true"] .bctsl-token-list-table > thead {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .bctsl-token-list-container[data-container-md="true"] .bctsl-token-list-table > thead th {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 10px;
          padding-bottom: 10px;
        }

        /* Narrower container: reduce font sizes */
        .bctsl-token-list-container[data-container-narrow="true"] .cell-name {
          font-size: 15px;
        }

        .bctsl-token-list-container[data-container-narrow="true"] .cell-price,
        .bctsl-token-list-container[data-container-narrow="true"] .cell-market-cap {
          font-size: 0.814em;
        }

        /* Compact table layout */
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table {
          table-layout: fixed;
          width: 100%;
        }

        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > thead {
          display: table-header-group;
          position: sticky;
          top: var(--token-list-sticky-top);
          z-index: 20;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > thead th {
          font-size: 11px;
          line-height: 1rem;
          white-space: nowrap;
          background: rgba(255, 255, 255, 0.05);
          padding-top: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-fake { width: 0; padding: 0; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-rank { width: 36px; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-price { width: 88px; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-chart { width: 72px; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-change24h,
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-change7d,
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-change30d,
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-market-cap,
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-volume,
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-supply,
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table .cell-link { display: none; }

        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > thead th.cell-rank { padding-inline: 12px 4px; text-align: center; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > thead th.cell-name { padding-inline: 8px; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > thead th.cell-price { padding-inline: 4px 8px; text-align: right; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > thead th.cell-chart { padding-inline: 4px 12px; text-align: right; }

        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > tbody > tr.mobile-only-card { display: table-row; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > tbody > tr:not(.mobile-only-card) { display: none; }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > tbody > tr.mobile-only-card:not(:last-child) > td:not(.cell-fake) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }
        .bctsl-token-list-container[data-compact="true"] .bctsl-token-list-table > tbody > tr.mobile-only-card {
          transform: translate(0, 0);
        }

        /* Standard table layout */
        .bctsl-token-list-container[data-compact="false"] .bctsl-token-list-table > tbody > tr.mobile-only-card {
          display: none;
        }
        .bctsl-token-list-container[data-compact="false"] .bctsl-token-list-table > tbody > tr:not(.mobile-only-card) {
          display: table-row;
        }
      `}
      </style>
    </div>
  );
};

export default TokenListTable;
