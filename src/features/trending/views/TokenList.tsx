import Spinner from '@/components/Spinner';
import AddressAvatar from '@/components/AddressAvatar';
import { Input } from '@/components/ui/input';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TokensService } from '../../../api/generated';
import LatestTransactionsCarousel from '../../../components/Trendminer/LatestTransactionsCarousel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Head } from '../../../seo/Head';
import { formatAddress } from '../../../utils/address';
import { formatCompactNumber } from '../../../utils/number';
import {
  DEFAULT_TAB_LIMIT,
  FALLBACK_LIMIT,
  SEARCH_PREVIEW_LIMIT,
  fetchPopularPosts,
  fetchTopTraders,
  fetchTrendingTokens,
  fetchTrendSearchPreview,
  fetchTrendSearchSection,
  type SearchSection,
  type SearchTab,
  type TrendPostItem,
  type TrendTokenItem,
  type TrendUserItem,
} from '../api/trendsSearch';
import type { LeaderboardItem } from '../api/leaderboard';
import TokenListTable from '../components/TokenListTable';
import ReplyToFeedItem from '../../social/components/ReplyToFeedItem';

type SelectOptions<T> = Array<{
  title: string;
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

const SEARCH_TABS: SearchTab[] = ['tokens', 'users', 'posts'];

const TAB_LABELS: Record<SearchTab, string> = {
  tokens: 'Tokens',
  users: 'Users',
  posts: 'Posts',
};

type OrderByOption = typeof SORT[keyof typeof SORT];
type CollectionOption = 'all' | string;

function isLeaderboardItem(item: TrendUserItem | LeaderboardItem): item is LeaderboardItem {
  return 'pnl_usd' in item || 'aum_usd' in item || 'roi_pct' in item || 'mdd_pct' in item;
}

function getFallbackSubtitle(tab: SearchTab) {
  if (tab === 'tokens') {
    return 'No matching tokens found. Showing trending tokens instead.';
  }

  if (tab === 'users') {
    return 'No matching users found. Showing top traders instead.';
  }

  return 'No matching posts found. Showing popular posts instead.';
}

const SearchSectionShell = ({
  title,
  subtitle,
  children,
  footer,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}) => (
  <section className="overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-4 sm:p-6">
    <div className="flex flex-col gap-1 mb-4">
      <h2
        className="no-gradient-text text-lg sm:text-xl font-semibold text-white"
        style={{
          color: 'var(--standard-font-color)',
          WebkitTextFillColor: 'var(--standard-font-color)',
          background: 'none',
          WebkitBackgroundClip: 'initial',
          backgroundClip: 'initial',
        }}
      >
        {title}
      </h2>
      {subtitle ? <p className="text-sm text-white/60">{subtitle}</p> : null}
    </div>
    <div className={`flex flex-col divide-y divide-white/10 ${contentClassName || ''}`}>{children}</div>
    {footer ? <div className="pt-4">{footer}</div> : null}
  </section>
);

const EmptyPanel = ({ message }: { message: string }) => (
  <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 text-center text-white/70">
    {message}
  </div>
);

const InlineLoading = ({ label = 'Loading...' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/70">
    <Spinner className="w-4 h-4" />
    <span>{label}</span>
  </div>
);

const TokenResultsList = ({ items }: { items: TrendTokenItem[] }) => (
  <TokenListTable
    pages={[{ items }]}
    loading={false}
    orderBy="market_cap"
    orderDirection="DESC"
    onSort={() => {}}
  />
);

const UserResultsList = ({ items }: { items: Array<TrendUserItem | LeaderboardItem> }) => (
  <>
    {items.map((item) => {
      const { address } = item;
      const title = item.chain_name || formatAddress(address, 6);

      if (isLeaderboardItem(item)) {
        return (
          <Link
            key={address}
            to={`/users/${address}`}
            className="no-gradient-text flex flex-col gap-3 px-1 py-4 text-white transition-colors hover:bg-white/[0.03] hover:text-white rounded-xl sm:flex-row sm:items-center sm:justify-between"
            style={{
              color: 'var(--standard-font-color)',
              WebkitTextFillColor: 'var(--standard-font-color)',
              background: 'none',
              WebkitBackgroundClip: 'initial',
              backgroundClip: 'initial',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <AddressAvatar address={address} size={40} borderRadius="50%" />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white truncate">{title}</div>
                <div className="text-[10px] text-white/60 font-mono truncate">
                  {formatAddress(address, 10, false)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 sm:text-right sm:min-w-[340px]">
              <div>
                <div className="text-white/50">PnL</div>
                <div className="text-white">
                  {`$${formatCompactNumber(item.pnl_usd, 2, 1)}`}
                </div>
              </div>
              <div>
                <div className="text-white/50">ROI</div>
                <div className="text-white">
                  {`${formatCompactNumber(item.roi_pct, 2, 1)}%`}
                </div>
              </div>
              <div>
                <div className="text-white/50">AUM</div>
                <div className="text-white">
                  {`$${formatCompactNumber(item.aum_usd, 2, 1)}`}
                </div>
              </div>
            </div>
          </Link>
        );
      }

      return (
        <Link
          key={address}
          to={`/users/${address}`}
          className="no-gradient-text flex flex-col gap-3 px-1 py-4 text-white transition-colors hover:bg-white/[0.03] hover:text-white rounded-xl sm:flex-row sm:items-center sm:justify-between"
          style={{
            color: 'var(--standard-font-color)',
            WebkitTextFillColor: 'var(--standard-font-color)',
            background: 'none',
            WebkitBackgroundClip: 'initial',
            backgroundClip: 'initial',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AddressAvatar address={address} size={40} borderRadius="50%" />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-white truncate">{title}</div>
              <div className="text-[10px] text-white/60 font-mono truncate">
                {formatAddress(address, 10, false)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 sm:text-right sm:min-w-[340px]">
            <div>
              <div className="text-white/50">Volume</div>
              <div className="text-white">
                {`${formatCompactNumber(item.total_volume, 2, 1)} AE`}
              </div>
            </div>
            <div>
              <div className="text-white/50">Txs</div>
              <div className="text-white">{formatCompactNumber(item.total_tx_count, 0, 1)}</div>
            </div>
            <div>
              <div className="text-white/50">Created</div>
              <div className="text-white">{formatCompactNumber(item.total_created_tokens, 0, 1)}</div>
            </div>
          </div>
        </Link>
      );
    })}
  </>
);

const PostResultsList = ({
  items,
  onOpenPost,
}: {
  items: TrendPostItem[];
  onOpenPost: (slugOrId: string) => void;
}) => (
  <>
    {items.map((post) => (
      <ReplyToFeedItem
        key={post.id}
        item={post}
        commentCount={post.total_comments ?? 0}
        allowInlineRepliesToggle={false}
        onOpenPost={onOpenPost}
      />
    ))}
  </>
);

const TokenList = () => {
  const navigate = useNavigate();
  const [collection] = useState<CollectionOption>('all');
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.trendingScore);
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [activeTab, setActiveTab] = useState<SearchTab>('tokens');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<SearchTab, boolean>>({
    tokens: false,
    users: false,
    posts: false,
  });
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setExpandedSections({
      tokens: false,
      users: false,
      posts: false,
    });
  }, [searchTerm]);

  const hasSearch = searchTerm.length > 0;

  const orderByOptions: SelectOptions<OrderByOption> = [
    { title: 'Market Cap', value: SORT.marketCap },
    { title: 'Trending', value: SORT.trendingScore },
    { title: 'Price', value: SORT.price },
    { title: 'Name', value: SORT.name },
    { title: 'Newest', value: SORT.newest },
    { title: 'Oldest', value: SORT.oldest },
    { title: 'Holders Count', value: SORT.holdersCount },
  ];

  const orderByMapped = useMemo(() => {
    if (orderBy === SORT.newest || orderBy === SORT.oldest) {
      return 'created_at';
    }

    return orderBy;
  }, [orderBy]);

  const finalOrderDirection = useMemo((): 'ASC' | 'DESC' => {
    if (orderBy === SORT.oldest) return 'ASC';
    if (orderBy === SORT.newest) return 'DESC';
    return orderDirection;
  }, [orderBy, orderDirection]);

  const {
    data: tokenPages,
    isFetching: isFetchingTokens,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    enabled: !hasSearch && activeTab === 'tokens',
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => TokensService.listAll({
      orderBy: orderByMapped as any,
      orderDirection: finalOrderDirection,
      collection: collection === 'all' ? undefined : (collection as any),
      limit: 20,
      page: pageParam,
    }),
    getNextPageParam: (lastPage: any, _allPages, lastPageParam) => (
      lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
        ? undefined
        : lastPageParam + 1
    ),
    queryKey: [
      'TokensService.listAll',
      orderBy,
      orderByMapped,
      finalOrderDirection,
      collection,
      activeTab,
      hasSearch,
    ],
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (hasSearch || activeTab !== 'tokens') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio === 1 && hasNextPage && !isFetchingTokens) {
          fetchNextPage();
        }
      },
      { threshold: 1 },
    );

    if (loadMoreBtn.current) {
      observer.observe(loadMoreBtn.current);
    }

    return () => observer.disconnect();
  }, [activeTab, fetchNextPage, hasNextPage, hasSearch, isFetchingTokens]);

  const usersTabQuery = useQuery({
    enabled: !hasSearch && activeTab === 'users',
    queryKey: ['trends', 'top-traders', DEFAULT_TAB_LIMIT],
    queryFn: () => fetchTopTraders(DEFAULT_TAB_LIMIT),
    staleTime: 60 * 1000,
  });

  const postsTabQuery = useQuery({
    enabled: !hasSearch && activeTab === 'posts',
    queryKey: ['trends', 'popular-posts', DEFAULT_TAB_LIMIT],
    queryFn: () => fetchPopularPosts(DEFAULT_TAB_LIMIT),
    staleTime: 60 * 1000,
  });

  const searchPreviewQuery = useQuery({
    enabled: hasSearch,
    queryKey: ['trends', 'search-preview', searchTerm],
    queryFn: () => fetchTrendSearchPreview(searchTerm),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const expandedTokenQuery = useQuery({
    enabled: hasSearch
      && expandedSections.tokens
      && (searchPreviewQuery.data?.tokens.meta.totalItems ?? 0) > SEARCH_PREVIEW_LIMIT,
    queryKey: ['trends', 'search-section', 'tokens', searchTerm],
    queryFn: () => fetchTrendSearchSection('tokens', searchTerm),
    staleTime: 30 * 1000,
  });

  const expandedUsersQuery = useQuery({
    enabled: hasSearch
      && expandedSections.users
      && (searchPreviewQuery.data?.users.meta.totalItems ?? 0) > SEARCH_PREVIEW_LIMIT,
    queryKey: ['trends', 'search-section', 'users', searchTerm],
    queryFn: () => fetchTrendSearchSection('users', searchTerm),
    staleTime: 30 * 1000,
  });

  const expandedPostsQuery = useQuery({
    enabled: hasSearch
      && expandedSections.posts
      && (searchPreviewQuery.data?.posts.meta.totalItems ?? 0) > SEARCH_PREVIEW_LIMIT,
    queryKey: ['trends', 'search-section', 'posts', searchTerm],
    queryFn: () => fetchTrendSearchSection('posts', searchTerm),
    staleTime: 30 * 1000,
  });

  const fallbackTokensQuery = useQuery({
    enabled: hasSearch
      && searchPreviewQuery.isSuccess
      && searchPreviewQuery.data.tokens.items.length === 0,
    queryKey: ['trends', 'fallback', 'tokens', searchTerm],
    queryFn: () => fetchTrendingTokens(FALLBACK_LIMIT),
    staleTime: 60 * 1000,
  });

  const fallbackUsersQuery = useQuery({
    enabled: hasSearch
      && searchPreviewQuery.isSuccess
      && searchPreviewQuery.data.users.items.length === 0,
    queryKey: ['trends', 'fallback', 'users', searchTerm],
    queryFn: () => fetchTopTraders(FALLBACK_LIMIT),
    staleTime: 60 * 1000,
  });

  const fallbackPostsQuery = useQuery({
    enabled: hasSearch
      && searchPreviewQuery.isSuccess
      && searchPreviewQuery.data.posts.items.length === 0,
    queryKey: ['trends', 'fallback', 'posts', searchTerm],
    queryFn: () => fetchPopularPosts(FALLBACK_LIMIT),
    staleTime: 60 * 1000,
  });

  const searchOrder = useMemo(
    () => [activeTab, ...SEARCH_TABS.filter((tab) => tab !== activeTab)],
    [activeTab],
  );

  function updateOrderBy(val: OrderByOption) {
    setOrderBy(val);
    setOrderDirection('DESC');
  }

  function handleSort(sortKey: OrderByOption) {
    if (
      orderBy === sortKey
      || (orderBy === 'newest' && sortKey === 'oldest')
      || (orderBy === 'oldest' && sortKey === 'newest')
    ) {
      if (sortKey === 'newest' || sortKey === 'oldest') {
        setOrderBy(orderBy === 'newest' ? 'oldest' : 'newest');
        return;
      }

      setOrderDirection(orderDirection === 'DESC' ? 'ASC' : 'DESC');
      return;
    }

    setOrderBy(sortKey);
    setOrderDirection('DESC');
  }

  function toggleSection(tab: SearchTab) {
    setExpandedSections((current) => ({
      ...current,
      [tab]: !current[tab],
    }));
  }

  function getSearchSectionState<TItem>(
    tab: SearchTab,
    preview: SearchSection<TItem> | undefined,
    expanded: SearchSection<TItem> | undefined,
    fallback: SearchSection<any> | undefined,
  ) {
    const hasResults = Boolean(preview?.items.length);
    const isExpanded = expandedSections[tab];
    const usesExpandedData = isExpanded && Boolean(expanded?.items.length);

    if (hasResults) {
      const items = usesExpandedData ? expanded!.items : preview!.items;
      const totalItems = usesExpandedData ? expanded!.meta.totalItems : preview!.meta.totalItems;

      return {
        items,
        totalItems,
        hasResults: true,
        usesFallback: false,
        canExpand: (preview?.meta.totalItems ?? 0) > SEARCH_PREVIEW_LIMIT,
      };
    }

    return {
      items: fallback?.items ?? [],
      totalItems: fallback?.meta.totalItems ?? 0,
      hasResults: false,
      usesFallback: true,
      canExpand: false,
    };
  }

  const tokenSearchState = getSearchSectionState(
    'tokens',
    searchPreviewQuery.data?.tokens,
    expandedTokenQuery.data as SearchSection<TrendTokenItem> | undefined,
    fallbackTokensQuery.data,
  );
  const userSearchState = getSearchSectionState(
    'users',
    searchPreviewQuery.data?.users,
    expandedUsersQuery.data as SearchSection<TrendUserItem> | undefined,
    fallbackUsersQuery.data,
  );
  const postSearchState = getSearchSectionState(
    'posts',
    searchPreviewQuery.data?.posts,
    expandedPostsQuery.data as SearchSection<TrendPostItem> | undefined,
    fallbackPostsQuery.data,
  );

  const searchStates = {
    tokens: tokenSearchState,
    users: userSearchState,
    posts: postSearchState,
  };

  const showSearchLoading = hasSearch && searchPreviewQuery.isLoading;
  const searchError = hasSearch && searchPreviewQuery.isError
    ? 'Unable to load search results right now. Please try again.'
    : null;

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4 pt-20 sm:pt-24">
      <Head
        title="Superhero.com – Search Trends, Users and Posts"
        description="Search tokenized trends, creators, traders, and posts across Superhero."
        canonicalPath="/trends/tokens"
      />

      <div className="gap-4">
        <div className="w-full">
          <div className="flex flex-col items-start gap-3 w-full mb-6">
            <div className="w-full max-w-4xl">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" />
                <Input
                  id="trend-search"
                  aria-label="Search tokens, users and posts"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search trends, users or posts"
                  className="h-12 rounded-2xl border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white placeholder:text-white/45 focus-visible:ring-[#1161FE]"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 border-b border-white/10 w-full overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {SEARCH_TABS.map((tab) => {
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`no-gradient-text normal-case tracking-normal relative pb-3 text-sm font-semibold transition-colors ${
                      isActive ? 'text-white' : 'text-white/55 hover:text-white/80'
                    }`}
                    style={{
                      color: isActive ? 'var(--standard-font-color)' : 'rgba(248, 250, 252, 0.55)',
                      WebkitTextFillColor: isActive ? 'var(--standard-font-color)' : 'rgba(248, 250, 252, 0.55)',
                      background: 'none',
                      WebkitBackgroundClip: 'initial',
                      backgroundClip: 'initial',
                    }}
                  >
                    {TAB_LABELS[tab]}
                    {isActive ? (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1161FE]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {searchError ? <EmptyPanel message={searchError} /> : null}

          {showSearchLoading ? <InlineLoading label="Searching trends..." /> : null}

          {hasSearch && !showSearchLoading && !searchError ? (
            <div className="flex flex-col gap-4">
              {searchOrder.map((tab) => {
                const state = searchStates[tab];

                if (!state.items.length) {
                  return null;
                }

                const expanded = expandedSections[tab];
                const isLoadingExpanded = (
                  (tab === 'tokens' && expandedTokenQuery.isLoading)
                  || (tab === 'users' && expandedUsersQuery.isLoading)
                  || (tab === 'posts' && expandedPostsQuery.isLoading)
                );

                const subtitle = state.hasResults
                  ? `${state.totalItems} result${state.totalItems === 1 ? '' : 's'}`
                  : getFallbackSubtitle(tab);

                let sectionBody: React.ReactNode = null;
                if (tab === 'tokens') {
                  sectionBody = <TokenResultsList items={state.items as TrendTokenItem[]} />;
                } else if (tab === 'users') {
                  sectionBody = (
                    <UserResultsList
                      items={state.items as Array<TrendUserItem | LeaderboardItem>}
                    />
                  );
                } else {
                  sectionBody = (
                    <PostResultsList
                      items={state.items as TrendPostItem[]}
                      onOpenPost={(slugOrId) => navigate(`/post/${encodeURIComponent(slugOrId)}`)}
                    />
                  );
                }

                return (
                  <SearchSectionShell
                    key={tab}
                    title={TAB_LABELS[tab]}
                    subtitle={subtitle}
                    contentClassName={tab === 'posts' ? 'divide-y-0' : undefined}
                    footer={state.hasResults && state.canExpand ? (
                      <button
                        type="button"
                        onClick={() => toggleSection(tab)}
                        className="text-sm font-medium text-[#8bc9ff] hover:text-white transition-colors"
                      >
                        {expanded ? 'Show less' : 'View all'}
                      </button>
                    ) : null}
                  >
                    {sectionBody}
                    {expanded && isLoadingExpanded ? <InlineLoading label="Loading more results..." /> : null}
                  </SearchSectionShell>
                );
              })}
            </div>
          ) : null}

          {!hasSearch && activeTab === 'tokens' ? (
            <>
              <div className="mb-6">
                <LatestTransactionsCarousel />
              </div>

              <div className="flex flex-col items-start mb-6 gap-3 w-full">
                <div className="flex text-xl sm:text-2xl font-bold text-white w-full">
                  Tokenized Trends
                </div>

                <div className="flex w-full items-center gap-3 flex-wrap md:flex-nowrap">
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
                </div>
              </div>

              {(!tokenPages?.pages?.length || !tokenPages.pages[0].items.length)
              && !isFetchingTokens ? (
                <EmptyPanel message="No token sales are available right now." />
                ) : null}

              <TokenListTable
                pages={tokenPages?.pages}
                loading={isFetchingTokens}
                orderBy={orderBy}
                orderDirection={finalOrderDirection}
                onSort={handleSort}
              />

              {hasNextPage ? (
                <div className="text-center pt-2 pb-4">
                  <button
                    ref={loadMoreBtn}
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingTokens}
                    className={`px-6 py-3 rounded-full border text-white cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ${
                      isFetchingTokens
                        ? 'border-white/10 bg-white/10 cursor-not-allowed opacity-60'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    {isFetchingTokens ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="w-4 h-4" />
                        Loading...
                      </div>
                    ) : 'Load More'}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {!hasSearch && activeTab === 'users' ? (
            <SearchSectionShell title="Top Traders" subtitle="The most active traders on Superhero right now.">
              {usersTabQuery.isLoading ? <InlineLoading /> : null}
              {!usersTabQuery.isLoading && usersTabQuery.data?.items.length ? (
                <UserResultsList items={usersTabQuery.data.items} />
              ) : null}
              {!usersTabQuery.isLoading && !usersTabQuery.data?.items.length ? (
                <div className="py-6 text-sm text-white/60">No leaderboard data is available right now.</div>
              ) : null}
            </SearchSectionShell>
          ) : null}

          {!hasSearch && activeTab === 'posts' ? (
            <SearchSectionShell title="Popular Posts" subtitle="What the community is talking about the most.">
              {postsTabQuery.isLoading ? <InlineLoading /> : null}
              {!postsTabQuery.isLoading && postsTabQuery.data?.items.length ? (
                <PostResultsList
                  items={postsTabQuery.data.items}
                  onOpenPost={(slugOrId) => navigate(`/post/${encodeURIComponent(slugOrId)}`)}
                />
              ) : null}
              {!postsTabQuery.isLoading && !postsTabQuery.data?.items.length ? (
                <div className="py-6 text-sm text-white/60">No popular posts are available right now.</div>
              ) : null}
            </SearchSectionShell>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TokenList;
