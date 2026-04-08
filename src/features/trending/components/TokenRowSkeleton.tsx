const TokenRowSkeleton = () => (
  <>
    {/* Mobile skeleton — matches mobile-only-card layout */}
    <tr className="token-row-skeleton mobile-only-card md:hidden relative">
      <td className="cell-fake" />
      <td className="pl-2 pr-1 py-2.5 align-middle text-center">
        <div
          className="skeleton-loader skeleton-text w-4 h-4 m-0"
          role="presentation"
          aria-hidden="true"
        />
      </td>
      <td className="pl-2 py-2.5 pr-3 align-middle relative" colSpan={3}>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            {/* Name skeleton */}
            <div className="skeleton-loader skeleton-text token-name w-3/4 h-4 mb-1.5" role="presentation" aria-hidden="true" />
            {/* MC + price skeleton */}
            <div className="flex items-center justify-between gap-3">
              <div className="skeleton-loader skeleton-text w-20 h-3" role="presentation" aria-hidden="true" />
              <div className="flex items-center gap-2 shrink-0">
                <div className="skeleton-loader skeleton-text w-16 h-3" role="presentation" aria-hidden="true" />
                <div className="skeleton-loader skeleton-text w-12 h-3 rounded" role="presentation" aria-hidden="true" />
              </div>
            </div>
          </div>
          {/* Sparkline skeleton */}
          <div className="skeleton-loader w-[68px] h-7 rounded flex-shrink-0" role="presentation" aria-hidden="true" />
        </div>
      </td>
    </tr>

    {/* Desktop skeleton row */}
    <tr className="bctsl-token-list-table-row token-row-skeleton rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hidden md:table-row">
      <td className="cell-fake" />

      {/* Rank */}
      <td className="cell cell-rank pl-2 pl-md-4">
        <div className="skeleton-loader skeleton-text w-4 h-4 m-0" role="presentation" aria-hidden="true" />
      </td>

      {/* Name */}
      <td className="cell cell-name px-2">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="skeleton-loader skeleton-text token-name w-3/4 h-4 m-0 mb-1" role="presentation" aria-hidden="true" />
            <div className="skeleton-loader skeleton-text w-1/2 h-3 m-0" role="presentation" aria-hidden="true" />
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="cell cell-price px-1 text-right">
        <div className="skeleton-loader skeleton-text price-value w-full h-4 m-0" role="presentation" aria-hidden="true" />
      </td>

      {/* 24h % */}
      <td className="cell cell-change24h px-1 text-right">
        <div className="skeleton-loader skeleton-text w-12 h-4 m-0 ml-auto" role="presentation" aria-hidden="true" />
      </td>

      {/* 7d % */}
      <td className="cell cell-change7d px-1 text-right">
        <div className="skeleton-loader skeleton-text w-12 h-4 m-0 ml-auto" role="presentation" aria-hidden="true" />
      </td>

      {/* 30d % */}
      <td className="cell cell-change30d px-1 text-right">
        <div className="skeleton-loader skeleton-text w-12 h-4 m-0 ml-auto" role="presentation" aria-hidden="true" />
      </td>

      {/* Market Cap */}
      <td className="cell cell-market-cap px-1 text-right">
        <div className="skeleton-loader skeleton-text market-cap-value w-full h-4 m-0" role="presentation" aria-hidden="true" />
      </td>

      {/* Volume (xl) */}
      <td className="cell cell-volume px-1 text-right">
        <div className="skeleton-loader skeleton-text w-full h-4 m-0" role="presentation" aria-hidden="true" />
      </td>

      {/* Circ. Supply (xl) */}
      <td className="cell cell-supply px-1 text-right">
        <div className="skeleton-loader skeleton-text w-full h-4 m-0" role="presentation" aria-hidden="true" />
      </td>

      {/* Chart */}
      <td className="cell cell-chart text-right pr-2 pr-md-4">
        <div className="ml-auto chart max-w-[160px]">
          <div className="skeleton-loader skeleton-text h-10 w-full m-0" role="presentation" aria-hidden="true" />
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
            rgba(255, 255, 255, 0.08) 25%,
            rgba(255, 255, 255, 0.16) 50%,
            rgba(255, 255, 255, 0.08) 75%
          );
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-text {
          border-radius: 4px;
        }

        .token-name,
        .price-value,
        .market-cap-value {
          width: 100%;
        }

        @media screen and (max-width: 767px) {
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

export default TokenRowSkeleton;
