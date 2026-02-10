import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SuperheroApi } from '@/api/backend';
import type { TokenDto } from '@/api/generated';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

const ITEM_LIMIT = 4;
const FETCH_LIMIT = 12;

function getTokenAddress(token: TokenDto) {
  return token.sale_address || token.address || '';
}

function formatChange(changePercent: number) {
  return `${Math.abs(changePercent).toFixed(2)}%`;
}

const TrendingAssetsFeedItem = () => {
  const { data: tokensData, isLoading: tokensLoading } = useQuery<{
    items?: TokenDto[];
  }>({
    queryKey: ['feed-trending-assets', 'tokens'],
    queryFn: () => SuperheroApi.listTokens({
      orderBy: 'trending_score',
      orderDirection: 'DESC',
      limit: FETCH_LIMIT,
    }),
    staleTime: 2 * 60 * 1000,
  });

  const tokens = useMemo<TokenDto[]>(() => {
    const items = tokensData?.items;
    return Array.isArray(items) ? items : [];
  }, [tokensData]);

  const topTokens = useMemo(() => tokens.slice(0, ITEM_LIMIT), [tokens]);

  const isLoading = tokensLoading;
  const hasItems = topTokens.length > 0;
  const skeletonKeys = useMemo(
    () => Array.from({ length: ITEM_LIMIT }, (_, idx) => `trending-asset-skeleton-${idx + 1}`),
    [],
  );

  if (!isLoading && !hasItems) {
    return null;
  }

  return (
    <div className="relative w-full px-3 md:px-4 py-4 md:py-5 border-b border-white/10 bg-transparent transition-colors hover:bg-white/[0.04]">
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] md:text-[16px] font-semibold text-white m-0 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            Trending assets
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading ? (
            skeletonKeys.map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 animate-pulse"
              >
                <div className="h-4 w-16 rounded bg-white/10" />
                <div className="mt-2 h-3 w-10 rounded bg-white/10" />
                <div className="mt-3 h-10 w-full rounded bg-white/10" />
              </div>
            ))
          ) : (
            topTokens.map((item) => {
              const token = item;
              const tokenLabel = token.symbol || token.name || 'Unknown';
              const tokenAddress = getTokenAddress(token);
              const changeRaw = (
                token as TokenDto & {
                  performance?: {
                    past_7d?: { current_change_percent?: number | string };
                  };
                }
              ).performance?.past_7d?.current_change_percent;
              const parsedChange = Number(changeRaw);
              const changePercent = Number.isFinite(parsedChange) ? parsedChange : null;
              const isPositive = changePercent !== null ? changePercent >= 0 : true;
              let changeClassName = 'text-white/60';
              if (changePercent === null) {
                changeClassName = 'text-white/60';
              } else if (isPositive) {
                changeClassName = 'text-emerald-400';
              } else {
                changeClassName = 'text-rose-400';
              }

              const changeLabel = changePercent === null
                ? '--'
                : `${isPositive ? '+' : '-'}${formatChange(changePercent)}`;
              const tokenHref = `/trends/tokens/${encodeURIComponent(
                token.name || token.address || token.symbol || tokenLabel,
              )}`;

              return (
                <Link
                  key={`trending-asset-${tokenAddress || tokenLabel}`}
                  to={tokenHref}
                  className={cn(
                    'group rounded-2xl border border-white/10 bg-white/[0.04] p-3',
                    'hover:bg-white/[0.06] hover:border-white/15 transition-colors',
                    'no-underline',
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="text-[13px] font-semibold text-[var(--neon-blue)] truncate group-hover:underline underline-offset-2"
                      style={{
                        background: 'none',
                        WebkitTextFillColor: 'currentColor',
                        WebkitBackgroundClip: 'initial',
                        backgroundClip: 'initial',
                      }}
                    >
                      <span className="text-[var(--neon-blue)] mr-0.5">#</span>
                      {tokenLabel}
                    </div>
                    <div
                      className={cn(
                        'text-[12px] font-semibold tabular-nums',
                        changeClassName,
                      )}
                    >
                      {changeLabel}
                    </div>
                  </div>
                  <div className="mt-3 h-10">
                    {tokenAddress && (
                    <TokenLineChart
                      saleAddress={tokenAddress}
                      height={40}
                      hideTimeframe
                      timeframe="7d"
                      className="h-10 w-full pointer-events-none"
                    />
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Link
            to="/trends/tokens"
            className="text-[12px] md:text-[13px] font-semibold text-[#4ecdc4] hover:text-[#6be4da] transition-colors no-underline"
            onClick={(event) => event.stopPropagation()}
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TrendingAssetsFeedItem;
