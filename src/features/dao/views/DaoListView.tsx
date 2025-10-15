import { useEffect, useMemo, useRef, useState } from "react";

import { TokensService } from "@/api/generated";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAeSdk } from "@/hooks";
import { TokenDto } from "@/api/generated/models/TokenDto";
import { Decimal } from "@/libs/decimal";
import { toAe } from "@/utils/bondingCurve";
import { LivePriceFormatter } from "@/features/shared/components";
import AddressChip from "@/components/AddressChip";
import { TokenLineChart } from "@/features/trending/components/TokenLineChart";

type SelectOptions<T> = Array<{
  title: string;
  disabled?: boolean;
  value: T;
}>;

const SORT = {
  marketCap: "market_cap",
  newest: "newest",
  holdersCount: "holders_count",
} as const;
type OrderByOption = (typeof SORT)[keyof typeof SORT];

export default function Daos() {
  const { activeAccount } = useAeSdk();
  const [search, setSearch] = useState("");
  const [orderDirection, setOrderDirection] = useState<"ASC" | "DESC">("DESC");

  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.marketCap);
  const [searchThrottled, setSearchThrottled] = useState("");
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  const orderByOptions: SelectOptions<OrderByOption> = [
    {
      title: "Market Cap",
      value: SORT.marketCap,
    },
    {
      title: "Newest",
      value: SORT.newest,
    },
    {
      title: "Holders Count",
      value: SORT.holdersCount,
    },
  ];

  const orderByMapped = useMemo(() => {
    if (orderBy === SORT.newest || orderBy === SORT.holdersCount) {
      return "created_at";
    }
    return orderBy;
  }, [orderBy]);

  const finalOrderDirection = useMemo((): "ASC" | "DESC" => {
    // For date-based sorting, override the direction
    if (orderBy === SORT.holdersCount) return "ASC";
    if (orderBy === SORT.newest) return "DESC";
    // For other fields, use the state
    return orderDirection;
  }, [orderBy, orderDirection]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchThrottled(search);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const { data, isFetching, fetchNextPage, hasNextPage, refetch, error } =
    useInfiniteQuery({
      initialPageParam: 1,
      queryFn: ({ pageParam = 1 }) =>
        TokensService.listAll({
          orderBy: orderByMapped as any,
          orderDirection: finalOrderDirection,
          search: searchThrottled || undefined,
          limit: 20,
          page: pageParam,
        }) as unknown as TokenDto[],
      getNextPageParam: (lastPage: any, allPages, lastPageParam) =>
        lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
          ? undefined
          : lastPageParam + 1,
      queryKey: [
        "TokensService.listAll",
        orderBy,
        orderByMapped,
        finalOrderDirection,
        searchThrottled,
      ],
      staleTime: 1000 * 60, // 1 minute
    });

  function updateOrderBy(val: OrderByOption) {
    setOrderBy(val);
    setOrderDirection("DESC"); // Reset to default direction when using dropdown
  }

  function handleSort(sortKey: OrderByOption) {
    if (
      orderBy === sortKey ||
      (orderBy === "newest" && sortKey === "holders_count") ||
      (orderBy === "holders_count" && sortKey === "newest")
    ) {
      if (sortKey === "newest" || sortKey === "holders_count") {
        setOrderBy(orderBy === "newest" ? "holders_count" : "newest");
      } else {
        setOrderDirection(orderDirection === "DESC" ? "ASC" : "DESC");
      }
    } else {
      // Set new column with default DESC direction
      setOrderBy(sortKey);
      setOrderDirection("DESC");
    }
  }

  const allItems = useMemo(
    () =>
      data?.pages?.length ? data.pages.map((page) => page.items).flat() : [],
    [data?.pages]
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-white">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="text-3xl font-extrabold text-white">DAOs</div>
        <div className="flex gap-2">
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-white/20 bg-gradient-to-b from-white/8 to-white/4 text-white backdrop-blur-lg shadow-lg placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
          <select
            className="px-3 py-2 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-xl text-sm focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05]"
            value={orderBy}
            onChange={(e) => updateOrderBy(e.target.value as OrderByOption)}
          >
            {orderByOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-gray-900"
              >
                {option.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-8 text-white/80">Loading…</div>
      )}
      {error && (
        <div className="text-center py-8 text-red-400">{error.message}</div>
      )}

      <div className="text-sm opacity-80 mt-2 mb-4 text-white/85">
        DAOs hold protocol fees collected from trades. Each card shows the
        treasury balance for that token, along with basic stats.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        {allItems.map((t) => {
          return (
            <div
              className={`border rounded-2xl p-4 bg-gradient-to-b from-gray-800/85 to-gray-900/70 text-white shadow-lg transition-all duration-150 hover:-translate-y-1 hover:shadow-2xl ${
                activeAccount === t.owner_address
                  ? "border-purple-500/50 shadow-purple-500/25 relative"
                  : "border-black/20"
              }`}
              key={t.address}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col gap-1.5">
                  <div className="font-black text-white text-lg tracking-wide">
                    {t.symbol}
                  </div>
                  {activeAccount === t.owner_address && (
                    <div className="text-xs px-2 py-1 rounded-full bg-purple-500/25 border border-purple-500/50 text-white w-fit">
                      Owned
                    </div>
                  )}
                </div>
                <a
                  className="px-4 py-2.5 rounded-xl text-white no-underline border-0 bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-600/35 transition-all duration-120 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-600/45"
                  href={`/trends/dao/${encodeURIComponent(
                    t.sale_address || ""
                  )}`}
                >
                  Open DAO
                </a>
              </div>

              <div className="pb-2 border-b border-white/10">
                    <TokenLineChart
                        saleAddress={t.sale_address || t.address}
                        height={48}
                        hideTimeframe={true}
                    />
                </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs opacity-80 text-white/80">
                    Treasury
                  </div>
                  <div className="font-bold text-white">
                    {t.sale_address && t.dao_balance != null ? (
                      <LivePriceFormatter
                        aePrice={Decimal.from(toAe(t.dao_balance))}
                        watchKey={t.sale_address}
                        className="text-xs sm:text-base"
                        hideFiatPrice={true}
                      />
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">
                    Holders
                  </div>
                  <div className="font-bold text-white">
                    {t.holders_count ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">
                    Created
                  </div>
                  <div className="font-bold text-white">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">
                    Market Cap
                  </div>
                  <div className="font-bold text-white">
                    {t.market_cap != null ? (
                      <LivePriceFormatter
                        aePrice={Decimal.from(toAe(t.market_cap))}
                        watchKey={t.sale_address}
                        className="text-xs sm:text-base"
                        hideFiatPrice={true}
                      />
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">
                    Trending
                  </div>
                  <div className="font-bold text-white">
                    {(t as any).trending_score != null
                      ? Math.round(
                          Number((t as any).trending_score)
                        ).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 mt-2">
                <div className="text-xs opacity-80 text-white/80">Sale</div>
                <AddressChip address={t.sale_address} />
              </div>

              <div className="flex justify-between items-center gap-2 mt-2">
                <a
                  className="text-xs opacity-95 text-white no-underline px-3 py-2 rounded-xl border-0 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-150"
                  href={`/trends/tokens/${encodeURIComponent(
                    t.sale_address || t.address
                  )}`}
                >
                  View token
                </a>
                <a
                  className="text-xs opacity-95 text-white no-underline px-3 py-2 rounded-xl border-0 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-150"
                  href={`https://aescan.io/contracts/${encodeURIComponent(
                    t.sale_address || t.address
                  )}?type=call-transactions`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  æScan ↗
                </a>
              </div>
            </div>
          );
        })}
        {!isFetching && !allItems.length && (
          <div className="col-span-full text-center py-8 opacity-80 text-white/85">
            No DAOs found.
          </div>
        )}
      </div>

      {hasNextPage && (
        <div className="text-center pt-2 pb-4">
          <button
            ref={loadMoreBtn}
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            className={`px-6 py-3 rounded-full border-none text-white cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isFetching
                ? "bg-white/10 cursor-not-allowed opacity-60"
                : "bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            {isFetching ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Loading...
              </div>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
