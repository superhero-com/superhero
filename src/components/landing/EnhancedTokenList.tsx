import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { TokenDto } from "@/api/generated/models/TokenDto";
import { PriceDataFormatter } from "@/features/shared/components";
import { TokenLineChart } from "@/features/trending/components/TokenLineChart";
import { useSectionTheme } from "../layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { PerformanceTimeframeSelector } from "@/features/trending";

type SortOption = 'trending_score' | 'market_cap' | 'price' | 'newest' | 'holders_count';

interface EnhancedTokenListProps {
  tokens: TokenDto[];
  loading?: boolean;
  orderBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

// Medal/Rank Badge Component
function RankBadge({ rank, colors }: { rank: number; colors: any }) {
  if (rank === 1) {
    return (
      <div className="relative">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ 
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            boxShadow: '0 2px 10px rgba(255, 215, 0, 0.4)'
          }}
        >
          <span className="text-amber-900">1</span>
        </div>
        {/* Crown icon */}
        <svg className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
        </svg>
      </div>
    );
  }
  
  if (rank === 2) {
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ 
          background: 'linear-gradient(135deg, #E8E8E8 0%, #B8B8B8 100%)',
          boxShadow: '0 2px 8px rgba(184, 184, 184, 0.3)'
        }}
      >
        <span className="text-gray-700">2</span>
      </div>
    );
  }
  
  if (rank === 3) {
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ 
          background: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)',
          boxShadow: '0 2px 8px rgba(205, 127, 50, 0.3)'
        }}
      >
        <span className="text-orange-100">3</span>
      </div>
    );
  }
  
  return (
    <div 
      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
      style={{ 
        background: `${colors.primary}15`,
        color: colors.primary
      }}
    >
      {rank}
    </div>
  );
}

