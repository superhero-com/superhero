import React from 'react';

interface Token24hChangeProps {
  tokenAddress: string;
  createdAt: string;
  performance24h?: {
    current_change_percent?: number;
  } | null;
}

export default function Token24hChange({ 
  tokenAddress, 
  createdAt, 
  performance24h 
}: Token24hChangeProps) {
  // Check if token is new (created less than 24 hours ago)
  const isNewToken = () => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Format percentage with proper sign
  const formatPercentage = (percentage: number) => {
    const fixed = percentage.toFixed(2);
    return (fixed === '0.00' || percentage < 0 ? '' : '+') + fixed + '%';
  };

  if (!performance24h) return null;

  return (
    <div className="flex items-center">
      {isNewToken() ? (
        <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] uppercase tracking-wide">
          NEW
        </span>
      ) : (
        <span 
          className={`px-2 py-1 rounded text-xs font-semibold ${
            (performance24h?.current_change_percent ?? 0) >= 0 
              ? 'text-green-400 bg-green-400/10 border border-green-400/20' 
              : 'text-red-400 bg-red-400/10 border border-red-400/20'
          }`}
        >
          {formatPercentage(performance24h?.current_change_percent ?? 0)}
        </span>
      )}
    </div>
  );
}
