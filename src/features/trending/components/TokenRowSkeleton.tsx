export default function TokenRowSkeleton() {
  return (
    <>
      {/* Mobile skeleton layout matching TokenListTableRow */}
      <tr className="token-row-skeleton mobile-only-card md:hidden relative">
        <td className="cell-fake" />
        <td className="pl-3 pr-3 py-1.5 align-middle text-center">
          <div className="skeleton-loader skeleton-text w-4 h-4 m-0" />
        </td>
        <td className="pl-2 py-1.5 pr-3 align-middle relative" colSpan={3}>
          {/* Row 1: token name skeleton */}
          <div className="skeleton-loader skeleton-text token-name w-3/4 h-4 mb-1" />
          {/* Row 2: market cap and price/24h skeletons */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="skeleton-loader skeleton-text market-cap-value w-20 h-3" />
            <div className="flex items-center gap-2 shrink-0">
              <div className="skeleton-loader skeleton-text price-value w-16 h-3" />
              <div className="skeleton-loader skeleton-text change-skeleton h-5 w-12 rounded" />
            </div>
          </div>
        </td>
      </tr>

      {/* Desktop skeleton layout */}
      <tr className="bctsl-token-list-table-row token-row-skeleton rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hidden md:table-row">
        <td className="cell-fake" />
        <td className="cell cell-rank pl-2 pl-md-4">
          <div className="rank">
            <div className="skeleton-loader skeleton-text w-4 h-4 m-0" />
          </div>
        </td>
        <td className="cell cell-name px-1 px-lg-3">
          <div className="skeleton-loader skeleton-text token-name w-full h-4 m-0" />
        </td>
        <td className="cell cell-price px-1 px-lg-3 text-left text-md-right">
          <div className="skeleton-loader skeleton-text price-value w-full h-4 m-0" />
        </td>
        <td className="cell cell-market-cap px-1 px-lg-3 text-md-right">
          <div className="skeleton-loader skeleton-text market-cap-value w-full h-4 m-0" />
        </td>
        <td className="cell cell-holders text-left px-1 px-lg-3">
          <div className="skeleton-loader skeleton-text h-4 w-8 m-0" />
        </td>
        <td className="cell cell-chart text-right pr-md-4">
          <div className="ml-auto chart max-w-[180px]">
            <div className="skeleton-loader skeleton-text h-10 w-full m-0" />
          </div>
        </td>
        <td className="cell cell-link" />
      </tr>

      <style>
        {`
        .token-row-skeleton {
          opacity: 0.5;
          height: auto;
          padding-block: 8px;
        }


        .skeleton-loader {
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0.1) 25%, 
            rgba(255, 255, 255, 0.2) 50%, 
            rgba(255, 255, 255, 0.1) 75%
          );
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .skeleton-text {
          border-radius: 4px;
        }

        .rank .skeleton-text {
          width: 16px;
          height: 16px;
          margin: 0;
        }

        .token-name,
        .collection-label,
        .price-value,
        .market-cap-value,
        .address-chip {
          width: 100%;
        }

        .token-name .skeleton-text,
        .collection-label .skeleton-text,
        .price-value .skeleton-text,
        .market-cap-value .skeleton-text,
        .address-chip .skeleton-text {
          height: 16px;
          margin: 0;
        }

        .change-skeleton {
          display: inline-block;
        }

        /* Mobile: only show columns used in mobile layout */
        @media screen and (max-width: 767px) {
          /* Keep the first (fake) column zero-width so header doesn't shift */
          .cell-fake { width: 0; padding: 0; }

          .token-row-skeleton {
            height: auto;
            padding-block: 0;
            border: none;
            margin: 0;
          }

          .bctsl-token-list-table-row.token-row-skeleton {
            display: none !important;
          }
        }
      `}
      </style>
    </>
  );
}
