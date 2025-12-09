import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Flame, Zap } from 'lucide-react';
import { PriceDataFormatter } from '@/features/shared/components';
import TokenLineChart from '@/features/trending/components/TokenLineChart';

const SORT = {
  marketCap: 'market_cap',
  trendingScore: 'trending_score',
  price: 'price',
  name: 'name',
  newest: 'newest',
  oldest: 'oldest',
  holdersCount: 'holders_count',
} as const;

type OrderByOption = typeof SORT[keyof typeof SORT];

export default function DashboardTrendingTokens() {
  const navigate = useNavigate();
  const loadMoreBtn = useRef<HTMLButtonElement>(null);
  const [orderBy] = useState<OrderByOption>(SORT.trendingScore);
  const [orderDirection] = useState<'ASC' | 'DESC'>('DESC');

  const { data, isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      TokensService.listAll({
        orderBy: orderBy as any,
        orderDirection,
        limit: 20,
        page: pageParam,
      }),
    getNextPageParam: (lastPage: any, allPages, lastPageParam) =>
      lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
        ? undefined
        : lastPageParam + 1,
    queryKey: ['dashboard-trending-tokens', orderBy, orderDirection],
    staleTime: 1000 * 60, // 1 minute
  });

  const tokens = useMemo(() => 
    data?.pages?.length ? data.pages.map((page) => page.items).flat() : [],
    [data]
  ) as TokenDto[];

  // Intersection observer for infinite loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio === 1 && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    if (loadMoreBtn.current) {
      observer.observe(loadMoreBtn.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetching, fetchNextPage]);

  // Get trending score from token - it might be in metaInfo or as a computed field
  const getTrendingScore = (token: TokenDto): number => {
    // Check if trending_score is in metaInfo
    if (token.metaInfo && typeof token.metaInfo.trending_score === 'number') {
      return token.metaInfo.trending_score;
    }
    if (token.metaInfo && typeof token.metaInfo.trending_score === 'string') {
      return parseFloat(token.metaInfo.trending_score) || 0;
    }
    // Check if it's a direct property (might be added by backend)
    if ((token as any).trending_score !== undefined) {
      const score = (token as any).trending_score;
      return typeof score === 'number' ? score : parseFloat(String(score)) || 0;
    }
    return 0;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600 shadow-yellow-500/50';
    if (rank === 2) return 'from-gray-300 to-gray-500 shadow-gray-400/50';
    if (rank === 3) return 'from-orange-400 to-orange-600 shadow-orange-500/50';
    return 'from-white/10 to-white/5';
  };

  const getRankIcon = (rank: number) => {
    // Return null to use numbers instead of emojis
    return null;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Trending Tokens</h1>
            <p className="text-xs text-white/60">Ranked by trending score</p>
          </div>
        </div>
      </div>

      {/* Token List - Compact Table Style */}
      <GlassSurface className="overflow-hidden" interactive={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Rank</th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Token</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Market Cap</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Price</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Chart</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token: TokenDto, index: number) => {
                const rank = index + 1;
                const tokenName = token.name || token.symbol || 'Unnamed';

                return (
                  <tr
                    key={token.address}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group relative hover:translate-y-0"
                    onClick={() => navigate(`/trends/tokens/${encodeURIComponent(tokenName)}`)}
                  >
                    {/* Rank */}
                    <td className="py-2 pl-3 pr-0.5">
                      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br ${getRankBadgeColor(rank)} font-bold ${rank <= 3 ? 'text-gray-900' : 'text-white'} text-xs shadow-md`}>
                        {rank}
                      </div>
                    </td>
                    
                    {/* Token Name */}
                    <td className="py-2 pl-0.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-sm group-hover:text-[var(--neon-teal)] transition-colors">
                          <span className="text-white/60 text-xs mr-0.5">#</span>
                          {token.symbol || token.name}
                        </span>
                        {rank <= 3 && (
                          <span className="flex-shrink-0">
                            {rank === 1 && <Zap className="w-3 h-3 text-yellow-400" />}
                            {rank === 2 && <TrendingUp className="w-3 h-3 text-gray-300" />}
                            {rank === 3 && <Flame className="w-3 h-3 text-orange-400" />}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Market Cap */}
                    <td className="py-2 px-3 text-right">
                      <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent text-xs text-right inline-block ml-auto">
                        <PriceDataFormatter
                          bignumber
                          hideFiatPrice
                          priceData={token.market_cap_data}
                        />
                      </div>
                    </td>
                    
                    {/* Price */}
                    <td className="py-2 px-3 text-right">
                      <div className="bg-gradient-to-r from-yellow-400 to-cyan-500 bg-clip-text text-transparent text-xs text-right inline-block ml-auto">
                        <PriceDataFormatter
                          hideFiatPrice
                          priceData={token.price_data}
                        />
                      </div>
                    </td>
                    
                    {/* Chart */}
                    <td className="py-2 px-3 text-right">
                      {token.sale_address && (
                        <div className="ml-auto max-w-[100px]">
                          <TokenLineChart
                            saleAddress={token.sale_address}
                            height={24}
                            hideTimeframe={true}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassSurface>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="mt-4 text-center">
          <button
            ref={loadMoreBtn}
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            className={`px-4 py-2 rounded-lg border-none text-white cursor-pointer text-xs font-semibold transition-all duration-300 ${
              isFetching
                ? 'bg-white/10 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:scale-105'
            }`}
          >
            {isFetching ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!tokens.length && !isFetching && (
        <GlassSurface className="p-8 text-center">
          <p className="text-white/60">No trending tokens found</p>
        </GlassSurface>
      )}

      {/* Loading State */}
      {isFetching && !tokens.length && (
        <GlassSurface className="overflow-hidden" interactive={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Rank</th>
                  <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Token</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Market Cap</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Price</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Chart</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 px-3">
                      <div className="w-6 h-6 rounded-md bg-white/10 animate-pulse" />
                    </td>
                    <td className="py-2 px-3">
                      <div className="h-3 bg-white/10 rounded w-24 animate-pulse" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="h-3 bg-white/10 rounded w-12 ml-auto animate-pulse" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="h-3 bg-white/10 rounded w-12 ml-auto animate-pulse" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="h-6 bg-white/10 rounded w-20 ml-auto animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassSurface>
      )}
    </div>
  );
}

