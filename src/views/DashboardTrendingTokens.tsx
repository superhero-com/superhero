import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Flame, Zap, ChevronDown, Crown } from 'lucide-react';
import { PriceDataFormatter } from '@/features/shared/components';
import TokenPriceChart from '@/components/charts/TokenPriceChart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.trendingScore);
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');

  const getSortLabel = () => {
    if (orderBy === SORT.trendingScore) return 'Now trending';
    if (orderBy === SORT.marketCap) return 'Market Cap';
    if (orderBy === SORT.price) return 'Price';
    if (orderBy === SORT.name) return 'Name';
    if (orderBy === SORT.newest) return 'Newest';
    if (orderBy === SORT.oldest) return 'Oldest';
    if (orderBy === SORT.holdersCount) return 'Holders';
    return 'Now trending';
  };

  const handleSortChange = (newOrderBy: OrderByOption) => {
    setOrderBy(newOrderBy);
  };

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

  // Calculate top 3 trending tokens and highest market cap token (regardless of current sort)
  const { topTrendingTokens, highestMarketCapToken } = useMemo(() => {
    if (!tokens.length) return { topTrendingTokens: [], highestMarketCapToken: null };

    // Get all tokens with their trending scores
    const tokensWithTrending = tokens.map(token => ({
      token,
      trendingScore: getTrendingScore(token),
    }));

    // Sort by trending score descending and get top 3
    const sortedByTrending = [...tokensWithTrending].sort((a, b) => b.trendingScore - a.trendingScore);
    const topTrending = sortedByTrending.slice(0, 3).map(item => item.token.address);

    // Find token with highest market cap
    // Use AE value from market_cap_data (PriceDto structure has 'ae' property)
    let highestMarketCap = 0;
    let highestMarketCapToken = null;
    
    tokens.forEach(token => {
      // PriceDto has 'ae' property, not 'value'
      const marketCapValue = token.market_cap_data?.ae;
      if (marketCapValue !== undefined && marketCapValue !== null) {
        const numValue = typeof marketCapValue === 'string' ? parseFloat(marketCapValue) : Number(marketCapValue);
        if (!isNaN(numValue) && numValue > highestMarketCap) {
          highestMarketCap = numValue;
          highestMarketCapToken = token.address;
        }
      }
    });

    return {
      topTrendingTokens: topTrending,
      highestMarketCapToken,
    };
  }, [tokens]);

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
      <div className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Trends</h1>
              <p className="text-xs text-white/60">Explore and trade current trends</p>
            </div>
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center h-[52px] justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-semibold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white] hover:opacity-80 transition-opacity focus:outline-none">
                  <span>{getSortLabel()}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white/70" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              sideOffset={8}
              className="bg-white/5 backdrop-blur-xl border-white/20 text-white min-w-[200px] py-2 rounded-xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-4 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-top"
              style={{
                background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.06), transparent 40%), rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.trendingScore)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Now trending
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.marketCap)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Market Cap
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.price)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Price
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.name)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.newest)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Newest
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.oldest)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Oldest
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange(SORT.holdersCount)}
                className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
              >
                Holders
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Token List - Compact Table Style */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Rank</th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Token</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Market Cap</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Price</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider max-w-[100px]">Graph</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token: TokenDto, index: number) => {
                const rank = index + 1;
                const tokenName = token.name || token.symbol || 'Unnamed';

                return (
                  <tr
                    key={token.address}
                    className="border-b border-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200 group relative hover:translate-y-0 hover:shadow-lg"
                    onClick={() => navigate(`/trends/tokens/${encodeURIComponent(tokenName)}`)}
                  >
                    {/* Rank */}
                    <td className="py-2 pl-3 pr-0.5">
                      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br ${getRankBadgeColor(rank)} font-black ${rank <= 3 ? 'text-gray-900' : 'text-white'} text-xs shadow-md`}>
                        {rank}
                      </div>
                    </td>
                    
                    {/* Token Name */}
                    <td className="py-2 pl-0.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-sm group-hover:text-[var(--neon-teal)] transition-colors">
                          <span className="text-white/60 group-hover:text-[var(--neon-teal)] text-xs mr-0.5 transition-colors">#</span>
                          {token.symbol || token.name}
                        </span>
                        {/* Show icons - crown first if applicable, then flame */}
                        {(highestMarketCapToken === token.address || topTrendingTokens.includes(token.address)) && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Crown icon for highest market cap token (shown first) */}
                            {highestMarketCapToken === token.address && (
                              <span className="flex-shrink-0">
                                <Crown className="w-3 h-3 text-yellow-400" />
                              </span>
                            )}
                            {/* Flame icons for top 3 trending tokens */}
                            {topTrendingTokens.includes(token.address) && (
                              <span className={`flex-shrink-0 ${topTrendingTokens.indexOf(token.address) === 0 ? 'flame-pulsate' : ''}`}>
                                <Flame className={`${topTrendingTokens.indexOf(token.address) === 0 ? 'w-4 h-4' : topTrendingTokens.indexOf(token.address) === 1 ? 'w-3.5 h-3.5' : 'w-3 h-3'} ${topTrendingTokens.indexOf(token.address) === 0 ? 'text-orange-400' : topTrendingTokens.indexOf(token.address) === 1 ? 'text-orange-500' : 'text-orange-600'}`} />
                              </span>
                            )}
                          </div>
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
                      <div className="text-yellow-400 text-xs text-right inline-block ml-auto">
                        <PriceDataFormatter
                          hideFiatPrice
                          priceData={token.price_data}
                        />
                      </div>
                    </td>
                    
                    {/* Chart */}
                    <td className="py-2 px-3 text-right max-w-[100px]">
                      {token.sale_address && (
                        <div className="ml-auto max-w-[100px]">
                          <TokenPriceChart
                            saleAddress={token.sale_address}
                            height={24}
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
      </div>

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
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Rank</th>
                  <th className="text-left py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Token</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Market Cap</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">Price</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider max-w-[100px]">Graph</th>
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
        </div>
      )}
    </div>
  );
}

