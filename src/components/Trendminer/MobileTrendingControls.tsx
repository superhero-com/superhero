import React from 'react';
import { cn } from '../../lib/utils';
import AeButton from '../AeButton';

interface MobileTrendingControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  orderBy: string;
  onOrderByChange: (value: string) => void;
  timeframe: '30D' | '7D' | '1D';
  onTimeframeChange: (value: '30D' | '7D' | '1D') => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export default function MobileTrendingControls({
  search,
  onSearchChange,
  orderBy,
  onOrderByChange,
  timeframe,
  onTimeframeChange,
  onRefresh,
  loading = false,
  className = '',
}: MobileTrendingControlsProps) {
  const getOrderByLabel = (value: string) => {
    switch (value) {
      case 'trending_score': return 'Hot';
      case 'market_cap': return 'Market Cap';
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'holders_count': return 'Holders';
      default: return value;
    }
  };

  return (
    <div className={cn(
      'bg-[var(--secondary-color)] border border-white/10 rounded-2xl p-4 mb-4 sm:p-3 sm:mb-3',
      className
    )}>
      {/* Search Bar */}
      <div className="mb-4 sm:mb-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tokens..."
            className="w-full px-4 py-3 pr-10 border border-white/20 rounded-xl bg-white/5 text-[var(--standard-font-color)] text-base transition-all duration-200 focus:outline-none focus:border-[var(--custom-links-color)] focus:shadow-[0_0_0_2px_rgba(0,255,157,0.2)] focus:bg-white/8 placeholder:text-[var(--light-font-color)] placeholder:opacity-60 sm:px-3.5 sm:py-2.5 sm:pr-9 sm:text-[15px]"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-[var(--light-font-color)] text-lg cursor-pointer p-1 rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:text-[var(--standard-font-color)] active:scale-90 sm:right-2.5 sm:text-base sm:w-5 sm:h-5"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col gap-4 sm:gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--light-font-color)] uppercase tracking-wider sm:text-[11px]">
            Sort by
          </label>
          <select
            value={orderBy}
            onChange={(e) => onOrderByChange(e.target.value)}
            className="px-3 py-2.5 border border-white/20 rounded-lg bg-white/5 text-[var(--standard-font-color)] text-sm cursor-pointer transition-all duration-200 focus:outline-none focus:border-[var(--custom-links-color)] focus:shadow-[0_0_0_2px_rgba(0,255,157,0.2)] sm:px-2.5 sm:py-2 sm:text-xs"
          >
            <option value="trending_score" className="bg-[var(--secondary-color)] text-[var(--standard-font-color)]">Hot</option>
            <option value="market_cap" className="bg-[var(--secondary-color)] text-[var(--standard-font-color)]">Market Cap</option>
            <option value="newest" className="bg-[var(--secondary-color)] text-[var(--standard-font-color)]">Newest</option>
            <option value="oldest" className="bg-[var(--secondary-color)] text-[var(--standard-font-color)]">Oldest</option>
            <option value="holders_count" className="bg-[var(--secondary-color)] text-[var(--standard-font-color)]">Holders</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--light-font-color)] uppercase tracking-wider sm:text-[11px]">
            Timeframe
          </label>
          <div className="flex gap-2">
            {(['30D', '7D', '1D'] as const).map((tf) => (
              <button
                key={tf}
                className={cn(
                  'flex-1 px-3 py-2 border rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 active:scale-95 sm:px-2.5 sm:py-1.5 sm:text-xs',
                  timeframe === tf
                    ? 'bg-[var(--custom-links-color)] border-[var(--custom-links-color)] text-black font-semibold'
                    : 'border-white/20 bg-white/5 text-[var(--light-font-color)] hover:bg-white/10 hover:border-white/30'
                )}
                onClick={() => onTimeframeChange(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end mt-3 sm:mt-2">
        {onRefresh && (
          <AeButton
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="min-w-20 sm:min-w-17.5 sm:text-xs"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </AeButton>
        )}
      </div>
    </div>
  );
}
