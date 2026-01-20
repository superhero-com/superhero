import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { SuperheroApi } from "@/api/backend";
import type { TokenDto } from "@/api/generated";
import TokenLineChart from "@/features/trending/components/TokenLineChart";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

const ITEM_LIMIT = 4;
const FETCH_LIMIT = 12;

type TokenPerformanceItem = {
  token: TokenDto;
  changePercent: number | null;
};

function getTokenAddress(token: TokenDto) {
  return token.sale_address || token.address || "";
}

function formatChange(changePercent: number) {
  return `${Math.abs(changePercent).toFixed(2)}%`;
}

export default function TrendingAssetsFeedItem() {
  const { data: tokensData, isLoading: tokensLoading } = useQuery<{
    items?: TokenDto[];
  }>({
    queryKey: ["feed-trending-assets", "tokens"],
    queryFn: () =>
      SuperheroApi.listTokens({
        orderBy: "trending_score",
        orderDirection: "DESC",
        limit: FETCH_LIMIT,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const tokens = useMemo<TokenDto[]>(() => {
    const items = tokensData?.items;
    return Array.isArray(items) ? items : [];
  }, [tokensData]);

  const tokenAddresses = useMemo(
    () => tokens.map(getTokenAddress).filter(Boolean),
    [tokens]
  );

  const { data: performanceData, isLoading: performanceLoading } = useQuery<
    TokenPerformanceItem[]
  >({
    queryKey: ["feed-trending-assets", "performance", tokenAddresses.join("|")],
    enabled: tokenAddresses.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        tokens.map(async (token) => {
          const tokenAddress = getTokenAddress(token);
          if (!tokenAddress) return null;
          const performance = await SuperheroApi.getTokenPerformance(tokenAddress).catch(
            () => null
          );
          const changeRaw = (performance as any)?.past_7d?.current_change_percent;
          const parsedChange = Number(changeRaw);
          const changePercent = Number.isFinite(parsedChange) ? parsedChange : null;
          return {
            token,
            changePercent,
          } as TokenPerformanceItem;
        })
      );

      return results
        .filter((item): item is TokenPerformanceItem =>
          Boolean(item && typeof item.changePercent === "number")
        )
        .sort(
          (a, b) =>
            (b.changePercent ?? Number.NEGATIVE_INFINITY) -
            (a.changePercent ?? Number.NEGATIVE_INFINITY)
        );
    },
    staleTime: 60 * 1000,
  });

  const items = useMemo<TokenPerformanceItem[]>(() => {
    return performanceData ? performanceData.slice(0, ITEM_LIMIT) : [];
  }, [performanceData]);

  const isLoading = tokensLoading || performanceLoading;
  const hasItems = items.length > 0;

  if (!isLoading && !hasItems) {
    return null;
  }

  return (
    <div className="w-screen -mx-[calc((100vw-100%)/2)] md:w-full md:mx-0 p-0 md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:backdrop-blur-[20px] md:rounded-[20px]">
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] md:text-[16px] font-semibold text-white m-0 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            Trending assets
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(isLoading ? Array.from({ length: ITEM_LIMIT }) : items).map(
            (item, index) => {
              if (!item) {
                return (
                  <div
                    key={`trending-asset-skeleton-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 animate-pulse"
                  >
                    <div className="h-4 w-16 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-10 rounded bg-white/10" />
                    <div className="mt-3 h-10 w-full rounded bg-white/10" />
                  </div>
                );
              }

              const token = item.token;
              const tokenLabel = token.symbol || token.name || "Unknown";
              const tokenAddress = getTokenAddress(token);
              const changePercent = item.changePercent ?? 0;
              const isPositive = changePercent >= 0;
              const tokenHref = `/trends/tokens/${encodeURIComponent(
                token.name || token.address || token.symbol || tokenLabel
              )}`;

              return (
                <Link
                  key={`trending-asset-${tokenAddress || tokenLabel}-${index}`}
                  to={tokenHref}
                  className={cn(
                    "rounded-2xl border border-white/10 bg-white/[0.04] p-3",
                    "hover:bg-white/[0.08] hover:border-white/20 transition-colors",
                    "no-underline"
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-white/90 truncate">
                      <span className="text-white/60 mr-0.5">#</span>
                      {tokenLabel}
                    </div>
                    <div
                      className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {`${isPositive ? "+" : "-"}${formatChange(changePercent)}`}
                    </div>
                  </div>
                  <div className="mt-3 h-10">
                    {tokenAddress && (
                      <TokenLineChart
                        saleAddress={tokenAddress}
                        height={40}
                        hideTimeframe={true}
                        timeframe="7d"
                        className="h-10 w-full"
                      />
                    )}
                  </div>
                </Link>
              );
            }
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
}
