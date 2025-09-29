import { useEffect, useMemo, useRef, useState } from "react";
import { TokenListTable, TrendminerBanner } from "..";
import { TokenDto, TokensService } from "../../../api/generated";
import LatestTransactionsCarousel from "../../../components/Trendminer/LatestTransactionsCarousel";
import TrendingPillsCarousel from "../../../components/Trendminer/TrendingPillsCarousel";
import RepositoriesList from "../components/RepositoriesList";

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
} as const;

type OrderByOption = typeof SORT[keyof typeof SORT];
type CollectionOption = 'all' | 'word' | 'number';

export default function TokenList() {
  const [collection, setCollection] = useState<CollectionOption>('all');
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.trendingScore);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ pages: Array<{ items: TokenDto[] }> } | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, TokenItem>>({});
  const [page, setPage] = useState(1);
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

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

  const collectionOptions: SelectOptions<CollectionOption> = [
    {
      title: 'All Tokens',
      value: 'all',
    },
    {
      title: 'Word Tokens',
      value: 'word',
    },
    {
      title: 'Number Tokens',
      value: 'number',
    },
  ];

  const activeCollectionOption = useMemo(() =>
    collectionOptions.find((option) => option.value === collection),
    [collection]
  );

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

  const orderDirection = useMemo((): 'ASC' | 'DESC' => {
    return orderBy === SORT.oldest ? 'ASC' : 'DESC';
  }, [orderBy]);

  function updateCollection(val: CollectionOption) {
    setCollection(val);
    setPage(1);
  }

  function updateOrderBy(val: OrderByOption) {
    setOrderBy(val);
    setPage(1);
  }

  async function fetchTokens(pageParam = 1, isInitial = false) {
    console.log('fetchTokens', pageParam, isInitial);
    if (isInitial) {
      setIsFetching(true);
      setError(null);
    }

    try {
      const response = await TokensService.listAll({
        orderBy: orderByMapped as any,
        orderDirection,
        collection: collection === 'all' ? undefined : collection,
        search: search || undefined,
        limit: 20,
        page: pageParam,
      }) as any; // Cast to any since the generated type is incomplete

      const newItems = response?.items || [];
      const hasMore = response?.meta?.currentPage < response?.meta?.totalPages;

      if (isInitial || pageParam === 1) {
        setData({ pages: [{ items: newItems }] });
      } else {
        setData(prev => {
          if (!prev) {
            return { pages: [{ items: newItems }] };
          }

          // Get all existing item addresses to prevent duplicates
          const existingAddresses = new Set(
            prev.pages.flatMap(page => page.items.map(item => item.address))
          );

          // Filter out items that already exist
          const uniqueNewItems = newItems.filter(item => !existingAddresses.has(item.address));

          return {
            pages: [...prev.pages, { items: uniqueNewItems }]
          };
        });
      }

      setHasNextPage(hasMore);
      setPage(pageParam);
    } catch (e: any) {
      setError(e?.message || "Failed to load tokens");
    } finally {
      if (isInitial) {
        setIsFetching(false);
      }
    }
  }

  const fetchNextPage = () => {
    if (hasNextPage && !isFetching) {
      fetchTokens(page + 1);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!data?.pages?.length) {
      fetchTokens(1, true);
    }
  }, [orderBy, orderByMapped, collection, search, orderDirection]);

  // Intersection observer for infinite loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio === 1) {
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
  }, [hasNextPage, isFetching, page]);

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  }

  return (
    <div className="max-w-[1400px] mx-auto min-h-screen  text-white">
      <TrendminerBanner />

      <LatestTransactionsCarousel />

      <TrendingPillsCarousel tagTokenMap={tagTokenMap} />

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left: Token List */}
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Tokenized Trends
              </h2>

              {/* FILTERS */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Collection Filter */}
                <select
                  className="px-3 py-2 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-xl text-sm focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05]"
                  value={collection}
                  onChange={(e) => updateCollection(e.target.value as CollectionOption)}
                >
                  {collectionOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled} className="bg-gray-900">
                      {option.title}
                    </option>
                  ))}
                </select>

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
            <TokenListTable pages={data?.pages} loading={isFetching} />
          </div>

          <RepositoriesList />
        </div>

        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center pt-2 pb-4">
            <button
              ref={loadMoreBtn}
              onClick={fetchNextPage}
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
