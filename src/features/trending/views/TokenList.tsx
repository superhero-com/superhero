import { Encoding, isEncoded } from '@aeternity/aepp-sdk';
import Spinner from '@/components/Spinner';
import { Input } from '@/components/ui/input';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import {
  DEFAULT_TAB_LIMIT,
  EXPLORE_SEARCH_QUERY_KEY,
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
import {
  PostResultsList,
  TokenResultsList,
  UserResultsList,
} from '../components/TrendSearchExploreResultLists';

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

const ORDER_BY_OPTIONS: SelectOptions<OrderByOption> = [
  { title: 'Market Cap', value: SORT.marketCap },
  { title: 'Trending', value: SORT.trendingScore },
  { title: 'Price', value: SORT.price },
  { title: 'Name', value: SORT.name },
  { title: 'Newest', value: SORT.newest },
  { title: 'Oldest', value: SORT.oldest },
  { title: 'Holders Count', value: SORT.holdersCount },
];

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
        className="text-lg sm:text-xl font-semibold text-white"
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

const TokenList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get(EXPLORE_SEARCH_QUERY_KEY)?.trim() ?? '';
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.trendingScore);
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [activeTab, setActiveTab] = useState<SearchTab>('tokens');
  const [searchInput, setSearchInput] = useState(qFromUrl);
  const [searchTerm, setSearchTerm] = useState(qFromUrl);
  const [expandedSections, setExpandedSections] = useState<Record<SearchTab, boolean>>({
    tokens: false,
    users: false,
    posts: false,
  });
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (qFromUrl) {
      setSearchInput(qFromUrl);
      setSearchTerm(qFromUrl);
    }
  }, [qFromUrl]);

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

  const handleOpenPost = useCallback(
    (slugOrId: string) => navigate(`/post/${encodeURIComponent(slugOrId)}`),
    [navigate],
  );

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
    queryKey: ['trends', 'fallback', 'tokens', FALLBACK_LIMIT],
    queryFn: () => fetchTrendingTokens(FALLBACK_LIMIT),
    staleTime: 60 * 1000,
  });

  const fallbackUsersQuery = useQuery({
    enabled: hasSearch
      && searchPreviewQuery.isSuccess
      && searchPreviewQuery.data.users.items.length === 0,
    queryKey: ['trends', 'fallback', 'users', FALLBACK_LIMIT],
    queryFn: () => fetchTopTraders(FALLBACK_LIMIT),
    staleTime: 60 * 1000,
  });

  const fallbackPostsQuery = useQuery({
    enabled: hasSearch
      && searchPreviewQuery.isSuccess
      && searchPreviewQuery.data.posts.items.length === 0,
    queryKey: ['trends', 'fallback', 'posts', FALLBACK_LIMIT],
    queryFn: () => fetchPopularPosts(FALLBACK_LIMIT),
    staleTime: 60 * 1000,
  });

  const searchOrder = useMemo(() => {
    const preview = searchPreviewQuery.data;
    if (!preview) {
      return [activeTab, ...SEARCH_TABS.filter((t) => t !== activeTab)];
    }

    const counts: Record<SearchTab, number> = {
      tokens: preview.tokens.items.length,
      users: preview.users.items.length,
      posts: preview.posts.items.length,
    };

    const isAddress = isEncoded(searchTerm, Encoding.AccountAddress);
    const hasExactUserMatch = isAddress
      && preview.users.items.some(
        (u) => u.address.toLowerCase() === searchTerm.toLowerCase(),
      );
    const hasExactTokenMatch = isAddress
      && preview.tokens.items.some(
        (t) => (t as any).address?.toLowerCase() === searchTerm.toLowerCase(),
      );

    const score = (tab: SearchTab): number => {
      const count = counts[tab];
      if (count === 0) return -1;

      let s = count;
      if (tab === 'users' && hasExactUserMatch) s += 1000;
      if (tab === 'tokens' && hasExactTokenMatch) s += 1000;
      if (tab === activeTab) s += 0.5;
      return s;
    };

    return [...SEARCH_TABS].sort((a, b) => score(b) - score(a));
  }, [activeTab, searchPreviewQuery.data, searchTerm]);

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

  function openFullTopic(tab: SearchTab) {
    setExpandedSections({
      tokens: false,
      users: false,
      posts: false,
    });
    setActiveTab(tab);
    setSearchInput('');
    setSearchTerm('');
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
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4">
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

            {!hasSearch ? (
              <div className="flex items-center gap-6 border-b border-white/10 w-full overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {SEARCH_TABS.map((tab) => {
                  const isActive = activeTab === tab;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`normal-case tracking-normal relative pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1161FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm ${
                        isActive ? 'text-white' : 'text-white/55 hover:text-white/80'
                      }`}
                    >
                      {TAB_LABELS[tab]}
                      {isActive ? (
                        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1161FE]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
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
                const footerLabel = expanded && !state.usesFallback ? 'Show less' : 'View all';

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
                      onOpenPost={handleOpenPost}
                    />
                  );
                }

                return (
                  <SearchSectionShell
                    key={tab}
                    title={TAB_LABELS[tab]}
                    subtitle={subtitle}
                    contentClassName={tab === 'posts' ? 'divide-y-0' : undefined}
                    footer={state.canExpand || state.usesFallback ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (state.usesFallback) {
                            openFullTopic(tab);
                            return;
                          }

                          toggleSection(tab);
                        }}
                        className="text-sm font-medium text-[#8bc9ff] hover:text-white transition-colors"
                      >
                        {footerLabel}
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

              <div className="mb-6 w-full">
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
                    <div className="text-xl font-bold text-white sm:text-2xl">
                      Tokenized Trends
                    </div>
                    <div className="w-full sm:w-auto sm:flex-shrink-0">
                      <Select value={orderBy} onValueChange={updateOrderBy}>
                        <SelectTrigger className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-xs text-white backdrop-blur-[10px] transition-all duration-300 hover:bg-white/[0.05] focus:outline-none focus:border-[#1161FE] sm:min-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/10">
                          {ORDER_BY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10 text-xs">
                              {option.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Link
                    to="/trends/create"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/[0.08] hover:border-white/25 hover:shadow-[0_0_12px_rgba(255,255,255,0.06)] active:scale-[0.97] cursor-pointer"
                  >
                    Tokenize Trend
                  </Link>
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
                  onOpenPost={handleOpenPost}
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
