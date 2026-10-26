import { Encoding, isEncoded } from '@aeternity/aepp-sdk';
import Spinner from '@/components/Spinner';
import { Input } from '@/components/ui/input';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEnsureFactorySchemaLoaded } from '@/hooks/useCommunityFactory';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';
import { usePostLanguageFilter } from '@/hooks/usePostLanguageFilter';
import { collectionLabel, LANGUAGE_COLLECTIONS } from '@/utils/collection';
import { TokensService } from '../../../api/generated';
import PostLanguageFilterControl from '../../social/components/PostLanguageFilterControl';
import PostLanguageEmptyState from '../../social/components/PostLanguageEmptyState';
import PostLanguageErrorState from '../../social/components/PostLanguageErrorState';
import EmptyState from '../../social/components/EmptyState';
import LatestTransactionsCarousel from '../../../components/Trendminer/LatestTransactionsCarouselClassic';
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
  EXPLORE_SEARCH_TYPE_KEY,
  FALLBACK_LIMIT,
  SEARCH_PREVIEW_LIMIT,
  fetchPopularPosts,
  fetchTopTraders,
  fetchTrendingTokens,
  fetchTrendSearchPreview,
  fetchTrendSearchSection,
  type SearchSection,
  type TokenSearchOptions,
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

type SearchCategory = 'all' | SearchTab;

const SEARCH_CATEGORIES: SearchCategory[] = ['all', ...SEARCH_TABS];

type OrderByOption = typeof SORT[keyof typeof SORT];

/** Sort state for a token table, mapped to the order /api/tokens expects. */
function useTokenSort(initialOrderBy: OrderByOption) {
  const [orderBy, setOrderBy] = useState<OrderByOption>(initialOrderBy);
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');

  const orderByMapped = orderBy === SORT.newest || orderBy === SORT.oldest
    ? 'created_at' as const
    : orderBy;
  let finalOrderDirection = orderDirection;
  if (orderBy === SORT.oldest) finalOrderDirection = 'ASC';
  if (orderBy === SORT.newest) finalOrderDirection = 'DESC';

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

  return {
    orderBy, orderByMapped, finalOrderDirection, updateOrderBy, handleSort,
  };
}

