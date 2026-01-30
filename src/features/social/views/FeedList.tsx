import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { PostDto } from "../../../api/generated";
import WebSocketClient from "../../../libs/WebSocketClient";
import AeButton from "../../../components/AeButton";
import HeroBannerCarousel from "../../../components/hero-banner/HeroBannerCarousel";
import Shell from "../../../components/layout/Shell";
import RightRail from "../../../components/layout/RightRail";
import { useWallet } from "../../../hooks";
import CreatePost, { CreatePostRef } from "../components/CreatePost";
import SortControls from "../components/SortControls";
import EmptyState from "../components/EmptyState";
import PostSkeleton from "../components/PostSkeleton";
import ReplyToFeedItem from "../components/ReplyToFeedItem";
import TokenCreatedActivityItem from "../components/TokenCreatedActivityItem";
import TradeActivityItem, { TradeActivityItemData } from "../components/TradeActivityItem";
import TrendingAssetsFeedItem from "../components/TrendingAssetsFeedItem";
import { PostApiResponse } from "../types";
import Head from "../../../seo/Head";
import { CONFIG } from "../../../config";
import { useChainLatestTransactions } from "@/chains/hooks/useChainLatestTransactions";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useChainAdapter } from "@/chains/useChainAdapter";
import type { TokenDto } from "../../../api/generated/models/TokenDto";

// Custom hook
function useUrlQuery() {
  return new URLSearchParams(useLocation().search);
}

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 0x100000000;
    return value / 0x100000000;
  };
}

