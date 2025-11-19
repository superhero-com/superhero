import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { DexService } from "../../../api/generated";
import { TokenListCards } from "../../../components/explore/components/TokenListCards";
import { TokenListTable } from "../../../components/explore/components/TokenListTable";
import { useTokenList } from "../../../components/explore/hooks/useTokenList";
import { useSetAtom } from "jotai";
import { performanceChartTimeframeAtom } from "@/features/trending/atoms";
import { Decimal } from "@/libs/decimal";

// Define the actual API response structure
interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

export default function DexExploreTokens() {
  const setPerformanceChartTimeframe = useSetAtom(performanceChartTimeframeAtom);

  // Set default timeframe to "30d" to match the default sort by 30d volume
  useEffect(() => {
    setPerformanceChartTimeframe("30d");
  }, [setPerformanceChartTimeframe]);

  const [sort, setSort] = useState<"pairs_count" | "name" | "symbol" | "created_at" | "price" | "tvl" | "24hchange" | "24hvolume" | "7dchange" | "7dvolume" | "30dchange" | "30dvolume">(
    "30dvolume"
  );
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const handleSortChange = (key: typeof sort) => {
    if (key === sort) {
      // Toggle direction if same key
      setSortDirection(sortDirection === "ASC" ? "DESC" : "ASC");
    } else {
      // New key, reset to DESC
      setSort(key);
      setSortDirection("DESC");
    }
  };

  // Check if backend supports this sort option (30d options may not be supported yet)
  const backendSupportsSort = !sort.startsWith('30d');
  const backendSort = backendSupportsSort ? sort : 'pairs_count'; // Fallback to pairs_count if backend doesn't support 30d

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const result = await DexService.listAllDexTokens({
        page: page,
        limit: limit,
        orderBy: backendSort as any,
        orderDirection: sortDirection,
        search: search,
      });
      return result as unknown as PaginatedResponse<any>;
    },
    queryKey: ["DexService.listAllDexTokens", backendSort, sortDirection, page, limit, search],
  });

  // Client-side sorting for 30d options if backend doesn't support them
  const sortedData = useMemo(() => {
    if (!data?.items || backendSupportsSort) {
      return data;
    }

    const sortedItems = [...data.items].sort((a, b) => {
      const getVolume = (token: any, period: string) => {
        const volumeData = token.summary?.change?.[period]?.volume;
        if (!volumeData) return Decimal.ZERO;
        return Decimal.from(volumeData.ae || 0);
      };

      const getChange = (token: any, period: string) => {
        const changeData = token.summary?.change?.[period]?.percentage;
        if (!changeData) return Decimal.ZERO;
        return Decimal.from(changeData);
      };

      let valueA: Decimal;
      let valueB: Decimal;

      if (sort === '30dvolume') {
        valueA = getVolume(a, '30d');
        valueB = getVolume(b, '30d');
      } else if (sort === '30dchange') {
        valueA = getChange(a, '30d');
        valueB = getChange(b, '30d');
      } else {
        return 0;
      }

      // Compare using Decimal methods: returns -1 if A < B, 0 if equal, 1 if A > B
      let comparison = 0;
      if (valueA.lt(valueB)) {
        comparison = -1;
      } else if (valueA.gt(valueB)) {
        comparison = 1;
      }
      return sortDirection === 'DESC' ? -comparison : comparison;
    });

    return {
      ...data,
      items: sortedItems,
    };
  }, [data, sort, sortDirection, backendSupportsSort]);

  return (
    <div className="p-0 mx-auto md:pt-0">
      {/* Main Content Container (no card) */}
      <div className="mx-2 md:mx-auto bg-transparent border-none rounded-none p-0 md:px-2 shadow-none relative overflow-visible backdrop-blur-0">
        {/* Header Card */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold m-0 mb-3 sh-dex-title">
            Explore Tokens
          </h1>
          <p className="text-sm md:text-base text-light-font-color m-0 opacity-80 leading-6">
            Browse and interact with all available tokens on the æternity
            ecosystem.
          </p>
        </div>

        {/* Content: Mobile Cards or Desktop Table */}
        <div className="md:hidden">
          <TokenListCards
            tokens={sortedData?.items ?? []}
            sort={{ key: sort, asc: sortDirection === "ASC" }}
            onSortChange={handleSortChange}
            search={search}
            onSearchChange={setSearch}
            loading={isLoading}
          />
        </div>
        <div className="hidden md:block">
          <TokenListTable
            tokens={sortedData?.items ?? []}
            sort={{ key: sort, asc: sortDirection === "ASC" }}
            onSortChange={handleSortChange}
            search={search}
            onSearchChange={setSearch}
            loading={isLoading}
          />
        </div>

        {/* Responsive Pagination Controls */}
        {sortedData && sortedData.meta.totalItems > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-5 p-3 md:py-4 md:px-5 bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl backdrop-blur-[10px] gap-3 md:gap-0">

            {/* Pagination Info */}
            <div className="flex items-center gap-2 order-2 md:order-1">
              <span className="text-xs md:text-sm text-[var(--light-font-color)] font-medium text-center md:text-left">
                Showing {(page - 1) * limit + 1}-{Math.min(page * limit, sortedData.meta.totalItems)} of {sortedData.meta.totalItems} tokens
              </span>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1.5 md:gap-2 order-1 md:order-2 flex-wrap justify-center md:justify-start">
              {/* Previous Page Button */}
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`py-2 px-2 md:px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-sm md:text-[13px] font-medium transition-all duration-300 outline-none min-w-[80px] md:min-w-auto ${page === 1
                  ? "bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50"
                  : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px"
                  }`}
                title="Previous page"
              >
                ← Prev
              </button>

              {/* Page Number Display */}
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm text-[var(--standard-font-color)] font-semibold bg-[var(--accent-color)]/10 py-1 px-2 rounded-md border border-[var(--accent-color)]/20">
                  {page}
                </span>
                <span className="text-sm text-[var(--light-font-color)]">
                  of {Math.ceil(sortedData.meta.totalItems / limit)}
                </span>
              </div>

              {/* Next Page Button */}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(sortedData.meta.totalItems / limit)}
                className={`py-2 px-2 md:px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-sm md:text-[13px] font-medium transition-all duration-300 outline-none min-w-[60px] md:min-w-auto ${page >= Math.ceil(sortedData.meta.totalItems / limit)
                  ? "bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50"
                  : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px"
                  }`}
                title="Next page"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {sortedData?.items.length === 0 && !isLoading && (
          <div className="text-center py-15 bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl backdrop-blur-[10px] mt-5">
            <div className="text-[var(--light-font-color)] text-base font-medium mb-2">
              No tokens found
            </div>
            <div className="text-[var(--light-font-color)] text-sm opacity-70">
              Try adjusting your search criteria
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
