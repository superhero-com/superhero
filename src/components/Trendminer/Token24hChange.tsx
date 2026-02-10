import React from 'react';

interface Token24hChangeProps {
  tokenAddress: string;
  createdAt: string;
  performance24h?: {
    current_change_percent?: number;
  } | null;
}

const Token24hChange = ({
  tokenAddress,
  createdAt,
  performance24h,
}: Token24hChangeProps) => {
  // Check if token is new (created less than 24 hours ago)
  const isNewToken = () => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Format percentage without sign (sign is indicated by triangle and color)
  const formatPercentage = (percentage: number) => {
    const fixed = Math.abs(percentage).toFixed(2);
    return `${fixed}%`;
  };

  if (!performance24h) return null;

  const changePercent = performance24h?.current_change_percent ?? 0;
  // Zero and positive values both show as green (like CoinMarketCap)
  const isPositive = changePercent >= 0;

  return (
    <div className="flex items-center" data-token-address={tokenAddress}>
      {isNewToken() ? (
        <span className="px-1 py-1 rounded text-xs font-semibold text-white bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] uppercase tracking-wide">
          NEW
        </span>
      ) : (
        <span
          className={`text-sm font-semibold flex items-center gap-0.5 tabular-nums ${
            isPositive
              ? 'text-green-400'
              : 'text-red-400'
          }`}
        >
          <span className="text-[11px] leading-none">{isPositive ? '▲' : '▼'}</span>
          <span>{formatPercentage(changePercent)}</span>
        </span>
      )}
    </div>
  );
};

export default Token24hChange;
