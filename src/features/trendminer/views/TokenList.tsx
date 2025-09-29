import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TokenListTable, TrendminerBanner } from "..";
import { TokenDto, TokensService } from "../../../api/generated";
import LatestTransactionsCarousel from "../../../components/Trendminer/LatestTransactionsCarousel";
import TrendingPillsCarousel from "../../../components/Trendminer/TrendingPillsCarousel";
import RepositoriesList from "../components/RepositoriesList";
import { useAccount } from "../../../hooks";

type TrendingTagItem = {
  tag: string;
  score: number;
  source?: string;
};

type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
};

type SelectOptions<T> = Array<{
  title: string;
  disabled?: boolean;
  value: T;
}>;

const SORT = {
  marketCap: 'market_cap',
  newest: 'newest',
  oldest: 'oldest',
  holdersCount: 'holders_count',
  trendingScore: 'trending_score',
  name: 'name',
  price: 'price',
} as const;

type OrderByOption = typeof SORT[keyof typeof SORT];
type CollectionOption = 'all' | string; // Can be 'all' or specific collection addresses

export default function TokenList() {
  const { activeAccount } = useAccount();
  
  const [collection, setCollection] = useState<CollectionOption>('all');
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.trendingScore); // Default to trending score like Vue
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [searchThrottled, setSearchThrottled] = useState("");
  const loadMoreBtn = useRef<HTMLButtonElement>(null);
  
  // Throttle search input (2000ms delay like Vue)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchThrottled(search);
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [search]);

  const orderByOptions: SelectOptions<OrderByOption> = [
    {
      title: 'Trending Score',
      value: SORT.trendingScore,
    },
    {
      title: 'Market Cap',
      value: SORT.marketCap,
    },
    {
      title: 'Price',
      value: SORT.price,
    },
    {
      title: 'Name',
      value: SORT.name,
    },
    {
      title: 'Newest',
      value: SORT.newest,
    },
    {
      title: 'Oldest',
      value: SORT.oldest,
    },
    {
      title: 'Holders Count',
      value: SORT.holdersCount,
    },
  ];

  // Remove hardcoded collection options - these should be dynamic based on available collections
  // For now, just use 'all' as the Vue implementation shows collection can be any string

  const activeSortOption = useMemo(() =>
    orderByOptions.find((option) => option.value === orderBy),
    [orderBy]
  );

  const orderByMapped = useMemo(() => {
    if (orderBy === SORT.newest || orderBy === SORT.oldest) {
      return 'created_at';
    }
    return orderBy;
  }, [orderBy]);

  const finalOrderDirection = useMemo((): 'ASC' | 'DESC' => {
    // For date-based sorting, override the direction
    if (orderBy === SORT.oldest) return 'ASC';
    if (orderBy === SORT.newest) return 'DESC';
    // For other fields, use the state
    return orderDirection;
  }, [orderBy, orderDirection]);

  const ownerAddress = useMemo(() => {
    return ownedOnly ? activeAccount : undefined;
  }, [ownedOnly, activeAccount]);

  const { data, isFetching, fetchNextPage, hasNextPage, refetch } =
    useInfiniteQuery({
      initialPageParam: 1,
      queryFn: ({ pageParam = 1 }) =>
        TokensService.listAll({
          orderBy: orderByMapped as any,
          orderDirection: finalOrderDirection,
          collection: collection === 'all' ? undefined : (collection as any),
          search: searchThrottled || undefined,
          ownerAddress: ownerAddress,
          limit: 20,
          page: pageParam,
        }),
      getNextPageParam: (lastPage: any, allPages, lastPageParam) =>
        lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
          ? undefined
          : lastPageParam + 1,
      queryKey: [
        "TokensService.listAll",
        orderBy,
        orderByMapped,
        finalOrderDirection,
        collection,
        searchThrottled,
        ownerAddress,
      ],
      staleTime: 1000 * 60, // 1 minute
    });

  function updateCollection(val: CollectionOption) {
    setCollection(val);
  }

  function updateOrderBy(val: OrderByOption) {
    setOrderBy(val);
    setOrderDirection('DESC'); // Reset to default direction when using dropdown
  }

  function handleSort(sortKey: OrderByOption) {
    if (orderBy === sortKey || 
        (orderBy === 'newest' && sortKey === 'oldest') || 
        (orderBy === 'oldest' && sortKey === 'newest')) {
      // Toggle direction if same column (or newest/oldest pair)
      if (sortKey === 'newest' || sortKey === 'oldest') {
        // For date-based sorting, toggle between newest and oldest
        setOrderBy(orderBy === 'newest' ? 'oldest' : 'newest');
      } else {
        // For other columns, toggle the direction
        setOrderDirection(orderDirection === 'DESC' ? 'ASC' : 'DESC');
      }
    } else {
      // Set new column with default DESC direction
      setOrderBy(sortKey);
      setOrderDirection('DESC');
    }
  }

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

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  }

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen  text-white px-4">
      <TrendminerBanner />

      <LatestTransactionsCarousel />

      <TrendingPillsCarousel />

      {/* Main content */}
      <div className="">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left: Token List */}
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Tokenized Trends
              </h2>

              {/* FILTERS */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* OrderBy Filter */}
                <select
                  className="px-3 py-2 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-xl text-sm focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05]"
                  value={orderBy}
                  onChange={(e) => updateOrderBy(e.target.value as OrderByOption)}
                >
                  {orderByOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-900">
                      {option.title}
                    </option>
                  ))}
                </select>

                {/* Owned by me */}
                {activeAccount && (
                  <button
                    onClick={() => setOwnedOnly(!ownedOnly)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      ownedOnly
                        ? 'bg-[#1161FE] text-white border border-[#1161FE]'
                        : 'bg-white/[0.02] text-white border border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    Show Owned Only
                  </button>
                )}

                {/* Search */}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tokens"
                  className="px-3 py-2 w-full sm:min-w-[200px] sm:max-w-[280px] bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-xl text-sm focus:outline-none focus:border-[#1161FE] placeholder-white/50 transition-all duration-300 hover:bg-white/[0.05]"
                />
              </div>
            </div>

            {/* Message Box for no results */}
            {(!data?.pages?.length || !data?.pages[0].items.length) && !isFetching && (
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 text-center text-white/80 mb-4">
                <h3 className="font-semibold mb-2 text-white">No Token Sales</h3>
                <p>No tokens found matching your criteria.</p>
              </div>
            )}

            {/* Token List Table */}
            <TokenListTable 
              pages={data?.pages} 
              loading={isFetching} 
              orderBy={orderBy}
              orderDirection={finalOrderDirection}
              onSort={handleSort}
            />
          </div>

          <RepositoriesList />
        </div>

        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center pt-2 pb-4">
            <button
              ref={loadMoreBtn}
              onClick={() => fetchNextPage()}
              disabled={isFetching}
              className={`px-6 py-3 rounded-full border-none text-white cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFetching
                  ? 'bg-white/10 cursor-not-allowed opacity-60'
                  : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0'
                }`}
            >
              {isFetching ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
