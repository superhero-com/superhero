import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TokenListTable, TrendminerBanner, PerformanceTimeframeSelector } from "..";
import { TokensService } from "../../../api/generated";
import LatestTransactionsCarousel from "../../../components/Trendminer/LatestTransactionsCarousel";
import TrendingPillsCarousel from "../../../components/Trendminer/TrendingPillsCarousel";
import RepositoriesList from "../components/RepositoriesList";
import { useAccount } from "../../../hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import AeButton from "@/components/AeButton";
import Head from "../../../seo/Head";
import Spinner from "@/components/Spinner";


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
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.marketCap); // Default to trending score like Vue
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
      title: 'Market Cap',
      value: SORT.marketCap,
    },
    {
      title: 'Trending Score',
      value: SORT.trendingScore,
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


  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen  text-white px-4">
      <Head
        title="Superhero - Explore Hashtags"
        description="Every hashtag is a token. Discover trending topics, trade opinions, and own the hype on Superhero."
        canonicalPath="/trends/tokens"
      />
      <TrendminerBanner />

      <LatestTransactionsCarousel />

      <TrendingPillsCarousel />

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
        {/* Left: Token List */}
        <div className="w-full">
          <div className="flex flex-col items-start mb-6 gap-3 w-full">
            <div className="flex text-xl sm:text-2xl font-bold text-gray-900 w-full">
              All Hashtags
            </div>

            {/* FILTERS */}
            <div className="flex w-full items-center gap-3 flex-wrap md:flex-nowrap">
              {/* OrderBy Filter */}
              <div className="w-full md:w-auto flex-shrink-0">
                <Select value={orderBy} onValueChange={updateOrderBy}>
                  <SelectTrigger className="px-2 py-2 h-10 bg-white text-gray-900 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-gray-50 w-full sm:w-auto sm:min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {orderByOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-gray-900 hover:bg-gray-100 text-xs">
                        {option.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owned by me */}
              {activeAccount && (
                <div className={`w-full md:w-auto flex-shrink-0 ${ownedOnly ? '' : 'rounded-2xl border-2 border-pink-500/80'}`}>
                  <AeButton
                    variant={ownedOnly ? "primary" : "ghost"}
                    className={`h-10 px-3 whitespace-nowrap w-full md:w-auto flex-shrink-0 transition-all duration-300 ${ownedOnly
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl'
                      : '!bg-transparent !backdrop-blur-0 !border-0 !ring-0 text-gray-700 hover:bg-pink-500/10'
                      }`}
                    onClick={() => setOwnedOnly(!ownedOnly)}
                  >
                    <span className="text-xs">Owned Only</span>
                  </AeButton>
                </div>
              )}

              {/* Search */}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hashtags..."
                  className="px-2 py-2 h-10 min-h-[auto] bg-white text-gray-900 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#1161FE] placeholder-gray-400 transition-all duration-300 hover:bg-gray-50 w-full md:flex-1 min-w-[160px] md:max-w-none"
                />

              {/* Performance Timeframe Selector */}
              <div className="flex items-center justify-center md:justify-start w-auto flex-shrink-0">
                <PerformanceTimeframeSelector />
              </div>
            </div>
          </div>

          {/* Message Box for no results */}
          {(!data?.pages?.length || !data?.pages[0].items.length) && !isFetching && (
            <div className="bg-white border border-gray-200 rounded-[24px] p-6 text-center text-gray-600 mb-4 shadow-sm">
              <h3 className="font-semibold mb-2 text-gray-900">No Token Sales</h3>
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
            hasNextPage={hasNextPage}
            isFetching={isFetching}
            onLoadMore={() => fetchNextPage()}
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
            className={`px-6 py-3 rounded-full border-none cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFetching
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300'
              }`}
          >
            {isFetching ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="w-4 h-4" />
                Loading...
              </div>
            ) : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
