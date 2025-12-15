import { useNavigate } from "react-router-dom";
import { Token } from "../types/explore";
import { DexTokenDto } from "../../../api/generated";
import { PriceDataFormatter } from "@/features/shared/components";
import { useMemo } from 'react';
import { useAtomValue } from "jotai";
import { performanceChartTimeframeAtom } from "@/features/trending/atoms";
import PerformanceTimeframeSelector from "@/features/trending/components/PerformanceTimeframeSelector";
import AppSelect, { Item as AppSelectItem } from "@/components/inputs/AppSelect";
import Spinner from "@/components/Spinner";
import { Decimal } from "@/libs/decimal";

interface TokenListCardsProps {
  tokens: DexTokenDto[];
  sort: {
    key:
    | "pairs_count"
    | "name"
    | "symbol"
    | "created_at"
    | "price"
    | "tvl"
    | "24hchange"
    | "24hvolume"
    | "7dchange"
    | "7dvolume"
    | "30dchange"
    | "30dvolume";
    asc: boolean;
  };
  onSortChange: (
    key:
      | "pairs_count"
      | "name"
      | "symbol"
      | "created_at"
      | "price"
      | "tvl"
      | "24hchange"
      | "24hvolume"
      | "7dchange"
      | "7dvolume"
      | "30dchange"
      | "30dvolume"
  ) => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
}
export function TokenListCards({
  tokens,
  sort,
  onSortChange,
  search,
  onSearchChange,
  loading,
}: TokenListCardsProps) {
  const navigate = useNavigate();

  const performanceChartTimeframe = useAtomValue(performanceChartTimeframeAtom);

  const timeBase = useMemo(() => {
    if (performanceChartTimeframe === "1d") {
      return "24h";
    }

    return performanceChartTimeframe;
  }, [performanceChartTimeframe]);

  const handleSort = (
    key:
      | "pairs_count"
      | "name"
      | "symbol"
      | "created_at"
      | "price"
      | "tvl"
      | "24hchange"
      | "24hvolume"
      | "7dchange"
      | "7dvolume"
      | "30dchange"
      | "30dvolume"
  ) => {
    onSortChange(key);
  };

  const handleTokenClick = (token: Token) => {
    navigate(`/apps/explore/tokens/${token.address}`);
  };

  const handleSwapClick = (token: Token) => {
    navigate(`/apps/swap?from=AE&to=${token.address}`);
  };

  const handleAddClick = (token: Token) => {
    navigate(`/apps/pool?from=AE&to=${token.address}`);
  };

  if (loading && tokens.length === 0) {
    return (
      <div className="text-center p-[60px] bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-[10px]">
        <div className="inline-flex items-center gap-3 text-gray-300 text-base font-medium">
          <Spinner className="w-5 h-5" />
          Loading tokens...
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Responsive Filter Controls */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-3 backdrop-blur-[15px] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {/* Responsive Filter Layout */}

        <div className="flex items-stretch justify-between gap-3 flex-wrap flex-col sm:flex-row mb-[10px]">
          {/* Top Row: Filter & Sort Label + Controls */}
          <div className="flex items-center gap-[5px] w-auto justify-between flex-wrap">
            {/* Enhanced Dropdown Container */}
            <div className="relative flex items-center gap-[6px]">
              <div className="relative inline-block">
                <AppSelect
                  value={sort.key as string}
                  onValueChange={(v) => handleSort(v as any)}
                  triggerClassName="appearance-none py-[6px] pr-7 pl-3 rounded-lg bg-white/10 text-white border border-white/10 backdrop-blur-[10px] text-[13px] font-medium cursor-pointer transition-all duration-300 outline-none min-w-[100px] focus:border-green-500 focus:shadow-[0_0_0_2px_rgba(76,175,80,0.1)]"
                >
                  <AppSelectItem value="pairs_count">Pools</AppSelectItem>
                  <AppSelectItem value="name">Name</AppSelectItem>
                  <AppSelectItem value="symbol">Symbol</AppSelectItem>
                  <AppSelectItem value="created_at">Created At</AppSelectItem>
                  <AppSelectItem value="price">Price</AppSelectItem>
                  <AppSelectItem value="tvl">TVL</AppSelectItem>
                  <AppSelectItem value="24hchange">24h Change</AppSelectItem>
                  <AppSelectItem value="24hvolume">24h Volume</AppSelectItem>
                  <AppSelectItem value="7dchange">7d Change</AppSelectItem>
                  <AppSelectItem value="7dvolume">7d Volume</AppSelectItem>
                  <AppSelectItem value="30dchange">30d Change</AppSelectItem>
                  <AppSelectItem value="30dvolume">30d Volume</AppSelectItem>
                </AppSelect>
              </div>

              <button
                onClick={() => handleSort(sort.key)}
                className={`px-2 py-[6px] rounded-md border border-white/10 cursor-pointer backdrop-blur-[10px] transition-all duration-300 text-[13px] font-semibold min-w-7 h-7 flex items-center justify-center outline-none hover:-translate-y-px hover:scale-105 ${sort.asc
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-white hover:bg-green-500 hover:text-white"
                  }`}
                title={sort.asc ? "Sort Ascending" : "Sort Descending"}
              >
                {sort.asc ? "↑" : "↓"}
              </button>
            </div>
            <div className="flex items-center justify-center w-auto flex-shrink-0">
              <PerformanceTimeframeSelector />
            </div>
          </div>

          {/* Results Counter */}
          <div className="flex items-center justify-between gap-2 sm:gap-[10px] flex-shrink-0 flex-wrap sm:flex-nowrap">
            {/* Compact Active Filters Display */}
            {(search || sort.key !== "name") ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-300 font-medium opacity-80">
                  Active:
                </span>
                {search && (
                  <div className="flex items-center gap-1 bg-green-500/[0.12] px-[6px] py-[2px] rounded-lg text-[11px] text-green-500 border border-green-500/20">
                    <span>
                      Search: "
                      {search.length > 15
                        ? search.substring(0, 15) + "..."
                        : search}
                      "
                    </span>
                    <button
                      onClick={() => onSearchChange("")}
                      className="bg-none border-none text-green-500 cursor-pointer text-[9px] p-0 outline-none opacity-70 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {sort.key !== "name" && (
                  <div className="flex items-center gap-1 bg-green-500/[0.12] px-[6px] py-[2px] rounded-lg text-[11px] text-green-500 border border-green-500/20">
                    <span>
                      Sort: {sort.key} {sort.asc ? "↑" : "↓"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-[6px] bg-green-500/10 px-[10px] py-[6px] rounded-2xl border border-green-500/20 flex-shrink-0">
              <div className="w-[5px] h-[5px] rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[11px] text-green-500 font-semibold">
                {tokens.length} {tokens.length === 1 ? "token" : "tokens"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-3">
          {tokens.map((token) => (
            <div
              key={token.address}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] cursor-pointer transition-all duration-300 hover:bg-white/[0.05] active:scale-[0.98]"
              onClick={() => handleTokenClick(token)}
            >
              {/* Token Header */}
              <div className="flex flex-col items-center justify-between mb-3 pb-3 border-b border-white/5">
                <div className="flex flex-col items-center gap-1">
                  <div className="text-green-500 text-lg font-semibold text-center">
                    {token.symbol}
                  </div>
                  <div className="text-gray-300 text-xs font-medium text-center opacity-80">
                    {token.name}
                  </div>
                </div>

                {/* Pools Count Badge */}
                <div className="bg-green-500/10 px-2 py-1 rounded-xl border border-green-500/20 mt-2">
                  <span className="text-xs text-green-500 font-semibold">
                    {token.pairs_count || 0} Pools
                  </span>
                </div>
              </div>

              {/* Token Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Price */}
                <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                  <div className="text-[11px] text-gray-300 font-medium mb-1 uppercase tracking-wider">
                    Price
                  </div>
                  <div className="text-sm text-white font-semibold">
                    <PriceDataFormatter priceData={token.price} />
                  </div>
                </div>

                {/* TVL */}
                <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                  <div className="text-[11px] text-gray-300 font-medium mb-1 uppercase tracking-wider">
                    TVL
                  </div>
                  <div className="text-sm text-white font-semibold">
                    <PriceDataFormatter priceData={token.summary?.total_volume} />
                  </div>
                </div>

                {/* 24h Change */}
                <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                  <div className="text-[11px] text-gray-300 font-medium mb-1 uppercase tracking-wider">
                    {timeBase} Change
                  </div>
                  <div className={`text-sm font-semibold ${
                    token.summary?.change?.[timeBase]?.percentage && 
                    Number(token.summary.change[timeBase].percentage) >= 0 
                      ? "text-green-400" 
                      : "text-red-400"
                  }`}>
                    {token.summary?.change?.[timeBase]?.percentage ? (
                      <>
                        {Number(token.summary.change[timeBase].percentage) >= 0 ? "+" : ""}
                        {Decimal.from(token.summary.change[timeBase].percentage).prettify(2)}%
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>

                {/* 24h Volume */}
                <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                  <div className="text-[11px] text-gray-300 font-medium mb-1 uppercase tracking-wider">
                    {timeBase} Volume
                  </div>
                  <div className="text-sm text-white font-semibold">
                    <PriceDataFormatter priceData={token.summary?.change?.[timeBase]?.volume} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwapClick(token);
                  }}
                  className="flex-1 p-3 rounded-xl border border-white/10 bg-white/10 text-white cursor-pointer text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 outline-none hover:bg-green-500 hover:text-white active:scale-95"
                >
                  🔄 Swap
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddClick(token);
                  }}
                  className="flex-1 p-3 rounded-xl border border-white/10 bg-white/10 text-white cursor-pointer text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 outline-none hover:bg-green-500 hover:text-white active:scale-95"
                >
                  ➕ Add Liquidity
                </button>
              </div>
            </div>
          ))}

          {tokens.length === 0 && !loading && (
            <div className="text-center p-[60px] bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-[10px] mt-5">
              <div className="text-gray-300 text-base font-medium mb-2">
                No tokens found
              </div>
              <div className="text-gray-300 text-sm opacity-70">
                Try adjusting your search criteria
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default TokenListCards;