export default function FeedList({
  standalone = true,
}: { standalone?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlQuery = useUrlQuery();
  const { chainNames } = useWallet();
  const { selectedChain } = useActiveChain();
  const chainAdapter = useChainAdapter();
  const queryClient = useQueryClient();
  const ACTIVITY_PAGE_SIZE = 50;
  const createPostRef = useRef<CreatePostRef>(null);
  // Use ref to track current sortBy to avoid stale closure in callbacks
  // Initialize with default value since sortBy isn't defined yet
  const sortByRef = useRef<string>("hot");
  const { latestTransactions } = useChainLatestTransactions();
  
  // Only render homepage SEO meta when actually on the homepage
  const isHomepage = location.pathname === "/";

  // Check if banner is dismissed (same logic as HeroBannerCarousel)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  useEffect(() => {
    const DISMISS_KEY = "hero_banner_dismissed_until";
    const checkBannerDismissed = () => {
      try {
        const until = localStorage.getItem(DISMISS_KEY);
        if (!until) {
          setIsBannerDismissed(false);
          return;
        }
        const ts = Date.parse(until);
        setIsBannerDismissed(!Number.isNaN(ts) && ts > Date.now());
      } catch {
        setIsBannerDismissed(false);
      }
    };

    // Check on mount
    checkBannerDismissed();

    // Listen for custom event when banner is dismissed
    const handleBannerDismissed = () => {
      checkBannerDismissed();
    };
    window.addEventListener("heroBannerDismissed", handleBannerDismissed);

    // Also listen for storage changes (for cross-tab scenarios)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DISMISS_KEY) {
        checkBannerDismissed();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("heroBannerDismissed", handleBannerDismissed);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Comment counts are now provided directly by the API in post.total_comments

  // Check if popular feed is enabled
  const popularFeedEnabled = CONFIG.POPULAR_FEED_ENABLED ?? true;

  // URL parameters
  const urlSortBy = urlQuery.get("sortBy");
  // Force "latest" if popular feed is disabled, otherwise use URL param or default to "hot"
  const sortBy = !popularFeedEnabled ? "latest" : (urlSortBy || "hot");
  const search = urlQuery.get("search") || "";
  const filterBy = urlQuery.get("filterBy") || "all";
  const initialWindow = (urlQuery.get("window") as '24h'|'7d'|'all' | null) || '24h';
  const shouldAutoFocusPost = urlQuery.get("post") === "new";

  // Keep sortByRef in sync with sortBy to avoid stale closures in callbacks
  useEffect(() => {
    sortByRef.current = sortBy;
  }, [sortBy]);

  const [localSearch, setLocalSearch] = useState(search);
  const [popularWindow, setPopularWindow] = useState<'24h'|'7d'|'all'>(initialWindow);
  const trendingInsertSeed = useRef<number>(Math.floor(Math.random() * 0x100000000));

  useEffect(() => {
    // Clear all feed caches when switching chains to avoid mixed posts.
    queryClient.removeQueries({ queryKey: ["posts"], exact: false });
    queryClient.removeQueries({ queryKey: ["home-activities"], exact: false });
    queryClient.removeQueries({ queryKey: ["popular-posts"], exact: false });
    queryClient.removeQueries({ queryKey: ["latest-posts-for-hot"], exact: false });
  }, [selectedChain, queryClient]);

  // Keep popularWindow in sync with URL (e.g., browser back/forward or direct URL edits)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get("window") as '24h'|'7d'|'all' | null) || '24h';
    if (fromUrl !== popularWindow) {
      setPopularWindow(fromUrl);
      if (sortBy === 'hot') {
        // Reset cached pages to avoid mixing windows
        queryClient.removeQueries({ queryKey: ["popular-posts", selectedChain], exact: false });
      }
    }
  }, [location.search, sortBy, queryClient, popularWindow, selectedChain]);

  // Helper to map a token object or websocket payload into a Post-like item
  const mapTokenCreatedToPost = useCallback((payload: any): PostDto => {
    const saleAddress: string = payload?.sale_address || payload?.address || "";
    const name: string = payload?.token_name || payload?.name || "Unknown";
    const createdAt: string = payload?.created_at || new Date().toISOString();
    const creatorAddress: string = payload?.creator_address || payload?.creatorAddress || payload?.creator || "";
    const encodedName = encodeURIComponent(name);
    const id = `token-created:${encodedName}:${saleAddress}:${createdAt}_v3`;
    const content = "";
    return {
      id,
      tx_hash: payload?.tx_hash || "",
      tx_args: [
        { token_name: name },
        { sale_address: saleAddress },
        { kind: "token-created" },
      ],
      sender_address: creatorAddress || saleAddress || "",
      contract_address: saleAddress || "",
      type: "TOKEN_CREATED",
      content,
      topics: [
        "token:created",
        `token_name:${name}`,
        `#${name}`,
        saleAddress ? `token_sale:${saleAddress}` : "",
      ].filter(Boolean) as string[],
      media: [],
      total_comments: 0,
      created_at: createdAt,
    } as PostDto;
  }, []);

  type TradeFeedItem = TradeActivityItemData & {
    kind: "trade";
    account: string;
    token: TokenDto | null;
  };

  type FeedItem = PostDto | TradeFeedItem;

  const isTradeItem = (item: FeedItem): item is TradeFeedItem =>
    Boolean((item as TradeFeedItem)?.kind === "trade");

  // Activities (token-created) fetched in parallel with smaller initial batch + pagination
  const {
    data: activitiesPages,
    isLoading: activitiesLoading,
    fetchNextPage: fetchNextActivities,
    hasNextPage: hasMoreActivities,
    isFetchingNextPage: fetchingMoreActivities,
    refetch: refetchActivities,
  } = useInfiniteQuery<PostDto[], Error>({
    queryKey: ["home-activities", selectedChain],
    enabled: sortBy !== "hot",
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const resp = await chainAdapter.listTokens({
        orderBy: "created_at",
        orderDirection: "DESC",
        limit: ACTIVITY_PAGE_SIZE,
        page: pageParam as number,
      }).catch(() => ({ items: [] }));
      const items: any[] = resp?.items || [];
      return items
        .map((t) => ({
          sale_address: t?.sale_address || t?.address || "",
          token_name: t?.name || "Unknown",
          created_at: t?.created_at || new Date().toISOString(),
          creator_address:
            t?.creator_address ||
            t?.creatorAddress ||
            (t?.creator && (t?.creator.address || t?.creator)) ||
            t?.owner_address ||
            "",
        }))
        .map(mapTokenCreatedToPost);
    },
    getNextPageParam: (lastPage, pages) => (lastPage && lastPage.length === ACTIVITY_PAGE_SIZE ? pages.length + 1 : undefined),
    // Show cached data immediately, refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchOnMount: false, // Don't block on refetch - show cached data immediately
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
  const activityList: PostDto[] = useMemo(() => {
    const allItems = activitiesPages?.pages 
      ? (activitiesPages.pages as PostDto[][]).flatMap((p) => p) 
      : [];
    // Deduplicate within activities list (in case backend returns duplicates across pages)
    const seenIds = new Set<string>();
    return allItems.filter((item: PostDto) => {
      const id = String(item?.id || '');
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
  }, [activitiesPages]);

  const tradeList = useMemo<TradeFeedItem[]>(() => {
    const seenIds = new Set<string>();
    return (latestTransactions || [])
      .filter((tx) => String(tx?.tx_type || "").toLowerCase() === "buy")
      .map((tx) => {
        const fallbackId = `${tx?.created_at || ""}:${tx?.account || tx?.address || ""}:${tx?.volume || ""}`;
        const id = `trade:${tx?.tx_hash || tx?.id || fallbackId}`;
        return {
          kind: "trade" as const,
          id,
          created_at: tx?.created_at || new Date().toISOString(),
          tx_hash: tx?.tx_hash || "",
          tx_type: tx?.tx_type || "buy",
          account: tx?.account || tx?.address || "",
          volume: tx?.volume || "0",
          priceUsd: (tx as any)?.buy_price?.usd ?? (tx as any)?.price_data?.usd ?? (tx as any)?.price ?? "",
          token: (tx as any)?.token || null,
        };
      })
      .filter((item) => {
        if (!item.id || seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
  }, [latestTransactions]);

  // Live updates for token-created via websocket
  useEffect(() => {
    if (sortBy === "hot") return;
    if (selectedChain !== 'aeternity') return;
    const unsubscribe = WebSocketClient.subscribeToNewTokenSales((payload: any) => {
      const mapped = mapTokenCreatedToPost(payload);
      queryClient.setQueryData(["home-activities", selectedChain], (prev: any) => {
        // prev is infinite data shape { pages: PostDto[][], pageParams: any[] }
        if (!prev || !prev.pages) {
          return { pages: [[mapped]], pageParams: [1] };
        }
        const first: PostDto[] = prev.pages[0] || [];
        if (first.some((p) => p?.id === mapped.id)) return prev;
        const newFirst = [mapped, ...first].slice(0, ACTIVITY_PAGE_SIZE);
        return { ...prev, pages: [newFirst, ...prev.pages.slice(1)] };
      });
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [mapTokenCreatedToPost, queryClient, sortBy, selectedChain]);

  // Infinite query for posts
  // For non-hot: single list of latest posts
  const {
    data: latestData,
    isLoading: latestLoading,
    error: latestError,
    fetchNextPage: fetchNextLatest,
    hasNextPage: hasMoreLatest,
    isFetchingNextPage: fetchingMoreLatest,
    refetch: refetchLatest,
  } = useInfiniteQuery({
    enabled: sortBy !== "hot",
    queryKey: ["posts", selectedChain, { limit: 10, sortBy, search: localSearch, filterBy }],
    queryFn: ({ pageParam = 1 }) =>
      chainAdapter.listPosts({
        limit: 10,
        page: pageParam,
        orderBy: "created_at",
        orderDirection: "DESC",
        search: localSearch,
      }) as unknown as Promise<PostApiResponse>,
    getNextPageParam: (lastPage) => {
      if (
        lastPage?.meta?.currentPage &&
        lastPage?.meta?.totalPages &&
        lastPage.meta.currentPage < lastPage.meta.totalPages
      ) {
        return lastPage.meta.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    // Show cached data immediately, refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchOnMount: false, // Don't block on refetch - show cached data immediately
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Prefetch activities (token-created) and posts when component mounts or when switching to latest
  const prevSortByForPrefetch = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Only prefetch when switching TO "latest" from another feed or on initial mount
    const shouldPrefetch = sortBy !== "hot" && (
      prevSortByForPrefetch.current === "hot" || 
      prevSortByForPrefetch.current === undefined
    );
    
    if (shouldPrefetch) {
      // Prefetch activities (token-created) in the background for faster loading
      queryClient.prefetchInfiniteQuery({
        queryKey: ["home-activities", selectedChain],
        queryFn: async ({ pageParam = 1 }) => {
          const resp = await chainAdapter.listTokens({
            orderBy: "created_at",
            orderDirection: "DESC",
            limit: ACTIVITY_PAGE_SIZE,
            page: pageParam as number,
          }).catch(() => ({ items: [] }));
          const items: any[] = resp?.items || [];
          return items
            .map((t) => ({
              sale_address: t?.sale_address || t?.address || "",
              token_name: t?.name || "Unknown",
              created_at: t?.created_at || new Date().toISOString(),
              creator_address:
                t?.creator_address ||
                t?.creatorAddress ||
                (t?.creator && (t?.creator.address || t?.creator)) ||
                t?.owner_address ||
                "",
            }))
            .map(mapTokenCreatedToPost);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, pages) => (lastPage && lastPage.length === ACTIVITY_PAGE_SIZE ? pages.length + 1 : undefined),
      });

      // Prefetch posts in the background for faster loading (only first page, no search/filter)
      queryClient.prefetchInfiniteQuery({
        queryKey: ["posts", selectedChain, { limit: 10, sortBy: "latest", search: "", filterBy: "all" }],
        queryFn: ({ pageParam = 1 }) =>
          chainAdapter.listPosts({
            limit: 10,
            page: pageParam,
            orderBy: "created_at",
            orderDirection: "DESC",
            search: "",
          }) as unknown as Promise<PostApiResponse>,
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
          if (
            lastPage?.meta?.currentPage &&
            lastPage?.meta?.totalPages &&
            lastPage.meta.currentPage < lastPage.meta.totalPages
          ) {
            return lastPage.meta.currentPage + 1;
          }
          return undefined;
        },
      });
    }
    
    prevSortByForPrefetch.current = sortBy;
  }, [sortBy, queryClient, mapTokenCreatedToPost, ACTIVITY_PAGE_SIZE, selectedChain, chainAdapter]);

  // Refetch in background when switching to latest (non-blocking)
  // This updates the feed with new items without blocking the UI
  const prevSortByRef = useRef(sortBy);
  useEffect(() => {
    // Only refetch when switching TO "latest" from another feed
    if (sortBy === "latest" && prevSortByRef.current !== "latest") {
      // Refetch in background (non-blocking) to get newest posts and activities
      // Cached data is shown immediately, new items will be added when refetch completes
      refetchLatest();
      refetchActivities();
    }
    prevSortByRef.current = sortBy;
  }, [sortBy, refetchLatest, refetchActivities]);

  // For hot: fetch popular posts first, then latest posts (filtering out popular ones)
  const {
    data: popularData,
    isLoading: popularLoading,
    error: popularError,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasMorePopular,
    isFetchingNextPage: fetchingMorePopular,
    refetch: refetchPopular,
  } = useInfiniteQuery({
    enabled: sortBy === "hot",
    queryKey: ["popular-posts", selectedChain, { limit: 10, window: popularWindow }],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await chainAdapter.listPopularPosts({
        window: popularWindow,
        page: pageParam as number,
        limit: 10,
      });
      return response as PostApiResponse;
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      // Continue pagination if we have totalPages and haven't reached it yet
      const meta = lastPage?.meta;
      const items = lastPage?.items || [];
      
      // Stop if we got an empty page AND we've already fetched at least one page
      // (This handles the case where backend returns wrong totalPages but we've exhausted actual posts)
      if (items.length === 0 && allPages.length > 0) {
        return undefined;
      }
      
      // Stop if totalItems is set and we've fetched all items
      // This handles the case where backend returns wrong totalPages
      if (meta?.totalItems && meta?.itemCount) {
        // Calculate total items fetched across all pages
        const totalFetched = allPages.reduce((sum, page) => {
          return sum + (page?.items?.length || 0);
        }, 0);
        
        // If we've fetched all items (or more), stop
        if (totalFetched >= meta.totalItems) {
          return undefined;
        }
      }
      
      const hasMore = meta?.currentPage && meta?.totalPages && meta.currentPage < meta.totalPages;
      const nextPage = hasMore ? meta.currentPage + 1 : undefined;
      
      return nextPage;
    },
    initialPageParam: 1,
    // Show cached data immediately, refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchOnMount: false, // Don't block on refetch - show cached data immediately
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Track popular post IDs to filter them out from latest posts
  const popularPostIds = useMemo(() => {
    if (!popularData?.pages) return new Set<string>();
    const ids = new Set<string>();
    popularData.pages.forEach((page: any) => {
      if (page?.items) {
        page.items.forEach((item: any) => {
          if (item?.id) ids.add(String(item.id));
        });
      }
    });
    return ids;
  }, [popularData]);

  // Check if popular posts are exhausted (no more pages and we have data)
  const popularExhausted = useMemo(() => {
    if (!popularData?.pages || popularData.pages.length === 0) return false;
    const lastPage = popularData.pages[popularData.pages.length - 1];
    const meta = lastPage?.meta;
    const lastPageItems = lastPage?.items || [];
    
    // Calculate total items fetched across all pages
    const totalFetched = popularData.pages.reduce((sum: number, page: any) => {
      return sum + (page?.items?.length || 0);
    }, 0);
    
    // Popular posts are exhausted if:
    // 1. The last page returned 0 items (backend indicates no more popular posts), OR
    // 2. The last page returned fewer items than requested (indicates no more popular posts available), OR
    // 3. We've reached the last page according to meta (if totalPages seems reasonable < 100), OR
    // 4. We've fetched all items according to totalItems (only if totalItems seems reasonable < 1000)
    const lastPageEmpty = lastPageItems.length === 0 && popularData.pages.length > 0;
    // If we requested 10 items but got fewer, we've exhausted popular posts
    const lastPageIncomplete = lastPageItems.length > 0 && lastPageItems.length < 10 && popularData.pages.length > 0;
    // Only trust totalPages if it seems reasonable (popular posts shouldn't be thousands)
    const reasonableTotalPages = meta?.totalPages && meta.totalPages < 100;
    const reachedLastPage = reasonableTotalPages && meta?.currentPage && meta.currentPage >= meta.totalPages;
    // Only trust totalItems if it seems reasonable (popular posts shouldn't be thousands)
    const reasonableTotalItems = meta?.totalItems && meta.totalItems < 1000;
    const fetchedAllItems = reasonableTotalItems && totalFetched >= meta.totalItems;
    
    const result = lastPageEmpty || lastPageIncomplete || reachedLastPage || fetchedAllItems;
    
    return result;
  }, [popularData]);

  // Fetch latest posts if:
  // 1. Popular posts are exhausted, OR
  // 2. We have less than 10 popular posts (to fill up to at least 10 posts on initial load)
  // Include popularPostIds in queryKey to ensure fresh filtering when popular posts change
  // Note: We allow queryEnabled even if popularPostIds is empty (e.g., if popular feed returned 0 posts)
  // The filtering will just be a no-op in that case
  // Note: We'll compute hasEnoughPopularPosts after popularList is defined, but for now use a temporary check
  const queryEnabled = sortBy === "hot" && popularExhausted;
  
  const {
    data: latestDataForHot,
    fetchNextPage: fetchNextLatestForHot,
    hasNextPage: hasMoreLatestForHot,
    isFetchingNextPage: fetchingMoreLatestForHot,
  } = useInfiniteQuery({
    enabled: sortBy === "hot" && (popularExhausted || (popularData?.pages ? ((popularData.pages as any[]) || []).flatMap((page: any) => page?.items ?? []).length < 10 : false)),
    queryKey: ["latest-posts-for-hot", selectedChain, { limit: 10, window: popularWindow, excludeIds: Array.from(popularPostIds).sort().join(',') }],
    queryFn: async ({ pageParam = 1 }) => {
      // Get fresh popularPostIds from the current popularData
      const currentPopularIds = new Set<string>();
      if (popularData?.pages) {
        popularData.pages.forEach((page: any) => {
          if (page?.items) {
            page.items.forEach((item: any) => {
              if (item?.id) currentPopularIds.add(String(item.id));
            });
          }
        });
      }
      
      const response = await chainAdapter.listPosts({
        limit: 10,
        page: pageParam,
        orderBy: "created_at",
        orderDirection: "DESC",
        search: "",
      }) as unknown as PostApiResponse;
      
      // Filter out popular posts on the frontend using current popularPostIds
      const filteredItems = response.items.filter((item: any) => !currentPopularIds.has(String(item.id)));
      
      return {
        ...response,
        items: filteredItems,
      } as PostApiResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      const lastPageItems = lastPage?.items || [];
      const meta = lastPage?.meta;
      
      // Always continue fetching based on the original API pagination metadata
      // Don't stop just because filtered items are empty - we need to skip past popular posts
      const hasMore = meta?.currentPage && meta?.totalPages && meta.currentPage < meta.totalPages;
      
      const nextPage = hasMore ? meta.currentPage + 1 : undefined;
      
      return nextPage;
    },
    initialPageParam: 1,
  });

  // Derived state: posts list (deduplicated by ID)
  const list = useMemo(() => {
    const allItems = latestData?.pages
      ? ((latestData.pages as any[]) || []).flatMap((page: any) => page?.items ?? [])
      : [];
    // Deduplicate within the list itself (in case backend returns duplicates across pages)
    const seenIds = new Set<string>();
    return allItems.filter((item: any) => {
      const id = String(item?.id || '');
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
  }, [latestData]);

  const popularList = useMemo(
    () =>
      popularData?.pages
        ? ((popularData.pages as any[]) || []).flatMap((page: any) => page?.items ?? [])
        : [],
    [popularData]
  );

  // Check if we have enough popular posts (at least 10) to fill the initial view
  const hasEnoughPopularPosts = popularList.length >= 10;
  
  // Update queryEnabled to also enable if we don't have enough popular posts
  // This enables the query immediately if we have less than 10 popular posts
  const queryEnabledWithEnoughPosts = sortBy === "hot" && (popularExhausted || !hasEnoughPopularPosts);

  // Latest posts for hot feed (filtered to exclude popular ones)
  const latestListForHot = useMemo(() => {
    if (!latestDataForHot?.pages) return [];
    const allItems = ((latestDataForHot.pages as any[]) || []).flatMap((page: any) => page?.items ?? []);
    // Additional deduplication and filtering (in case backend returns popular posts)
    const seenIds = new Set<string>();
    const filtered = allItems.filter((item: any) => {
      const id = String(item?.id || '');
      if (!id || seenIds.has(id) || popularPostIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    
    return filtered;
  }, [latestDataForHot, popularPostIds, sortBy]);

  // Auto-fetch latest posts if we have less than 10 popular posts and haven't fetched yet
  useEffect(() => {
    const popularListLength = popularData?.pages ? ((popularData.pages as any[]) || []).flatMap((page: any) => page?.items ?? []).length : 0;
    // Check if latestDataForHot hasn't been fetched yet (undefined or empty pages array)
    // Use falsy check instead of === 0 because undefined !== 0
    const hasNotFetchedLatest = !latestDataForHot?.pages || latestDataForHot.pages.length === 0;
    if (sortBy === "hot" && queryEnabledWithEnoughPosts && popularListLength < 10 && hasNotFetchedLatest && !fetchingMoreLatestForHot && hasMoreLatestForHot) {
      fetchNextLatestForHot();
    }
  }, [sortBy, queryEnabledWithEnoughPosts, popularData, popularExhausted, latestDataForHot, fetchingMoreLatestForHot, hasMoreLatestForHot, fetchNextLatestForHot, hasEnoughPopularPosts]);


  // Track if we have data from both queries (cached or fresh)
  // This ensures posts and activities appear together, not incrementally
  // Show cached data immediately if available
  const bothQueriesReady = useMemo(() => {
    if (sortBy === "hot") {
      return true; // Hot feed doesn't need this check
    }
    
    // Check if we have data from queries (from cache or fresh)
    const hasPostsData = latestData && latestData.pages.length > 0;
    const hasActivitiesData = activitiesPages && activitiesPages.pages.length > 0;
    
    // Also check React Query cache directly for cached data (even if queries are disabled)
    const cachedPosts = queryClient.getQueryData(["posts", selectedChain, { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                       queryClient.getQueryData(["posts", selectedChain, { limit: 10, sortBy, search: localSearch, filterBy }]);
    const cachedActivities = queryClient.getQueryData(["home-activities", selectedChain]);
    
    const hasCachedPostsData = cachedPosts && (cachedPosts as any)?.pages?.length > 0;
    const hasCachedActivitiesData = cachedActivities && (cachedActivities as any)?.pages?.length > 0;
    
    // If we have data from queries OR cached data, show it
    if ((hasPostsData || hasCachedPostsData) && (hasActivitiesData || hasCachedActivitiesData)) {
      return true;
    }
    
    return false;
  }, [sortBy, latestData, activitiesPages, queryClient, localSearch, filterBy, selectedChain]);

  // Combine posts with token-created events and sort by created_at DESC
  const combinedList = useMemo<FeedItem[]>(() => {
    if (sortBy === "hot") {
      // For hot: popular posts first, then latest posts (filtered to exclude popular ones)
      const combined = [...popularList, ...latestListForHot];
      return combined;
    }
    
    // For latest feed: use cached data if queries don't have data yet
    // This ensures cached/prefetched data shows immediately
    let postsToUse = list;
    let activitiesToUse = activityList;
    let tradesToUse = tradeList;
    
    // If queries don't have data yet, try to get cached data
    if ((!latestData || latestData.pages.length === 0) && bothQueriesReady) {
      const cachedPosts = queryClient.getQueryData<any>(["posts", selectedChain, { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                         queryClient.getQueryData<any>(["posts", selectedChain, { limit: 10, sortBy, search: localSearch, filterBy }]);
      if (cachedPosts?.pages) {
        postsToUse = (cachedPosts.pages as any[]).flatMap((page: any) => page?.items ?? []);
      }
    }
    
    if ((!activitiesPages || activitiesPages.pages.length === 0) && bothQueriesReady) {
      const cachedActivities = queryClient.getQueryData<any>(["home-activities", selectedChain]);
      if (cachedActivities?.pages) {
        activitiesToUse = (cachedActivities.pages as PostDto[][]).flatMap((p) => p);
      }
    }
    
    // Only show combined list when both queries are ready (have data from queries or cache)
    if (!bothQueriesReady) {
      return [];
    }
    
    // Default path: interleave activities and latest, sorted by created_at desc
    // Deduplicate by post ID to avoid showing the same post twice
    const seenIds = new Set<string>();
    const merged: PostDto[] = [];
    
    // Add activities first, then regular posts, skipping duplicates
    for (const item of [...activitiesToUse, ...tradesToUse, ...postsToUse]) {
      const id = String(item?.id || '');
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        merged.push(item);
      }
    }
    
    return merged.sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });
  }, [list, activityList, tradeList, sortBy, popularList, latestListForHot, bothQueriesReady, latestData, activitiesPages, queryClient, localSearch, filterBy]);

  // Memoized filtered list
  const filteredAndSortedList = useMemo(() => {
    let filtered = [...combinedList];

    if (localSearch.trim()) {
      const searchTerm = localSearch.toLowerCase();
      filtered = filtered.filter(
        (item) => {
          if (isTradeItem(item)) {
            const tokenName = item.token?.name || "";
            const tokenSymbol = item.token?.symbol || "";
            const account = item.account || "";
            const chainName = chainNames?.[account] || "";
            const combined = `${tokenName} ${tokenSymbol} ${account} ${chainName}`.toLowerCase();
            return combined.includes(searchTerm);
          }
          return (
            (item.content && item.content.toLowerCase().includes(searchTerm)) ||
            (item.topics &&
              item.topics.some((topic) =>
                topic.toLowerCase().includes(searchTerm)
              )) ||
            (item.sender_address &&
              item.sender_address.toLowerCase().includes(searchTerm)) ||
            (chainNames?.[item.sender_address] &&
              chainNames[item.sender_address].toLowerCase().includes(searchTerm))
          );
        }
      );
    }

    if (filterBy === "withMedia") {
      filtered = filtered.filter(
        (item) =>
          !isTradeItem(item) &&
          (item as PostDto).media &&
          Array.isArray((item as PostDto).media) &&
          (item as PostDto).media.length > 0
      );
    } else if (filterBy === "withComments") {
      filtered = filtered.filter((item) => {
        return !isTradeItem(item) && ((item as PostDto).total_comments ?? 0) > 0;
      });
    }

    return filtered;
  }, [combinedList, localSearch, filterBy, chainNames]);

  // Memoized event handlers for better performance
  const handleSortChange = useCallback(
    (newSortBy: string) => {
      // Prevent switching to "hot" if popular feed is disabled
      if (!popularFeedEnabled && newSortBy === 'hot') {
        return;
      }
      
      // Only clear cache when switching FROM "latest" to something else
      // When switching TO "latest", keep cached data and just add new items
      if (sortBy === "latest" && newSortBy !== "latest") {
        queryClient.removeQueries({ queryKey: ["posts", selectedChain], exact: false });
        queryClient.removeQueries({ queryKey: ["home-activities", selectedChain], exact: false });
      }
      
      // Always clear popular posts cache when switching away from hot
      if (sortBy === "hot" && newSortBy !== "hot") {
        queryClient.removeQueries({ queryKey: ["popular-posts", selectedChain], exact: false });
      }
      
      if (newSortBy === 'hot') {
        navigate(`/?sortBy=hot&window=${popularWindow}`);
      } else {
        navigate(`/?sortBy=${newSortBy}`);
      }
    },
    [navigate, queryClient, popularWindow, popularFeedEnabled, sortBy, selectedChain]
  );

  const handlePopularWindowChange = useCallback((w: '24h'|'7d'|'all') => {
    setPopularWindow(w);
    if (sortBy === 'hot') {
      navigate(`/?sortBy=hot&window=${w}`);
      // Reset pages for new window
      queryClient.removeQueries({ queryKey: ["popular-posts", selectedChain], exact: false });
    }
  }, [navigate, sortBy, queryClient, selectedChain]);

  const handleItemClick = useCallback(
    (idOrSlug: string) => {
      const idStr = String(idOrSlug);
      if (idStr.startsWith("token-created:")) {
        const parts = idStr.replace(/_v3$/, "").split(":");
        const tokenNameEnc = parts[1] || "";
        const tokenName = decodeURIComponent(tokenNameEnc);
        navigate(`/trends/tokens/${tokenName}`);
        return;
      }
      // Save current feed scroll position before leaving only for post detail
      try {
        sessionStorage.setItem("feedScrollY", String(window.scrollY || 0));
      } catch {}
      navigate(`/post/${idStr.replace(/_v3$/, "")}`);
    },
    [navigate]
  );

  // Render helpers
  const renderEmptyState = () => {
    if (sortBy === "hot") {
      // Only show loading if we don't have cached data
      const initialLoading = popularLoading && (!popularData || (popularData as any)?.pages?.length === 0);
      const err = popularError;
      if (err) {
        return <EmptyState type="error" error={err as any} onRetry={() => { refetchPopular(); }} />;
      }
      // Show skeleton loaders when there are no popular posts for the selected window
      if (!err && filteredAndSortedList.length === 0 && !initialLoading) {
        return (
          <div className="w-full flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => <PostSkeleton key={`skeleton-hot-empty-${i}`} />)}
          </div>
        );
      }
      if (initialLoading && filteredAndSortedList.length === 0) {
        // Show skeleton loaders instead of loading text
        return (
          <div className="w-full flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => <PostSkeleton key={`skeleton-hot-${i}`} />)}
          </div>
        );
      }
      return null;
    }
    // Only show loading if we don't have cached data
    // For latest feed: show cached data immediately if available (from queries or cache)
    const hasQueryData = latestData && latestData.pages.length > 0 && activitiesPages && activitiesPages.pages.length > 0;
    const cachedPosts = queryClient.getQueryData<any>(["posts", selectedChain, { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                       queryClient.getQueryData<any>(["posts", selectedChain, { limit: 10, sortBy, search: localSearch, filterBy }]);
    const cachedActivities = queryClient.getQueryData<any>(["home-activities", selectedChain]);
    const hasCachedPostsData = cachedPosts && cachedPosts?.pages?.length > 0;
    const hasCachedActivitiesData = cachedActivities && cachedActivities?.pages?.length > 0;
    const hasCachedData = sortBy !== "hot" && (hasQueryData || (hasCachedPostsData && hasCachedActivitiesData));
    
    const initialLoading = sortBy === "hot"
      ? (popularLoading && (!popularData || (popularData as any)?.pages?.length === 0))
      : (!hasCachedData && (latestLoading || activitiesLoading)); // Only show loading if no cached data and actually loading
    if (latestError) {
      return <EmptyState type="error" error={latestError as any} onRetry={refetchLatest} />;
    }
    if (!latestError && filteredAndSortedList.length === 0 && !initialLoading) {
      // Show skeleton loaders instead of empty state
      return (
        <div className="w-full flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => <PostSkeleton key={`skeleton-latest-empty-${i}`} />)}
        </div>
      );
    }
    if (initialLoading && filteredAndSortedList.length === 0) {
      // Show skeleton loaders instead of loading text
      return (
        <div className="w-full flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => <PostSkeleton key={`skeleton-latest-${i}`} />)}
        </div>
      );
    }
    return null;
  };

  // Collapsible groups state keyed by first item id in the group
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Grouped render: collapse consecutive token-created items (>3) with a toggle pill
  const renderPostItem = useCallback(
    (post: PostDto) => (
      <ReplyToFeedItem
        key={post.id}
        item={post}
        commentCount={post.total_comments ?? 0}
        allowInlineRepliesToggle={false}
        onOpenPost={handleItemClick}
      />
    ),
    [handleItemClick]
  );

  const renderFeedItems = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let renderedCount = 0;
    const rng = createSeededRandom(trendingInsertSeed.current);
    let nextInsertAt = 2;

    const maybeInsertTrending = () => {
      if (renderedCount === nextInsertAt) {
        nodes.push(
          <TrendingAssetsFeedItem key={`trending-assets-${renderedCount}`} />
        );
        const step = 7 + Math.floor(rng() * 9);
        nextInsertAt += step;
      }
    };

    while (i < filteredAndSortedList.length) {
      const item = filteredAndSortedList[i];
      if (isTradeItem(item)) {
        maybeInsertTrending();
        nodes.push(
          <TradeActivityItem key={item.id} item={item} />
        );
        i += 1;
        renderedCount += 1;
        continue;
      }
      const postId = (item as PostDto).id;
      const isTokenCreated = String(postId).startsWith("token-created:");

      if (!isTokenCreated) {
        maybeInsertTrending();
        nodes.push(renderPostItem(item as PostDto));
        i += 1;
        renderedCount += 1;
        continue;
      }

      // Collect consecutive token-created items into a group
      const startIndex = i;
      const groupItems: PostDto[] = [];
      while (
        i < filteredAndSortedList.length &&
        !isTradeItem(filteredAndSortedList[i] as FeedItem) &&
        String((filteredAndSortedList[i] as PostDto).id).startsWith("token-created:")
      ) {
        groupItems.push(filteredAndSortedList[i] as PostDto);
        i += 1;
      }

      const groupId = String(groupItems[0]?.id || `group-${startIndex}`);
      const collapsed = groupItems.length > 3 && !expandedGroups.has(groupId);
      const visibleCount = collapsed ? 3 : groupItems.length;

      for (let j = 0; j < visibleCount; j += 1) {
        maybeInsertTrending();
        const gi = groupItems[j];
        const isLastVisible = j === visibleCount - 1;
        const hideDivider = !isLastVisible; // on mobile, never show lines between items, only at the end
        const hasMultiple = visibleCount > 1;
        const isFirstVisible = j === 0;
        const isMiddle = j > 0 && !isLastVisible;
        // Middle items should always be compact (py-1) on mobile; first/last keep default, with special edges.
        const mobileTight = isMiddle;
        const mobileNoTopPadding = false; // keep a minimal top (we'll use tight variants instead)
        const mobileNoBottomPadding = false; // keep a minimal bottom (we'll use tight variants instead)
        const mobileTightTop = hasMultiple && isLastVisible; // last: pt-0.5
        const mobileTightBottom = hasMultiple && isFirstVisible; // first: pb-0.5
        const footer = isLastVisible && groupItems.length > 3 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleGroup(groupId); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center text-[13px] px-2 py-1 bg-transparent border-0 text-white/80 hover:text-white outline-none focus:outline-none shadow-none ring-0 focus:ring-0 appearance-none [text-shadow:none]"
            style={{ WebkitTapHighlightColor: 'transparent', filter: 'none', WebkitAppearance: 'none', background: 'transparent', boxShadow: 'none' }}
            aria-expanded={!collapsed}
          >
            {collapsed ? `Show ${groupItems.length - 3} more` : 'Show less'}
          </button>
        ) : undefined;
        nodes.push(
          <TokenCreatedActivityItem
            key={gi.id}
            item={gi}
            hideMobileDivider={hideDivider}
            mobileTight={mobileTight}
            mobileNoTopPadding={mobileNoTopPadding}
            mobileNoBottomPadding={mobileNoBottomPadding}
            mobileTightTop={mobileTightTop}
            mobileTightBottom={mobileTightBottom}
            footer={footer}
          />
        );
        renderedCount += 1;
      }

      if (groupItems.length > 3) {
        // Expanded state: render Show less as its own small row (desktop + mobile)
        nodes.push(
          <div key={`${groupId}-toggle-expanded`} className="hidden md:block w-full px-2 md:px-0">
            <button
              type="button"
              onClick={() => toggleGroup(groupId)}
              className="w-full md:w-auto mx-auto flex items-center justify-center text-[13px] md:text-xs px-3 py-2 md:px-0 md:py-0 bg-transparent border-0 text-white/80 hover:text-white transition-colors outline-none focus:outline-none shadow-none ring-0 focus:ring-0 appearance-none [text-shadow:none]"
              style={{ WebkitTapHighlightColor: 'transparent', filter: 'none', WebkitAppearance: 'none', background: 'transparent', boxShadow: 'none' }}
              aria-expanded={!collapsed}
            >
              {collapsed ? `Show ${groupItems.length - 3} more` : 'Show less'}
            </button>
          </div>
        );
      }
    }
    return nodes;
  }, [filteredAndSortedList, expandedGroups, toggleGroup, renderPostItem]);

  const renderHotFeedItems = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let renderedCount = 0;
    const rng = createSeededRandom(trendingInsertSeed.current);
    let nextInsertAt = 2;

    const maybeInsertTrending = () => {
      if (renderedCount === nextInsertAt) {
        nodes.push(
          <TrendingAssetsFeedItem key={`trending-assets-hot-${renderedCount}`} />
        );
        const step = 7 + Math.floor(rng() * 9);
        nextInsertAt += step;
      }
    };

    for (const item of filteredAndSortedList) {
      maybeInsertTrending();
      nodes.push(renderPostItem(item as PostDto));
      renderedCount += 1;
    }

    return nodes;
  }, [filteredAndSortedList, renderPostItem]);

  // Preload PostDetail chunk to avoid first-click lazy load delay
  useEffect(() => {
    // Vite supports preloading dynamic chunks via import()
    import("../views/PostDetail").catch(() => {});
  }, []);

  // Restore scroll position when returning from detail pages
  useEffect(() => {
    const saved = sessionStorage.getItem("feedScrollY");
    const savedY = saved ? Number(saved) : 0;
    if (!Number.isNaN(savedY) && savedY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, savedY));
      // Clear after restoring to avoid stale restores
      sessionStorage.removeItem("feedScrollY");
    }
  }, []);

  // Auto-load more when reaching bottom using IntersectionObserver (all screens)
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  // Only show loading if we don't have any data yet and queries are still loading
  // If we have cached data, show it immediately even while refetching
  // For latest feed: show cached data immediately if available (from queries or cache)
  const hasQueryDataForLatest = sortBy !== "hot" && latestData && latestData.pages.length > 0 && activitiesPages && activitiesPages.pages.length > 0;
  const cachedPostsForLatest = queryClient.getQueryData<any>(["posts", selectedChain, { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                              queryClient.getQueryData<any>(["posts", selectedChain, { limit: 10, sortBy, search: localSearch, filterBy }]);
  const cachedActivitiesForLatest = queryClient.getQueryData<any>(["home-activities", selectedChain]);
  const hasCachedPostsForLatest = cachedPostsForLatest && cachedPostsForLatest?.pages?.length > 0;
  const hasCachedActivitiesForLatest = cachedActivitiesForLatest && cachedActivitiesForLatest?.pages?.length > 0;
  const hasCachedDataForLatest = sortBy !== "hot" && (hasQueryDataForLatest || (hasCachedPostsForLatest && hasCachedActivitiesForLatest));
  
  const initialLoading =
    sortBy === "hot"
      ? (popularLoading && (!popularData || (popularData as any)?.pages?.length === 0))
      : (!hasCachedDataForLatest && (latestLoading || activitiesLoading)); // Only show loading if no cached data and actually loading
  const [showLoadMore, setShowLoadMore] = useState(false);
  useEffect(() => { setShowLoadMore(false); }, [sortBy]);
  useEffect(() => {
    if (initialLoading) return;
    if (!('IntersectionObserver' in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || fetchingRef.current) {
        return;
      }
      
      // Prevent multiple simultaneous fetches
      if (fetchingRef.current) {
        return;
      }
      
      setShowLoadMore(true);
      fetchingRef.current = true;
      const tasks: Promise<any>[] = [];
      if (sortBy === "hot") {
        const lastPage = popularData?.pages?.[popularData.pages.length - 1];
        const manualHasMore = lastPage?.meta?.currentPage && lastPage?.meta?.totalPages && lastPage.meta.currentPage < lastPage.meta.totalPages;
        // If popular posts are exhausted or we don't have enough, fetch latest posts (prioritize this)
        if ((popularExhausted || !hasEnoughPopularPosts) && queryEnabledWithEnoughPosts) {
          // Only fetch if query is enabled, not currently fetching, and there are more pages
          if (hasMoreLatestForHot && !fetchingMoreLatestForHot) {
            tasks.push(fetchNextLatestForHot());
          }
        } else if (!popularExhausted && hasEnoughPopularPosts && (hasMorePopular || manualHasMore) && !fetchingMorePopular) {

          tasks.push(fetchNextPopular());
        }
      } else {
        if (hasMoreLatest && !fetchingMoreLatest) tasks.push(fetchNextLatest());
        if (hasMoreActivities && !fetchingMoreActivities) tasks.push(fetchNextActivities());
      }
      Promise.all(tasks).finally(() => {
        fetchingRef.current = false;
      });
    }, { root: null, rootMargin: '800px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    initialLoading,
    sortBy,
    // latest
    hasMoreLatest,
    fetchingMoreLatest,
    fetchNextLatest,
    // activities
    hasMoreActivities,
    fetchingMoreActivities,
    fetchNextActivities,
    // popular
    hasMorePopular,
    fetchingMorePopular,
    fetchNextPopular,
    popularData, // Add popularData to dependencies so manualHasMore uses latest data
    popularExhausted,
    hasMoreLatestForHot,
    fetchingMoreLatestForHot,
    fetchNextLatestForHot,
    queryEnabledWithEnoughPosts, // Add queryEnabledWithEnoughPosts to dependencies
    hasEnoughPopularPosts, // Add hasEnoughPopularPosts to dependencies
    latestDataForHot, // Add latestDataForHot to dependencies
  ]);

  const content = (
    <div className="w-full md:border md:border-white/10 md:rounded-2xl md:overflow-hidden">
      {isHomepage && (
        <Head
          title="Superhero.com – The All‑in‑One Social + Crypto App"
          description="Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network."
          canonicalPath="/"
        />
      )}
      {!standalone && !isBannerDismissed && (
        <div className="mb-3 md:mb-4">
          <HeroBannerCarousel 
            onStartPosting={() => createPostRef.current?.focus()} 
          />
        </div>
      )}
      {/* Single CreatePost instance for consistent focus/scroll across viewports */}
      <div>
        <CreatePost
          ref={createPostRef}
          onSuccess={() => {
            // Use ref to get current sortBy value instead of closure value
            // This ensures we refetch the correct feed even if onPostCreated changed sortBy first
            const currentSortBy = sortByRef.current;
            if (currentSortBy === "hot") {
              refetchPopular();
            } else {
              refetchLatest();
            }
          }}
          onPostCreated={() => {
            // Switch to latest tab if user is on popular tab when posting
            if (sortBy === "hot") {
              handleSortChange("latest");
              // Update ref immediately so onSuccess callback sees the new value
              sortByRef.current = "latest";
            }
          }}
          autoFocus={shouldAutoFocusPost}
        />
        {/* Sort controls rendered once; styles adapt per breakpoint */}
        <div className="md:hidden">
          <SortControls
            sortBy={sortBy}
            onSortChange={handleSortChange}
            className="sticky top-0 z-10 w-full"
            popularWindow={popularWindow}
            onPopularWindowChange={handlePopularWindowChange}
            popularFeedEnabled={popularFeedEnabled}
          />
        </div>
        <div className="hidden md:block">
          <SortControls
            sortBy={sortBy}
            onSortChange={handleSortChange}
            popularWindow={popularWindow}
            onPopularWindowChange={handlePopularWindowChange}
            popularFeedEnabled={popularFeedEnabled}
          />
        </div>
      </div>

      <div className="w-full flex flex-col gap-0 md:mx-0">
        {renderEmptyState()}
        {/* Non-hot: existing renderer - show feed if we have data, even while refetching */}
        {sortBy !== "hot" && (latestData?.pages.length > 0 || activityList.length > 0) && renderFeedItems}

        {/* Hot: render popular posts (which seamlessly includes recent posts after popular posts are exhausted) */}
        {sortBy === "hot" && (popularData?.pages.length > 0 || latestDataForHot?.pages.length > 0) && (
          <>
            {renderHotFeedItems}
          </>
        )}
      </div>

      {/* Load more button (desktop) */}
      {!initialLoading && !latestError && !popularError && (
        <>
          {/* Desktop: explicit load more button */}
          {showLoadMore && (
            <div className="hidden md:block p-4 md:p-6 text-center">
              <AeButton
                loading={
                  sortBy === "hot"
                    ? (fetchingMorePopular || fetchingMoreLatestForHot)
                    : (fetchingMoreLatest || fetchingMoreActivities)
                }
                onClick={async () => {
                  if (sortBy === "hot") {
                    const lastPage = popularData?.pages?.[popularData.pages.length - 1];
                    const manualHasMore = lastPage?.meta?.currentPage && lastPage?.meta?.totalPages && lastPage.meta.currentPage < lastPage.meta.totalPages;
                    // If popular posts are exhausted or we don't have enough, fetch latest posts (prioritize this)
                    if ((popularExhausted || !hasEnoughPopularPosts) && queryEnabledWithEnoughPosts) {
                      // Only fetch if query is enabled, not currently fetching, and there are more pages
                      if (hasMoreLatestForHot && !fetchingMoreLatestForHot) {
                        await fetchNextLatestForHot();
                      }
                    } else if (!popularExhausted && hasEnoughPopularPosts && (hasMorePopular || manualHasMore) && !fetchingMorePopular) {
                      // Try to fetch popular posts if there are more and we have enough already
                      await fetchNextPopular();
                    }
                    return;
                  }
                  const tasks: Promise<any>[] = [];
                  if (hasMoreLatest && !fetchingMoreLatest) tasks.push(fetchNextLatest());
                  if (hasMoreActivities && !fetchingMoreActivities) tasks.push(fetchNextActivities());
                  if (tasks.length > 0) await Promise.all(tasks);
                }}
                className="bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-cubic-bezier hover:from-white/15 hover:to-white/10 hover:border-white/25 hover:-translate-y-0.5"
              >
                Load more
              </AeButton>
            </div>
          )}
          {/* Auto-load sentinel for all breakpoints */}
          <div id="feed-infinite-sentinel" className="h-10" ref={sentinelRef} />
        </>
      )}
    </div>
  );

  return standalone ? (
    <Shell right={<RightRail />} containerClassName="max-w-[1080px] mx-auto">
      {content}
    </Shell>
  ) : (
    content
  );
}
