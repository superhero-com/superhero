export default function TokenRowSkeleton() {
  return (
    <tr className="bctsl-token-list-table-row token-row-skeleton rounded">
      <td className="cell cell-rank pl-2 pl-md-4">
        <div className="rank">
          <div className="skeleton-loader skeleton-text w-4 h-4 m-0" />
        </div>
      </td>
      <td className="cell cell-name px-1 px-md-3">
        <div className="skeleton-loader skeleton-text token-name w-full h-4 m-0" />
      </td>
      <td className="cell cell-price px-1 px-md-3">
        <div className="flex-container">
          <div className="skeleton-loader skeleton-text price-value w-full h-4 m-0" />
        </div>
      </td>
      <td className="cell cell-market-cap px-1 px-md-3 text-md-right">
        <div className="flex-container">
          <div className="skeleton-loader skeleton-text market-cap-value w-full h-4 m-0" />
        </div>
      </td>
      <td className="cell cell-address text-right px-1 px-md-3">
        <div className="skeleton-loader skeleton-text address-chip w-full h-4 m-0" />
      </td>
      <td className="cell cell-chart text-right pr-md-4">
        <div className="flex-container">
          <div className="chart">
            <svg
              width="139"
              height="35"
              viewBox="0 0 139 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="chart-svg"
            >
              <path d="M1 28L38.5 11.5L80 33L138 2" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </td>
      <td className="cell cell-link"></td>

      <style jsx>{`
        .token-row-skeleton {
          opacity: 0.5;
          height: 60px;
        }

        .cell-market-cap,
        .cell-price,
        .cell-chart {
          .flex-container {
            height: 100%;
            display: flex;
            justify-content: flex-end;
            align-items: center;
          }
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

        .chart {
          height: 100%;
          margin-left: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-svg {
          color: rgba(255, 255, 255, 0.12);
          opacity: 0.5;
        }

        /* Mobile responsive styles */
        @media screen and (max-width: 960px) {
          .token-row-skeleton {
            display: grid;
            grid-template-columns: 32px 5fr 2fr;
            grid-template-rows: 1fr 20px 20px;
            grid-template-areas:
              'rank name       chart'
              'rank price      chart'
              'rank market-cap chart';
            margin-top: 4px;
            padding-block: 8px;
            height: 80px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            margin: 0.5rem;
          }

          .cell {
            display: block;
          }

          .cell-collection,
          .cell-address {
            display: none;
          }

          .cell-price,
          .cell-market-cap {
            .flex-container {
              justify-content: flex-start;
              align-items: center;
            }
          }

          .cell-rank {
            padding-top: 3px;
            font-size: 12px;
            display: flex;
            align-items: center;
          }

          .token-name {
            width: 200px;
          }

          .price-value,
          .market-cap-value {
            width: 200px;
          }

          .price-value .skeleton-text,
          .market-cap-value .skeleton-text {
            height: 12px;
          }

          .chart {
            align-items: center;
            margin: 0;
            width: 200px;
          }

          .chart .chart-svg {
            transform: scale(0.8);
          }
        }
      `}</style>
    </tr>
  );
}
