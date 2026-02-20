import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import AeButton from '@/components/AeButton';
import Spinner from '@/components/Spinner';
import TokenListTable from '../components/TokenListTable';
import TrendminerBanner from '../components/TrendminerBanner';
import PerformanceTimeframeSelector from '../components/PerformanceTimeframeSelector';
import { TokensService } from '../../../api/generated';
import LatestTransactionsCarousel from '../../../components/Trendminer/LatestTransactionsCarousel';
import TrendingPillsCarousel from '../../../components/Trendminer/TrendingPillsCarousel';
import { useAccount } from '../../../hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Head } from '../../../seo/Head';
import { SuperheroApi } from '../../../api/backend';
import { TrendingTag } from '../components/TrendingTagTableRow';

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

function hasTrendingTagToken(repo: any): boolean {
  return !!(
    repo?.token_sale_address
    || repo?.sale_address
    || repo?.token_address
    || repo?.tokenSaleAddress
    || repo?.saleAddress
    || repo?.token?.address
  );
}

const TokenList = () => {
  const { activeAccount } = useAccount();

  const [collection] = useState<CollectionOption>('all');
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.marketCap);
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [searchThrottled, setSearchThrottled] = useState('');
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  // Trending tags state
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [trendingTagsLoading, setTrendingTagsLoading] = useState(true);
  const [trendingSearch, setTrendingSearch] = useState('');
  const [trendingSearchThrottled, setTrendingSearchThrottled] = useState('');

  // Throttle search input (2000ms delay like Vue)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchThrottled(search);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Throttle trending search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTrendingSearchThrottled(trendingSearch);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [trendingSearch]);

  const fetchTrendingTags = useCallback(async () => {
    try {
      setTrendingTagsLoading(true);
      const response = await SuperheroApi.listTrendingTags({
        orderBy: 'score',
        orderDirection: 'DESC',
        limit: 20,
        page: 1,
        search: trendingSearchThrottled || undefined,
      });
      const items: any[] = response?.items ?? [];
      setTrendingTags(
        items
          .filter((repo) => !hasTrendingTagToken(repo))
          .map((repo) => ({
            fullName: repo.fullName,
            tag: repo.tag,
            score: repo.score,
            source: repo.source,
          })),
      );
    } catch {
      setTrendingTags([]);
    } finally {
      setTrendingTagsLoading(false);
    }
  }, [trendingSearchThrottled]);

  useEffect(() => {
    fetchTrendingTags();
  }, [fetchTrendingTags]);

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

  const ownerAddress = useMemo(
    () => (ownedOnly ? activeAccount : undefined),
    [ownedOnly, activeAccount],
  );

  const {
    data, isFetching, fetchNextPage, hasNextPage,
  } = useInfiniteQuery({
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => TokensService.listAll({
      orderBy: orderByMapped as any,
      orderDirection: finalOrderDirection,
      collection: collection === 'all' ? undefined : (collection as any),
      search: searchThrottled || undefined,
      ownerAddress,
      limit: 20,
      page: pageParam,
    }),
    getNextPageParam: (
      lastPage: any,
      allPages,
      lastPageParam,
    ) => (lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
      ? undefined
      : lastPageParam + 1),
    queryKey: [
      'TokensService.listAll',
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
    if (orderBy === sortKey
      || (orderBy === 'newest' && sortKey === 'oldest')
      || (orderBy === 'oldest' && sortKey === 'newest')) {
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
      { threshold: 1 },
    );

    if (loadMoreBtn.current) {
      observer.observe(loadMoreBtn.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetching, fetchNextPage]);

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4">
      <Head
        title="Superhero.com – Tokenize Trends. Own the Hype. Build Communities."
        description="Discover and tokenize trending topics. Trade tokens, build communities, and own the hype on Superhero."
        canonicalPath="/trends/tokens"
      />
      <TrendminerBanner />

      <LatestTransactionsCarousel />

      <TrendingPillsCarousel />

      {/* Main content — unified single-column table */}
      <div className="w-full">
        <div className="flex flex-col items-start mb-6 gap-3 w-full">
          <div className="flex text-xl sm:text-2xl font-bold text-white w-full">
            Tokenized Trends
          </div>

          {/* FILTERS */}
          <div className="flex w-full items-center gap-3 flex-wrap md:flex-nowrap">
            {/* OrderBy Filter */}
            <div className="w-full md:w-auto flex-shrink-0">
              <Select value={orderBy} onValueChange={updateOrderBy}>
                <SelectTrigger className="px-2 py-2 h-10 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] w-full sm:w-auto sm:min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {orderByOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10 text-xs">
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
                  variant={ownedOnly ? 'primary' : 'ghost'}
                  className={`h-10 px-3 whitespace-nowrap w-full md:w-auto flex-shrink-0 transition-all duration-300 ${ownedOnly
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl'
                    : '!bg-transparent !backdrop-blur-0 !border-0 !ring-0 text-white hover:bg-pink-500/10'
                  }`}
                  onClick={() => setOwnedOnly(!ownedOnly)}
                >
                  <span className="text-xs">Owned Only</span>
                </AeButton>
              </div>
            )}

            {/* Token search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tokens"
              className="px-2 py-2 h-10 min-h-[auto] bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] placeholder-white/50 transition-all duration-300 hover:bg-white/[0.05] w-full md:flex-1 min-w-[160px] md:max-w-none"
            />

            {/* Trending tags search */}
            <div className="relative w-full md:w-auto md:flex-1 min-w-[160px] flex-shrink-0">
              <input
                value={trendingSearch}
                onChange={(e) => setTrendingSearch(e.target.value)}
                placeholder="Search trends..."
                className="px-2 py-2 h-10 min-h-[auto] bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-purple-500 placeholder-white/50 transition-all duration-300 hover:bg-white/[0.05] w-full pr-8"
              />
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>

            {/* Performance Timeframe Selector */}
            <div className="flex items-center justify-center md:justify-start w-auto flex-shrink-0">
              <PerformanceTimeframeSelector />
            </div>
          </div>
        </div>

        {/* Message Box for no results */}
        {(!data?.pages?.length || !data?.pages[0].items.length) && !isFetching && (
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 text-center text-white/80 mb-4">
            <h3 className="font-semibold mb-2 text-white">No Token Sales</h3>
            <p>No tokens found matching your criteria.</p>
          </div>
        )}

        {/* Unified Token + Trending Table */}
        <TokenListTable
          pages={data?.pages}
          loading={isFetching}
          orderBy={orderBy}
          orderDirection={finalOrderDirection}
          onSort={handleSort}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          onLoadMore={() => fetchNextPage()}
          trendingTags={trendingTags}
          trendingTagsLoading={trendingTagsLoading}
        />
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="text-center pt-2 pb-4">
          <button
            ref={loadMoreBtn}
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            className={`px-6 py-3 rounded-full border-none text-white cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFetching
              ? 'bg-white/10 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300'
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
};

export default TokenList;