// Sort Filter Chip Component
function SortChip({ 
  label, 
  value, 
  isActive, 
  onClick, 
  colors,
  isDark 
}: { 
  label: string; 
  value: SortOption; 
  isActive: boolean; 
  onClick: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200
        ${isActive 
          ? 'text-white shadow-md' 
          : isDark 
            ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50' 
            : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }
      `}
      style={isActive ? { 
        background: colors.gradient,
        boxShadow: `0 2px 10px ${colors.primary}40`
      } : undefined}
    >
      {label}
    </button>
  );
}

// Get chart color based on rank - neon style colors
function getChartColorForRank(rank: number, defaultColor: string): string {
  switch (rank) {
    case 1:
      return 'rgb(255, 215, 0)'; // Neon Gold
    case 2:
      return 'rgb(192, 192, 220)'; // Neon Silver
    case 3:
      return 'rgb(255, 140, 50)'; // Neon Bronze/Orange
    default:
      return 'rgb(6, 182, 212)'; // Neon Cyan
  }
}

// Token Row Component
function TokenRow({ 
  token, 
  rank, 
  colors, 
  isDark 
}: { 
  token: TokenDto; 
  rank: number; 
  colors: any; 
  isDark: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const chartColor = getChartColorForRank(rank, colors.primary);
  
  return (
    <Link
      to={`/trends/tokens/${encodeURIComponent(token.name || token.address)}`}
      className="no-underline no-gradient-text block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`
          relative rounded-xl p-4 mb-2
          transition-all duration-300 ease-out
          ${isDark 
            ? 'bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50' 
            : 'bg-white hover:bg-gray-50 border border-gray-100'
          }
          ${isHovered ? 'transform -translate-y-0.5 shadow-lg' : 'shadow-sm'}
        `}
        style={{
          borderColor: isHovered ? `${colors.primary}40` : undefined,
          boxShadow: isHovered ? `0 8px 25px ${colors.primary}15` : undefined
        }}
      >
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-center">
          {/* Rank - 1 col */}
          <div className="col-span-1 flex justify-center">
            <RankBadge rank={rank} colors={colors} />
          </div>
          
          {/* Name & Symbol - 3 cols */}
          <div className="col-span-3 flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ 
                background: `${colors.primary}15`,
                color: colors.primary
              }}
            >
              #
            </div>
            <div>
              <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {token.name || token.symbol}
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                #{token.symbol || token.name}
              </div>
            </div>
          </div>
          
          {/* Price - 2 cols */}
          <div className="col-span-2 text-right">
            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <PriceDataFormatter
                hideFiatPrice
                priceData={token.price_data}
              />
            </div>
          </div>
          
          {/* Market Cap - 2 cols */}
          <div className="col-span-2 text-right">
            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <PriceDataFormatter
                bignumber
                hideFiatPrice
                priceData={token.market_cap_data}
              />
            </div>
          </div>
          
          {/* Holders - 1 col */}
          <div className="col-span-1 text-center">
            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {token.holders_count?.toLocaleString() || '0'}
            </div>
          </div>
          
          {/* Performance Chart - 3 cols */}
          <div className="col-span-3 flex items-center justify-end gap-3">
            <div className="w-32">
              <TokenLineChart
                saleAddress={token.sale_address || token.address}
                height={36}
                hideTimeframe={true}
                lineColor={chartColor}
              />
            </div>
            {/* Arrow indicator */}
            <div 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                transition-all duration-300
                ${isHovered ? 'translate-x-1' : ''}
              `}
              style={{ background: `${colors.primary}15` }}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke={colors.primary} 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-start gap-3">
            {/* Rank */}
            <RankBadge rank={rank} colors={colors} />
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Top Row: Name & Price */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: colors.primary }} className="text-lg font-bold">#</span>
                  <span className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {token.name || token.symbol}
                  </span>
                </div>
                <div className={`text-sm font-medium shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <PriceDataFormatter
                    hideFiatPrice
                    priceData={token.price_data}
                  />
                </div>
              </div>
              
              {/* Bottom Row: Market Cap, Holders, Chart */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>MCap</div>
                    <div className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <PriceDataFormatter
                        bignumber
                        hideFiatPrice
                        priceData={token.market_cap_data}
                      />
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Holders</div>
                    <div className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {token.holders_count?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
                
                {/* Mini Chart */}
                <div className="w-20">
                  <TokenLineChart
                    saleAddress={token.sale_address || token.address}
                    height={28}
                    hideTimeframe={true}
                    lineColor={chartColor}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hover glow effect */}
        {isHovered && (
          <div 
            className="absolute inset-0 rounded-xl pointer-events-none opacity-5"
            style={{ background: colors.gradient }}
          />
        )}
      </div>
    </Link>
  );
}

export default function EnhancedTokenList({
  tokens,
  loading,
  orderBy,
  onSortChange,
  search,
  onSearchChange
}: EnhancedTokenListProps) {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  
  const sortOptions: { label: string; value: SortOption }[] = [
    { label: '🔥 Trending', value: 'trending_score' },
    { label: '💰 Market Cap', value: 'market_cap' },
    { label: '📈 Price', value: 'price' },
    { label: '✨ Newest', value: 'newest' },
    { label: '👥 Holders', value: 'holders_count' },
  ];

  return (
    <div className="enhanced-token-list">
      {/* Header with Search & Filters */}
      <div className="mb-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <svg 
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search hashtags by name..."
            className={`
              w-full pl-12 pr-4 py-3 rounded-2xl text-sm
              transition-all duration-200
              ${isDark 
                ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-slate-600' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300'
              }
              border focus:outline-none focus:ring-2 focus:ring-opacity-20
            `}
            style={{ 
              focusRingColor: colors.primary,
            }}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Filter Chips Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {sortOptions.map((option) => (
              <SortChip
                key={option.value}
                label={option.label}
                value={option.value}
                isActive={orderBy === option.value}
                onClick={() => onSortChange(option.value)}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </div>
          
          {/* Timeframe Selector */}
          <div className="shrink-0">
            <PerformanceTimeframeSelector />
          </div>
        </div>
      </div>

      {/* Column Headers - Desktop Only */}
      <div className={`hidden md:grid md:grid-cols-12 md:gap-4 md:items-center px-4 py-2 mb-2 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <div className="col-span-1 text-center">Rank</div>
        <div className="col-span-3">Token Name</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">Market Cap</div>
        <div className="col-span-1 text-center">Holders</div>
        <div className="col-span-3 text-right">Performance</div>
      </div>

      {/* Token Rows */}
      {loading ? (
        // Skeleton Loading
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i}
              className={`
                rounded-xl p-4 animate-pulse
                ${isDark ? 'bg-slate-800/30' : 'bg-gray-100'}
              `}
            >
              <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-center">
                <div className="col-span-1 flex justify-center">
                  <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className="space-y-2">
                    <div className={`h-4 w-24 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <div className={`h-3 w-16 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className={`h-4 w-20 rounded ml-auto ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className="col-span-2">
                  <div className={`h-4 w-24 rounded ml-auto ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className="col-span-1">
                  <div className={`h-4 w-12 rounded mx-auto ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className="col-span-3 flex justify-end">
                  <div className={`h-9 w-32 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
              </div>
              
              {/* Mobile skeleton */}
              <div className="md:hidden flex gap-3">
                <div className={`w-8 h-8 rounded-lg shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className={`h-4 w-24 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <div className={`h-4 w-16 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                  <div className="flex justify-between">
                    <div className={`h-3 w-32 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <div className={`h-6 w-20 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        // Empty State
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'}`}>
          <svg 
            className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No hashtags found
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {search ? `No results for "${search}"` : 'Be the first to create a hashtag!'}
          </p>
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="mt-4 text-sm font-medium"
              style={{ color: colors.primary }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        // Token List
        <div className="space-y-0">
          {tokens.map((token, index) => (
            <TokenRow
              key={token.address}
              token={token}
              rank={index + 1}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