const TokenListControls = ({
  orderBy,
  orderByOptions,
  onOrderByChange,
  collection,
  collectionOptions,
  onCollectionChange,
}: {
  orderBy: OrderByOption;
  orderByOptions: SelectOptions<OrderByOption>;
  onOrderByChange: (value: OrderByOption) => void;
  collection: string;
  collectionOptions: SelectOptions<string>;
  onCollectionChange: (value: string) => void;
}) => {
  const { t, i18n } = useTranslation('trending');

  return (
    <>
      <div className="flex-1 sm:w-auto sm:flex-none sm:flex-shrink-0">
        <Select value={orderBy} onValueChange={onOrderByChange}>
          <SelectTrigger aria-label={t('tokenList.sortBy')} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 text-xs text-white transition-all duration-300 hover:bg-white/[0.08] focus:outline-none focus:border-[#1161FE] sm:min-w-[140px]">
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
      {collectionOptions.length > 1 && (
        <div className="flex-1 sm:w-auto sm:flex-none sm:flex-shrink-0">
          <Select dir={i18n.dir()} value={collection} onValueChange={onCollectionChange}>
            <SelectTrigger aria-label={t('tokenListTable.collection')} className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 text-xs text-white transition-all duration-300 hover:bg-white/[0.08] focus:outline-none focus:border-[#1161FE] sm:min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10">
              {collectionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10 text-xs">
                  {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
};

const SearchSectionShell = ({
  title,
  subtitle,
  actions,
  children,
  footer,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}) => (
  <section className="overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="flex flex-col gap-1">
        <h2
          className="text-lg sm:text-xl font-semibold text-white"
        >
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-white/60">{subtitle}</p> : null}
      </div>
      {actions}
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

const InlineLoading = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/70">
    <Spinner className="w-4 h-4" />
    <span>{label}</span>
  </div>
);

const LoadMoreButton = ({
  loading,
  onClick,
  sentinelRef,
}: {
  loading: boolean;
  onClick: () => void;
  sentinelRef: (element: Element | null) => void;
}) => {
  const { t } = useTranslation('trending');

  return (
    <button
      ref={sentinelRef}
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`px-6 py-3 rounded-full border text-white cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ${
        loading
          ? 'border-white/10 bg-white/10 cursor-not-allowed opacity-60'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
      }`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <Spinner className="w-4 h-4" />
          {t('tokenList.loadingEllipsis')}
        </div>
      ) : t('tokenList.loadMore')}
    </button>
  );
};

const TokenList = () => {
  const { t } = useTranslation('trending');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get(EXPLORE_SEARCH_QUERY_KEY)?.trim() ?? '';
  const typeFromUrl = searchParams.get(EXPLORE_SEARCH_TYPE_KEY);
  const searchCategory: SearchCategory = SEARCH_TABS.find((tab) => tab === typeFromUrl) ?? 'all';
  const collectionParam = searchParams.get('collection');
  const collectionFromUrl = collectionParam?.toLowerCase() === 'all'
    ? 'all' : collectionParam?.toUpperCase();
  const {
    orderBy, orderByMapped, finalOrderDirection, updateOrderBy, handleSort,
  } = useTokenSort(SORT.trendingScore);
  const searchSort = useTokenSort(SORT.marketCap);
  // Search starts across every collection: the browse list's language
  // default would hide matches from the other collections.
  const [searchCollection, setSearchCollection] = useState('all');
  const activeFactoryCollections = useEnsureFactorySchemaLoaded();
  const [activeTab, setActiveTab] = useState<SearchTab>('tokens');
  // Content-language filter shared with home; only applies to the Posts tab.
  const {
    filter: languageFilter,
    setFilter: setLanguageFilter,
    languageParam,
    uiLanguage,
  } = usePostLanguageFilter();
  const previousUiLanguage = useRef(uiLanguage);
  const uiLanguageChanged = previousUiLanguage.current !== uiLanguage;
  // Explicit links/manual choices win until the next global language change.
  // Derive the new collection immediately, before clearing the old URL override.
  const collection = uiLanguageChanged
    ? LANGUAGE_COLLECTIONS[uiLanguage]
    : collectionFromUrl || LANGUAGE_COLLECTIONS[uiLanguage];
  const setCollection = useCallback((value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('collection', value);
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (previousUiLanguage.current === uiLanguage) return;
    previousUiLanguage.current = uiLanguage;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('collection');
      return next;
    }, { replace: true });
  }, [uiLanguage, setSearchParams]);
  const [searchInput, setSearchInput] = useState(qFromUrl);
  const [searchTerm, setSearchTerm] = useState(qFromUrl);

  // A history entry per category, so Back returns from a category to all results.
  const setSearchCategory = useCallback((category: SearchCategory) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (category === 'all') next.delete(EXPLORE_SEARCH_TYPE_KEY);
      else next.set(EXPLORE_SEARCH_TYPE_KEY, category);
      return next;
    });
  }, [setSearchParams]);

  const tabLabels = useMemo((): Record<SearchCategory, string> => ({
    all: t('tokenList.tabAll'),
    tokens: t('tokenList.tabTokens'),
    users: t('tokenList.tabUsers'),
    posts: t('tokenList.tabPosts'),
  }), [t]);

  const orderByOptions = useMemo((): SelectOptions<OrderByOption> => [
    { title: t('tokenList.sortMarketCap'), value: SORT.marketCap },
    { title: t('tokenList.sortTrending'), value: SORT.trendingScore },
    { title: t('tokenList.sortPrice'), value: SORT.price },
    { title: t('tokenList.sortName'), value: SORT.name },
    { title: t('tokenList.sortNewest'), value: SORT.newest },
    { title: t('tokenList.sortOldest'), value: SORT.oldest },
    { title: t('tokenList.sortHoldersCount'), value: SORT.holdersCount },
  ], [t]);

  const collectionOptions = useMemo((): SelectOptions<string> => [
    { title: t('tokenList.collectionAll'), value: 'all' },
    ...activeFactoryCollections.map((c: any) => ({ title: collectionLabel(c.name), value: c.name })),
  ], [t, activeFactoryCollections]);

  const getFallbackSubtitle = useCallback((tab: SearchTab) => {
    if (tab === 'tokens') return t('tokenList.fallbackTokens');
    if (tab === 'users') return t('tokenList.fallbackUsers');
    return t('tokenList.fallbackPosts');
  }, [t]);

  /** Sync input and search term with `?q=`, including when `q` is dropped from the URL. */
  useEffect(() => {
    setSearchInput(qFromUrl);
    setSearchTerm(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const hasSearch = searchTerm.length > 0;
  const focusedTab = hasSearch && searchCategory !== 'all' ? searchCategory : undefined;

  useEffect(() => {
    if (hasSearch || searchCategory === 'all') return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(EXPLORE_SEARCH_TYPE_KEY);
      return next;
    }, { replace: true });
  }, [hasSearch, searchCategory, setSearchParams]);

  const handleOpenPost = useCallback(
    (slugOrId: string) => navigate(`/post/${encodeURIComponent(slugOrId)}`),
    [navigate],
  );

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
      collection,
      limit: 20,
      page: pageParam,
    }),
    getNextPageParam: (lastPage: any, _allPages, lastPageParam) => {
      const totalPages = lastPage?.meta?.totalPages ?? 0;
      const currentPage = lastPage?.meta?.currentPage ?? lastPageParam;
      return totalPages > 0 && currentPage < totalPages ? lastPageParam + 1 : undefined;
    },
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

  const tokensSentinelRef = useLoadMoreSentinel(
    fetchNextPage,
    !hasSearch && activeTab === 'tokens' && hasNextPage && !isFetchingTokens,
  );

  const usersTabQuery = useQuery({
    enabled: !hasSearch && activeTab === 'users',
    queryKey: ['trends', 'top-traders', DEFAULT_TAB_LIMIT],
    queryFn: () => fetchTopTraders(DEFAULT_TAB_LIMIT),
    staleTime: 60 * 1000,
  });

  const postsTabQuery = useQuery({
    enabled: !hasSearch && activeTab === 'posts',
    queryKey: ['trends', 'popular-posts', DEFAULT_TAB_LIMIT, languageParam],
    queryFn: () => fetchPopularPosts(DEFAULT_TAB_LIMIT, languageParam),
    staleTime: 60 * 1000,
  });

  const searchPreviewQuery = useQuery({
    enabled: hasSearch,
    queryKey: ['trends', 'search-preview', searchTerm],
    queryFn: () => fetchTrendSearchPreview(searchTerm),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const tokenSearchOptions: TokenSearchOptions = {
    orderBy: searchSort.orderByMapped,
    orderDirection: searchSort.finalOrderDirection,
    collection: searchCollection,
  };

  const focusedSearchQuery = useInfiniteQuery({
    enabled: Boolean(focusedTab),
    initialPageParam: 1,
    queryKey: [
      'trends',
      'search-section',
      focusedTab,
      searchTerm,
      focusedTab === 'tokens' ? tokenSearchOptions : null,
    ],
    queryFn: ({ pageParam }) => fetchTrendSearchSection(
      focusedTab as SearchTab,
      searchTerm,
      pageParam,
      tokenSearchOptions,
    ),
    getNextPageParam: (lastPage, _allPages, lastPageParam) => (
      lastPage.items.length && lastPageParam < lastPage.meta.totalPages
        ? lastPageParam + 1
        : undefined
    ),
    staleTime: 30 * 1000,
  });

  const focusedSentinelRef = useLoadMoreSentinel(
    focusedSearchQuery.fetchNextPage,
    focusedSearchQuery.hasNextPage && !focusedSearchQuery.isFetching,
  );

  const focusedItems = useMemo(() => {
    // Results can shift between pages while the user scrolls (new posts,
    // moving market caps), so a later page may repeat an item already shown.
    const seen = new Set<string>();
    return (focusedSearchQuery.data?.pages ?? [])
      .flatMap((page): Array<TrendTokenItem | TrendUserItem | TrendPostItem> => page.items)
      .filter((item) => {
        const key = focusedTab === 'posts'
          ? (item as TrendPostItem).id
          : (item as TrendTokenItem | TrendUserItem).address;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [focusedSearchQuery.data, focusedTab]);

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
      return [activeTab, ...SEARCH_TABS.filter((tab) => tab !== activeTab)];
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
        (token) => (token as any).address?.toLowerCase() === searchTerm.toLowerCase(),
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

  function selectTab(tab: SearchCategory) {
    if (hasSearch) setSearchCategory(tab);
    else if (tab !== 'all') setActiveTab(tab);
  }

  function openSearchCategory(tab: SearchTab) {
    setSearchCategory(tab);
    // "View all" can sit far down the page; start the full list from its top.
    window.scrollTo({ top: 0 });
  }

  function openFullTopic(tab: SearchTab) {
    setActiveTab(tab);
    setSearchInput('');
    setSearchTerm('');
  }

  function getSearchSectionState<TItem>(
    preview: SearchSection<TItem> | undefined,
    fallback: SearchSection<any> | undefined,
  ) {
    if (preview?.items.length) {
      return {
        items: preview.items,
        totalItems: preview.meta.totalItems,
        hasResults: true,
        usesFallback: false,
        canExpand: preview.meta.totalItems > SEARCH_PREVIEW_LIMIT,
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

  const searchStates = {
    tokens: getSearchSectionState(searchPreviewQuery.data?.tokens, fallbackTokensQuery.data),
    users: getSearchSectionState(searchPreviewQuery.data?.users, fallbackUsersQuery.data),
    posts: getSearchSectionState(searchPreviewQuery.data?.posts, fallbackPostsQuery.data),
  };

  function renderSearchResults(tab: SearchTab, items: unknown[]) {
    if (tab === 'tokens') return <TokenResultsList items={items as TrendTokenItem[]} />;
    if (tab === 'users') {
      return <UserResultsList items={items as Array<TrendUserItem | LeaderboardItem>} />;
    }
    return <PostResultsList items={items as TrendPostItem[]} onOpenPost={handleOpenPost} />;
  }

  function renderFocusedResults(tab: SearchTab) {
    if (!focusedSearchQuery.data && focusedSearchQuery.isError) {
      return <div className="py-6 text-sm text-white/60">{t('tokenList.searchError')}</div>;
    }
    if (focusedSearchQuery.isLoading) {
      return <InlineLoading label={t('tokenList.searchingTrends')} />;
    }
    if (!focusedItems.length) {
      return (
        <div className="py-6 text-sm text-white/60">
          {t('tokenList.noCategoryResults', { query: searchTerm })}
        </div>
      );
    }
    if (tab === 'tokens') {
      return (
        <TokenResultsList
          items={focusedItems as TrendTokenItem[]}
          orderBy={searchSort.orderBy}
          orderDirection={searchSort.finalOrderDirection}
          onSort={searchSort.handleSort}
        />
      );
    }
    return renderSearchResults(tab, focusedItems);
  }

  const focusedTotal = focusedSearchQuery.data?.pages[0]?.meta.totalItems;

  function getTabCount(tab: SearchCategory) {
    if (!hasSearch || tab === 'all') return undefined;
    // The open category's own total reflects its sort and collection filter.
    if (tab === focusedTab && focusedTotal !== undefined) return focusedTotal;
    return searchPreviewQuery.data?.[tab].meta.totalItems;
  }

  // The focused view handles its own loading and errors so its filters stay put.
  const showSearchLoading = hasSearch && !focusedTab && searchPreviewQuery.isLoading;
  const searchError = hasSearch && !focusedTab && searchPreviewQuery.isError
    ? t('tokenList.searchError')
    : null;

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4">
      <Head
        title={t('tokenList.pageTitle')}
        description={t('tokenList.pageDescription')}
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
                  aria-label={t('tokenList.inputAria')}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t('tokenList.searchPlaceholder')}
                  className="h-12 rounded-2xl border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white placeholder:text-white/45 focus-visible:ring-[#1161FE]"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 border-b border-white/10 w-full overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {(hasSearch ? SEARCH_CATEGORIES : SEARCH_TABS).map((tab) => {
                const isActive = (hasSearch ? searchCategory : activeTab) === tab;
                const count = getTabCount(tab);

                return (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectTab(tab)}
                    className={`normal-case tracking-normal relative pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1161FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm ${
                      isActive ? 'text-white' : 'text-white/55 hover:text-white/80'
                    }`}
                  >
                    {tabLabels[tab]}
                    {count !== undefined ? (
                      <>
                        {' '}
                        <span className="font-normal text-white/40">{count}</span>
                      </>
                    ) : null}
                    {isActive ? (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1161FE]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {searchError ? <EmptyPanel message={searchError} /> : null}

          {showSearchLoading ? <InlineLoading label={t('tokenList.searchingTrends')} /> : null}

          {hasSearch && !focusedTab && !showSearchLoading && !searchError ? (
            <div className="flex flex-col gap-4">
              {searchOrder.map((tab) => {
                const state = searchStates[tab];

                if (!state.items.length) {
                  return null;
                }

                const subtitle = state.hasResults
                  ? t('tokenList.resultsCount', { count: state.totalItems })
                  : getFallbackSubtitle(tab);

                return (
                  <SearchSectionShell
                    key={tab}
                    title={tabLabels[tab]}
                    subtitle={subtitle}
                    contentClassName={tab === 'posts' ? 'divide-y-0' : undefined}
                    footer={state.canExpand || state.usesFallback ? (
                      <button
                        type="button"
                        onClick={() => (state.usesFallback
                          ? openFullTopic(tab)
                          : openSearchCategory(tab))}
                        className="text-sm font-medium text-[#8bc9ff] hover:text-white transition-colors"
                      >
                        {t('tokenList.viewAll')}
                      </button>
                    ) : null}
                  >
                    {renderSearchResults(tab, state.items)}
                  </SearchSectionShell>
                );
              })}
            </div>
          ) : null}

          {focusedTab ? (
            <SearchSectionShell
              title={tabLabels[focusedTab]}
              subtitle={focusedTotal !== undefined
                ? t('tokenList.resultsCount', { count: focusedTotal })
                : undefined}
              actions={focusedTab === 'tokens' ? (
                <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                  <TokenListControls
                    orderBy={searchSort.orderBy}
                    orderByOptions={orderByOptions}
                    onOrderByChange={searchSort.updateOrderBy}
                    collection={searchCollection}
                    collectionOptions={collectionOptions}
                    onCollectionChange={setSearchCollection}
                  />
                </div>
              ) : undefined}
              contentClassName={focusedTab === 'posts' ? 'divide-y-0' : undefined}
              footer={focusedSearchQuery.hasNextPage ? (
                <div className="text-center">
                  <LoadMoreButton
                    sentinelRef={focusedSentinelRef}
                    loading={focusedSearchQuery.isFetchingNextPage}
                    onClick={() => focusedSearchQuery.fetchNextPage()}
                  />
                </div>
              ) : null}
            >
              {renderFocusedResults(focusedTab)}
            </SearchSectionShell>
          ) : null}

          {!hasSearch && activeTab === 'tokens' ? (
            <>
              <div className="mb-6">
                <LatestTransactionsCarousel />
              </div>

              <div className="mb-6 w-full">
                <div className="flex w-full flex-wrap items-center gap-3 sm:gap-4">
                  <div className="w-full text-xl font-bold text-white sm:w-auto sm:text-2xl">
                    {t('tokenList.tokenizedTrends')}
                  </div>
                  <TokenListControls
                    orderBy={orderBy}
                    orderByOptions={orderByOptions}
                    onOrderByChange={updateOrderBy}
                    collection={collection}
                    collectionOptions={collectionOptions}
                    onCollectionChange={setCollection}
                  />
                  <Link
                    to="/trends/create"
                    className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-none bg-[#1161FE] px-4 py-2 text-sm font-semibold text-white no-underline shadow-[0_8px_25px_rgba(17,97,254,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0d4fd8] active:translate-y-0 sm:ml-auto"
                  >
                    {t('tokenList.tokenizeTrend')}
                  </Link>
                </div>
              </div>

              {(!tokenPages?.pages?.length || !tokenPages.pages[0].items.length)
              && !isFetchingTokens ? (
                <EmptyPanel message={t('tokenList.noTokenSales')} />
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
                  <LoadMoreButton
                    sentinelRef={tokensSentinelRef}
                    loading={isFetchingTokens}
                    onClick={() => fetchNextPage()}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {!hasSearch && activeTab === 'users' ? (
            <SearchSectionShell
              title={t('tokenList.topTradersTitle')}
              subtitle={t('tokenList.topTradersSubtitle')}
            >
              {usersTabQuery.isLoading ? <InlineLoading label={t('tokenList.loading')} /> : null}
              {!usersTabQuery.isLoading && usersTabQuery.data?.items.length ? (
                <UserResultsList items={usersTabQuery.data.items} />
              ) : null}
              {!usersTabQuery.isLoading && !usersTabQuery.data?.items.length ? (
                <div className="py-6 text-sm text-white/60">{t('tokenList.noLeaderboard')}</div>
              ) : null}
            </SearchSectionShell>
          ) : null}

          {!hasSearch && activeTab === 'posts' ? (
            <>
              <div className="mb-4 flex justify-end">
                <PostLanguageFilterControl
                  value={languageFilter}
                  onChange={setLanguageFilter}
                  className="w-auto"
                />
              </div>
              <SearchSectionShell
                title={t('tokenList.popularPostsTitle')}
                subtitle={t('tokenList.popularPostsSubtitle')}
              >
                {postsTabQuery.isLoading ? <InlineLoading label={t('tokenList.loading')} /> : null}
                {!postsTabQuery.isLoading && postsTabQuery.data?.items.length ? (
                  <PostResultsList
                    items={postsTabQuery.data.items}
                    onOpenPost={handleOpenPost}
                  />
                ) : null}
                {postsTabQuery.isError && (languageParam ? (
                  <PostLanguageErrorState
                    language={languageParam}
                    onRetry={() => postsTabQuery.refetch()}
                    onShowAll={() => setLanguageFilter('all')}
                  />
                ) : <EmptyState type="error" onRetry={() => postsTabQuery.refetch()} />)}
                {postsTabQuery.isSuccess && !postsTabQuery.data?.items.length && languageParam ? (
                  <PostLanguageEmptyState
                    language={languageParam}
                    onShowAll={() => setLanguageFilter('all')}
                  />
                ) : null}
                {postsTabQuery.isSuccess && !postsTabQuery.data?.items.length && !languageParam ? (
                  <div className="py-6 text-sm text-white/60">{t('tokenList.noPopularPosts')}</div>
                ) : null}
              </SearchSectionShell>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TokenList;
