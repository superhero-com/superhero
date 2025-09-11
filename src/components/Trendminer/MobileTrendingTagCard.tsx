import React from 'react';
import { cn } from '../../lib/utils';
import AeButton from '../AeButton';

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
}

interface MobileTrendingTagCardProps {
  tag: string;
  score: number;
  source?: string;
  token?: TokenItem;
  onTokenize?: () => void;
  onView?: () => void;
  className?: string;
}

export default function MobileTrendingTagCard({
  tag,
  score,
  source,
  token,
  onTokenize,
  onView,
  className = '',
}: MobileTrendingTagCardProps) {
  const normalizeAe = (n: number): number => {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  };

  const handleTokenize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTokenize) {
      onTokenize();
    } else {
      window.location.href = `/trendminer/create?new=${encodeURIComponent(tag)}`;
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) {
      onView();
    } else if (token) {
      window.location.href = `/trendminer/tokens/${encodeURIComponent(token.name || token.address)}`;
    }
  };

  return (
    <div className={cn(
      'bg-[var(--secondary-color)] border border-white/10 rounded-xl p-3 mb-2 transition-all duration-200',
      'sm:p-2.5 sm:mb-1.5',
      'hover:border-orange-500/30 hover:bg-white/5',
      className
    )}>
      <div className="flex justify-between items-start mb-2 sm:mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[var(--standard-font-color)] leading-tight mb-0.5 sm:text-xs">
            #{tag.toUpperCase()}
          </div>
          {source && (
            <div className="text-xs text-[var(--light-font-color)] opacity-70 sm:text-[10px]">
              via {source}
            </div>
          )}
        </div>
        <div className="text-xs font-semibold text-[var(--custom-links-color)] whitespace-nowrap ml-2 sm:text-[11px] sm:ml-1.5">
          ↑ {score.toLocaleString()}
        </div>
      </div>
      
      {token ? (
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-semibold text-[var(--custom-links-color)] font-mono sm:text-[11px]">
              {normalizeAe(Number(token.price ?? 0)).toFixed(6)} AE
            </div>
            <div className="text-[11px] text-[var(--light-font-color)] opacity-80 sm:text-[10px]">
              {token.holders_count ?? 0} holders
            </div>
          </div>
          <AeButton
            variant="accent"
            size="xs"
            outlined
            onClick={handleView}
            className="min-w-15 h-7 text-[11px] sm:min-w-12.5 sm:h-6.5 sm:text-[10px]"
          >
            View #{token.name || token.symbol}
          </AeButton>
        </div>
      ) : (
        <div className="flex justify-end">
          <AeButton
            variant="accent"
            size="xs"
            rounded
            onClick={handleTokenize}
            className="min-w-20 h-7 text-[11px] sm:min-w-17.5 sm:h-6.5 sm:text-[10px]"
          >
            Tokenize
          </AeButton>
        </div>
      )}
    </div>
  );
}
