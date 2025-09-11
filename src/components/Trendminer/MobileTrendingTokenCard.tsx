import React from 'react';
import { cn } from '../../lib/utils';
import TokenMiniChart from './TokenMiniChart';

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

interface MobileTrendingTokenCardProps {
  token: TokenItem;
  rank: number;
  timeframe: '30D' | '7D' | '1D';
  onClick?: () => void;
  className?: string;
}

export default function MobileTrendingTokenCard({
  token,
  rank,
  timeframe,
  onClick,
  className = '',
}: MobileTrendingTokenCardProps) {
  const normalizeAe = (n: number): number => {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/trendminer/tokens/${encodeURIComponent(token.name || token.address)}`;
    }
  };

  return (
    <div 
      className={cn(
        'bg-[var(--secondary-color)] border border-white/10 rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200',
        'sm:p-3 sm:mb-2',
        'hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:border-orange-500/30',
        'active:translate-y-0 active:transition-transform active:duration-100',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-2.5">
        <div className="text-sm font-semibold text-[var(--light-font-color)] opacity-70 min-w-8 sm:text-xs sm:min-w-7">
          #{rank}
        </div>
        <div className="flex-1 mx-3 sm:mx-2">
          <div className="text-base font-bold text-[var(--standard-font-color)] leading-tight mb-0.5 sm:text-[15px]">
            #{token.name || token.symbol}
          </div>
          <div className="text-xs text-[var(--light-font-color)] opacity-70 uppercase tracking-wider sm:text-[11px]">
            #{token.symbol}
          </div>
        </div>
        <div className="text-sm font-semibold text-[var(--custom-links-color)] font-mono text-right sm:text-xs">
          {normalizeAe(Number(token.price ?? 0)).toFixed(6)} AE
        </div>
      </div>
      
      <div className="flex justify-between mb-3 sm:mb-2.5">
        <div className="flex flex-col items-start">
          <span className="text-[11px] text-[var(--light-font-color)] opacity-70 mb-0.5 uppercase tracking-wide sm:text-[10px]">
            Market Cap
          </span>
          <span className="text-xs font-semibold text-[var(--standard-font-color)] font-mono sm:text-[11px]">
            {normalizeAe(Number(token.market_cap ?? 0)).toLocaleString()} AE
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[11px] text-[var(--light-font-color)] opacity-70 mb-0.5 uppercase tracking-wide sm:text-[10px]">
            Holders
          </span>
          <span className="text-xs font-semibold text-[var(--standard-font-color)] font-mono sm:text-[11px]">
            {token.holders_count ?? 0}
          </span>
        </div>
      </div>
      
      <div className="flex justify-center items-center h-10 bg-white/5 rounded-lg overflow-hidden sm:h-9">
        <TokenMiniChart 
          address={token.sale_address || token.address} 
          width={280} 
          height={40} 
          stroke="#ff6d15" 
          timeframe={timeframe} 
        />
      </div>
    </div>
  );
}
