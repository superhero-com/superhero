import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Head from "../../../seo/Head";
import {
  LeaderboardFilters,
  LeaderboardCard,
  LeaderboardSkeleton,
} from "../components";
import {
  fetchLeaderboard,
  type LeaderboardMetric,
  type LeaderboardTimeframe,
  type PaginatedResponse,
  type LeaderboardItem,
} from "../api/leaderboard";
import {
  LEADERBOARD_TIMEFRAME_OPTIONS,
  LEADERBOARD_METRIC_OPTIONS,
} from "../constants/leaderboard";
import Spinner from "@/components/Spinner";

export default function LeaderboardView() {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>("7d");
  const [metric, setMetric] = useState<LeaderboardMetric>("pnl");
  const [page, setPage] = useState(1);

  const timeframeOption = LEADERBOARD_TIMEFRAME_OPTIONS.find(
    (option) => option.value === timeframe
  );
  const timeframeLabel = timeframeOption?.label ?? "7D";
  const metricOption = LEADERBOARD_METRIC_OPTIONS.find(
    (option) => option.value === metric
  );
  const metricLabel = metricOption?.label ?? "PnL";

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<PaginatedResponse<LeaderboardItem>>({
    queryKey: ["leaderboard", timeframe, metric, page],
    queryFn: () =>
      fetchLeaderboard({
        timeframe,
        metric,
        page,
        limit: 15,
      }),
    staleTime: 60 * 1000, // cache results per window/metric for 1 minute
    gcTime: 5 * 60 * 1000, // keep cached windows around for 5 minutes
  });

  const items = data?.items ?? [];
  const currentPage = data?.meta.currentPage ?? page;
  const totalPages = data?.meta.totalPages ?? 1;

  const handleTimeframeChange = (value: LeaderboardTimeframe) => {
    setTimeframe(value);
    setPage(1);
  };

  const handleMetricChange = (value: LeaderboardMetric) => {
    setMetric(value);
    setPage(1);
  };

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4 py-4">
      <Head
        title="Superhero.com – Trading Leaderboard"
        description="Discover top performing trading assets on Superhero based on on-chain performance."
        canonicalPath="/trends/leaderboard"
      />

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Trading Leaderboard
            </h1>
            <p className="mt-2 text-sm md:text-base leading-relaxed text-white/70 max-w-2xl">
              Discover the most active Superhero traders ranked by on-chain performance.
              Increase your trading volume, consistency, and trend ownership to climb the board and turn your wallet into a public on-chain track record.
            </p>
          </div>

          {/* Filters */}
          <div className="w-full md:w-auto">
            <LeaderboardFilters
              timeframe={timeframe}
              metric={metric}
              onTimeframeChange={handleTimeframeChange}
              onMetricChange={handleMetricChange}
            />
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-200 text-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <span>Unable to load leaderboard. Please try again.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-lg bg-red-500/70 text-xs font-semibold hover:bg-red-500/90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-4 sm:p-6">
          {/* Loading */}
          {isLoading && (
            <>
              <div className="hidden md:block">
                <LeaderboardSkeleton rows={8} variant="table" />
              </div>
              <div className="md:hidden">
                <LeaderboardSkeleton rows={6} variant="card" />
              </div>
            </>
          )}

          {/* Empty state */}
          {!isLoading && !isFetching && items.length === 0 && !isError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3">
                <Spinner className="w-6 h-6 text-white/40" />
              </div>
              <p className="text-sm text-white/60">
                No traders found for the selected filters.
              </p>
              <p className="text-xs text-white/40 mt-1">
                Try adjusting the timeframe or performance metric.
              </p>
            </div>
          )}

          {/* Data */}
          {items.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item, index) => (
                  <LeaderboardCard
                    key={item.address}
                    rank={(currentPage - 1) * 15 + index + 1}
                    item={item}
                    timeframeLabel={timeframeLabel}
                    metricLabel={metricLabel}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                <div className="text-xs text-white/60">
                  Page{" "}
                  <span className="font-semibold text-white">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-white">
                    {totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border border-white/15 transition-colors ${
                      currentPage <= 1 || isFetching
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages || isFetching}
                    onClick={() =>
                      setPage((p) => (p < totalPages ? p + 1 : p))
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-medium border border-white/15 transition-colors ${
                      currentPage >= totalPages || isFetching
                        ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
