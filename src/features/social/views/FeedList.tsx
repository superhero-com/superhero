import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { PostsService } from "../../../api/generated";
import type { PostDto } from "../../../api/generated";
import { SuperheroApi } from "../../../api/backend";
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
import PollCreatedCard from "../feed-plugins/poll-created/PollCreatedCard";
import { useAeSdk } from "@/hooks";
import TokenCreatedFeedItem from "../components/TokenCreatedFeedItem";
import TokenCreatedActivityItem from "../components/TokenCreatedActivityItem";
import { PostApiResponse } from "../types";
import FeedRenderer from "../feed-plugins/FeedRenderer";
import { adaptPostToEntry } from "../feed-plugins/post";
import type { FeedEntry } from "../feed-plugins/types";
import { adaptTokenCreatedToEntry } from "../feed-plugins/token-created";
import { getAllPlugins } from "../feed-plugins/registry";
import { usePluginEntries } from "../feed-plugins/FeedOrchestrator";
import { GovernanceApi } from "@/api/governance";
import Head from "../../../seo/Head";
import { CONFIG } from "../../../config";

// Built-in plugins are now registered via the plugin host (local/external loaders)

// Custom hook
function useUrlQuery() {
  return new URLSearchParams(useLocation().search);
}

// Wrapper component for poll items from popular feed
function PollItemWrapper({ pollAddress, ...props }: any) {
  const { sdk, activeAccount } = useAeSdk() as any;
  const [currentHeight, setCurrentHeight] = React.useState<number | undefined>(undefined);
  
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await (sdk as any)?.getHeight?.();
        if (!cancelled && typeof h === 'number') setCurrentHeight(h);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [sdk]);
  
  // For polls from popular feed, we'll use a simplified version without voting
  // Users can click to open the full poll page if they want to vote
  return (
    <PollCreatedCard
      {...props}
      currentHeight={currentHeight}
      myVote={null}
      onVoteOption={undefined}
      onRevoke={undefined}
      voting={false}
      pendingOption={null}
    />
  );
}

export default function FeedList({
  standalone = true,
}: { standalone?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlQuery = useUrlQuery();
  const { chainNames, address: activeAccount } = useWallet();
  const queryClient = useQueryClient();
  const ACTIVITY_PAGE_SIZE = 50;
  const createPostRef = useRef<CreatePostRef>(null);
  // Use ref to track current sortBy to avoid stale closure in callbacks
  // Initialize with default value since sortBy isn't defined yet
  const sortByRef = useRef<string>("hot");
  
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

  // Keep popularWindow in sync with URL (e.g., browser back/forward or direct URL edits)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get("window") as '24h'|'7d'|'all' | null) || '24h';
    if (fromUrl !== popularWindow) {
      setPopularWindow(fromUrl);
      if (sortBy === 'hot') {
        // Reset cached pages to avoid mixing windows
        queryClient.removeQueries({ queryKey: ["popular-posts"], exact: false });
      }
    }
  }, [location.search, sortBy, queryClient, popularWindow]);

  // Listen for injected feed entries (prepend/replace in caches)
  useEffect(() => {
    function onInject(ev: any) {
      const entry = ev?.detail?.entry as any;
      const targets: string[] = ev?.detail?.targets || [];
      if (!entry || !entry.id) return;

      const mutate = (key: any) => {
        queryClient.setQueryData<any>(key, (prev: any) => {
          if (!prev) return prev;
          // Handles both infiniteQuery pages and flat arrays
          const updateArray = (arr: any[]) => {
            const idx = arr.findIndex((it: any) => it?.id === entry.id);
            if (idx >= 0) {
              const next = [...arr];
              next[idx] = entry;
              return next;
            }
            return [entry, ...arr];
          };
          if (prev?.pages && Array.isArray(prev.pages)) {
            const first = prev.pages[0] || [];
            const updatedFirst = updateArray(first);
            return { ...prev, pages: [updatedFirst, ...prev.pages.slice(1)] };
          }
          if (Array.isArray(prev)) return updateArray(prev);
          return prev;
        });
      };

      if (targets.includes('global')) {
        mutate(["posts", { limit: 10, sortBy, search: localSearch, filterBy }]);
        mutate(['home-posts', sortBy, filterBy, localSearch]);
      }
      if (targets.includes('profile')) {
        const author = entry?.data?.author || activeAccount;
        if (author) mutate(['profile-posts', author]);
      }
    }
    window.addEventListener('sh:feed:inject' as any, onInject as any);
    return () => window.removeEventListener('sh:feed:inject' as any, onInject as any);
  }, [queryClient, sortBy, filterBy, localSearch, activeAccount]);

  // Comment counts are now provided directly by the API in post.total_comments

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

  // Activities (token-created) fetched in parallel with smaller initial batch + pagination
  const {
    data: activitiesPages,
    isLoading: activitiesLoading,
    fetchNextPage: fetchNextActivities,
    hasNextPage: hasMoreActivities,
    isFetchingNextPage: fetchingMoreActivities,
    refetch: refetchActivities,
  } = useInfiniteQuery<PostDto[], Error>({
    queryKey: ["home-activities"],
    enabled: sortBy !== "hot",
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const resp = await SuperheroApi.listTokens({
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

  // Live updates for token-created via websocket
  useEffect(() => {
    if (sortBy === "hot") return;
    const unsubscribe = WebSocketClient.subscribeToNewTokenSales((payload: any) => {
      const mapped = mapTokenCreatedToPost(payload);
      queryClient.setQueryData(["home-activities"], (prev: any) => {
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
  }, [mapTokenCreatedToPost, queryClient, sortBy]);

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
    queryKey: ["posts", { limit: 10, sortBy, search: localSearch, filterBy }],
    queryFn: ({ pageParam = 1 }) =>
      PostsService.listAll({
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
        queryKey: ["home-activities"],
        queryFn: async ({ pageParam = 1 }) => {
          const resp = await SuperheroApi.listTokens({
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
        queryKey: ["posts", { limit: 10, sortBy: "latest", search: "", filterBy: "all" }],
        queryFn: ({ pageParam = 1 }) =>
          PostsService.listAll({
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
  }, [sortBy, queryClient, mapTokenCreatedToPost, ACTIVITY_PAGE_SIZE]);

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
    queryKey: ["popular-posts", { limit: 10, window: popularWindow }],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await SuperheroApi.listPopularPosts({
        window: popularWindow,
        page: pageParam as number,
        limit: 10,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[Popular Feed] Query response:', {
          pageParam,
          response,
          meta: response?.meta,
        });
      }
      return response as PostApiResponse;
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      // Continue pagination if we have totalPages and haven't reached it yet
      const meta = lastPage?.meta;
      const items = lastPage?.items || [];
      
      // Stop if we got an empty page AND we've already fetched at least one page
      // (This handles the case where backend returns wrong totalPages but we've exhausted actual posts)
      if (items.length === 0 && allPages.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Popular Feed] getNextPageParam: Stopping because empty page after fetching', {
            pagesFetched: allPages.length,
          });
        }
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[Popular Feed] getNextPageParam: Stopping because all items fetched', {
              totalFetched,
              totalItems: meta.totalItems,
            });
          }
          return undefined;
        }
      }
      
      const hasMore = meta?.currentPage && meta?.totalPages && meta.currentPage < meta.totalPages;
      const nextPage = hasMore ? meta.currentPage + 1 : undefined;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [DEBUG] Popular Feed getNextPageParam:', {
          currentPage: meta?.currentPage,
          totalPages: meta?.totalPages,
          totalItems: meta?.totalItems,
          itemCount: meta?.itemCount,
          itemsLength: items.length,
          pagesFetched: allPages.length,
          hasMore,
          nextPage,
          willReturn: nextPage || 'undefined (stop)',
        });
      }
      
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG] popularExhausted calculation:', {
        result,
        lastPageEmpty,
        lastPageIncomplete,
        reachedLastPage,
        fetchedAllItems,
        reasonableTotalPages,
        reasonableTotalItems,
        totalFetched,
        totalItems: meta?.totalItems,
        currentPage: meta?.currentPage,
        totalPages: meta?.totalPages,
        lastPageItemsLength: lastPageItems.length,
        pagesCount: popularData.pages.length,
      });
    }
    
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
    queryKey: ["latest-posts-for-hot", { limit: 10, window: popularWindow, excludeIds: Array.from(popularPostIds).sort().join(',') }],
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
      
      const response = await PostsService.listAll({
        limit: 10,
        page: pageParam,
        orderBy: "created_at",
        orderDirection: "DESC",
        search: "",
      }) as unknown as PostApiResponse;
      
      // Filter out popular posts on the frontend using current popularPostIds
      const filteredItems = response.items.filter((item: any) => !currentPopularIds.has(String(item.id)));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [DEBUG] Latest Feed for Hot Query Response:', {
          pageParam,
          totalItems: response.items.length,
          filteredItems: filteredItems.length,
          excludedPopular: response.items.length - filteredItems.length,
          popularPostIdsSize: currentPopularIds.size,
          popularPostIds: Array.from(currentPopularIds).slice(0, 5),
          meta: response?.meta,
        });
      }
      
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [DEBUG] Latest Feed for Hot getNextPageParam:', {
          currentPage: meta?.currentPage,
          totalPages: meta?.totalPages,
          lastPageItemsLength: lastPageItems.length,
          originalItemsLength: lastPage?.items?.length || 0,
          pagesFetched: allPages.length,
          hasMore,
          nextPage,
          willReturn: nextPage || 'undefined (stop)',
        });
      }
      
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

  // Plugin-driven entries (includes poll-created via its fetchPage)
  const pluginEntries = usePluginEntries(getAllPlugins(), sortBy !== "hot");

  // Fetch current chain height once to estimate accurate poll creation times
  const { sdk } = useAeSdk();
  const [chainHeight, setChainHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await (sdk as any)?.getHeight?.();
        if (!cancelled && typeof h === "number") setChainHeight(h);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [sdk]);

  // Check if we have enough popular posts (at least 10) to fill the initial view
  const hasEnoughPopularPosts = popularList.length >= 10;
  
  // Update queryEnabled to also enable if we don't have enough popular posts
  // This enables the query immediately if we have less than 10 popular posts
  const queryEnabledWithEnoughPosts = sortBy === "hot" && (popularExhausted || !hasEnoughPopularPosts);

  // Debug log for latestDataForHot query state (moved to useEffect to prevent render spam)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && sortBy === "hot") {
      console.log('🔍 [DEBUG] latestDataForHot query state:', {
        queryEnabledWithEnoughPosts,
        sortBy,
        popularExhausted,
        hasEnoughPopularPosts,
        popularListLength: popularList.length,
        popularPostIdsSize: popularPostIds.size,
        latestDataForHotPages: latestDataForHot?.pages?.length || 0,
        hasMoreLatestForHot,
        fetchingMoreLatestForHot,
      });
    }
  }, [sortBy, queryEnabledWithEnoughPosts, popularExhausted, hasEnoughPopularPosts, popularList.length, popularPostIds.size, latestDataForHot?.pages?.length, hasMoreLatestForHot, fetchingMoreLatestForHot]);

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

  // Debug logging for popular feed pagination
  useEffect(() => {
    if (sortBy === "hot" && process.env.NODE_ENV === 'development') {
      const lastPage = popularData?.pages?.[popularData.pages.length - 1];
      const popularListLength = popularData?.pages ? ((popularData.pages as any[]) || []).flatMap((page: any) => page?.items ?? []).length : 0;
      console.log('[Popular Feed] State:', {
        hasMorePopular,
        fetchingMorePopular,
        pagesCount: popularData?.pages?.length,
        totalItems: popularListLength,
        lastPage,
        lastPageMeta: lastPage?.meta,
        computedHasMore: lastPage?.meta?.currentPage && lastPage?.meta?.totalPages && lastPage.meta.currentPage < lastPage.meta.totalPages,
        popularExhausted,
        popularPostIdsSize: popularPostIds.size,
        queryEnabled,
        latestDataForHotPages: latestDataForHot?.pages?.length || 0,
        hasMoreLatestForHot,
        fetchingMoreLatestForHot,
      });
    }
  }, [sortBy, hasMorePopular, fetchingMorePopular, popularData, popularExhausted, popularPostIds.size, queryEnabled, latestDataForHot, hasMoreLatestForHot, fetchingMoreLatestForHot]);
  
  // Auto-fetch latest posts if we have less than 10 popular posts and haven't fetched yet
  useEffect(() => {
    const popularListLength = popularData?.pages ? ((popularData.pages as any[]) || []).flatMap((page: any) => page?.items ?? []).length : 0;
    // Check if latestDataForHot hasn't been fetched yet (undefined or empty pages array)
    // Use falsy check instead of === 0 because undefined !== 0
    const hasNotFetchedLatest = !latestDataForHot?.pages || latestDataForHot.pages.length === 0;
    if (sortBy === "hot" && queryEnabledWithEnoughPosts && popularListLength < 10 && hasNotFetchedLatest && !fetchingMoreLatestForHot && hasMoreLatestForHot) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [DEBUG] Auto-fetching latest posts because popular posts < 10:', {
          popularListLength,
          hasEnoughPopularPosts,
          popularExhausted,
          hasNotFetchedLatest,
          latestDataForHotPagesLength: latestDataForHot?.pages?.length,
        });
      }
      fetchNextLatestForHot();
    }
  }, [sortBy, queryEnabledWithEnoughPosts, popularData, popularExhausted, latestDataForHot, fetchingMoreLatestForHot, hasMoreLatestForHot, fetchNextLatestForHot, hasEnoughPopularPosts]);
  
  // Force check hasMorePopular whenever popularData changes
  useEffect(() => {
    if (sortBy === "hot" && process.env.NODE_ENV === 'development') {
      console.log('[Popular Feed] hasMorePopular changed:', hasMorePopular);
    }
  }, [sortBy, hasMorePopular]);


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
    const cachedPosts = queryClient.getQueryData(["posts", { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                       queryClient.getQueryData(["posts", { limit: 10, sortBy, search: localSearch, filterBy }]);
    const cachedActivities = queryClient.getQueryData(["home-activities"]);
    
    const hasCachedPostsData = cachedPosts && (cachedPosts as any)?.pages?.length > 0;
    const hasCachedActivitiesData = cachedActivities && (cachedActivities as any)?.pages?.length > 0;
    
    // If we have data from queries OR cached data, show it
    if ((hasPostsData || hasCachedPostsData) && (hasActivitiesData || hasCachedActivitiesData)) {
      return true;
    }
    
    return false;
  }, [sortBy, latestData, activitiesPages, queryClient, localSearch, filterBy]);

  // Combine posts with token-created events and sort by created_at DESC
  const combinedList = useMemo(() => {
    if (sortBy === "hot") {
      // For hot: popular posts first, then latest posts (filtered to exclude popular ones)
      const combined = [...popularList, ...latestListForHot];
      return combined;
    }
    
    // Hide token-created events on the popular (hot) tab
    const includeEvents = sortBy !== "hot";
    const APPROX_BLOCK_MS = 180000; // ~3 minutes per block
    const pluginItems = includeEvents
      ? (pluginEntries.entries || []).map((e: any) => {
          let createdAtIso = e.createdAt;
          if (e.kind === "poll-created" && chainHeight != null && e?.data?.createHeight != null) {
            const deltaBlocks = Math.max(0, Number(chainHeight) - Number(e.data.createHeight));
            createdAtIso = new Date(Date.now() - deltaBlocks * APPROX_BLOCK_MS).toISOString();
          }
          return {
            id: e.id,
            created_at: createdAtIso,
            content: e?.data?.title || "",
            sender_address: e?.data?.author || "",
            __feedEntry: e,
          };
        })
      : [];
    
    // For latest feed: use cached data if queries don't have data yet
    // This ensures cached/prefetched data shows immediately
    let postsToUse = list;
    let activitiesToUse = activityList;
    
    // If queries don't have data yet, try to get cached data
    if ((!latestData || latestData.pages.length === 0) && bothQueriesReady) {
      const cachedPosts = queryClient.getQueryData<any>(["posts", { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                         queryClient.getQueryData<any>(["posts", { limit: 10, sortBy, search: localSearch, filterBy }]);
      if (cachedPosts?.pages) {
        postsToUse = (cachedPosts.pages as any[]).flatMap((page: any) => page?.items ?? []);
      }
    }
    
    if ((!activitiesPages || activitiesPages.pages.length === 0) && bothQueriesReady) {
      const cachedActivities = queryClient.getQueryData<any>(["home-activities"]);
      if (cachedActivities?.pages) {
        activitiesToUse = (cachedActivities.pages as PostDto[][]).flatMap((p) => p);
      }
    }
    
    // Only show combined list when both queries are ready (have data from queries or cache)
    if (!bothQueriesReady) {
      return [];
    }
    
    // Default path: interleave plugin items, activities and latest, sorted by created_at desc
    // Deduplicate by post ID to avoid showing the same post twice
    const seenIds = new Set<string>();
    const merged: PostDto[] = [];
    
    // Add plugin items, activities, then regular posts, skipping duplicates
    for (const item of [...pluginItems, ...activitiesToUse, ...postsToUse]) {
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
  }, [list, activityList, pluginEntries.entries, sortBy, popularList, latestListForHot, bothQueriesReady, latestData, activitiesPages, queryClient, localSearch, filterBy, chainHeight]);

  // Memoized filtered list
  const filteredAndSortedList = useMemo(() => {
    let filtered = [...combinedList];
    
    // Debug logs removed to reduce console spam - uncomment if needed for debugging
    // if (process.env.NODE_ENV === 'development' && sortBy === "hot") {
    //   console.log('🔍 [DEBUG] filteredAndSortedList computed:', {
    //     combinedListCount: combinedList.length,
    //     filteredCountBefore: filtered.length,
    //   });
    // }

    if (localSearch.trim()) {
      const searchTerm = localSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
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
    
    // Debug log removed to reduce console spam
    // if (process.env.NODE_ENV === 'development' && sortBy === "hot") {
    //   console.log('🔍 [DEBUG] filteredAndSortedList final:', {
    //     finalCount: filtered.length,
    //   });
    // }

    if (filterBy === "withMedia") {
      filtered = filtered.filter(
        (item) =>
          item.media && Array.isArray(item.media) && item.media.length > 0
      );
    } else if (filterBy === "withComments") {
      filtered = filtered.filter((item) => {
        return (item.total_comments ?? 0) > 0;
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
        queryClient.removeQueries({ queryKey: ["posts"], exact: false });
        queryClient.removeQueries({ queryKey: ["home-activities"], exact: false });
      }
      
      // Always clear popular posts cache when switching away from hot
      if (sortBy === "hot" && newSortBy !== "hot") {
        queryClient.removeQueries({ queryKey: ["popular-posts"], exact: false });
      }
      
      if (newSortBy === 'hot') {
        navigate(`/?sortBy=hot&window=${popularWindow}`);
      } else {
        navigate(`/?sortBy=${newSortBy}`);
      }
    },
    [navigate, queryClient, popularWindow, popularFeedEnabled, sortBy]
  );

  const handlePopularWindowChange = useCallback((w: '24h'|'7d'|'all') => {
    setPopularWindow(w);
    if (sortBy === 'hot') {
      navigate(`/?sortBy=hot&window=${w}`);
      // Reset pages for new window
      queryClient.removeQueries({ queryKey: ["popular-posts"], exact: false });
    }
  }, [navigate, sortBy, queryClient]);

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
    const cachedPosts = queryClient.getQueryData<any>(["posts", { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                       queryClient.getQueryData<any>(["posts", { limit: 10, sortBy, search: localSearch, filterBy }]);
    const cachedActivities = queryClient.getQueryData<any>(["home-activities"]);
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
  const renderFeedItems = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < filteredAndSortedList.length) {
      const item = filteredAndSortedList[i];
      const postId = item.id;
      const isTokenCreated = String(postId).startsWith("token-created:");
      const isPollCreated = String(postId).startsWith("poll-created:");

      if (!isTokenCreated && !isPollCreated) {
        // Render normal posts via FeedRenderer using the adapter
        const entry: FeedEntry = adaptPostToEntry(item as PostDto, item.total_comments ?? 0);
        nodes.push(<FeedRenderer key={postId} entry={entry} onOpenPost={handleItemClick} />);
        i += 1;
        continue;
      }

      if (isPollCreated) {
        // When polls come from pluginEntries they are already FeedEntry objects; but when merged with posts
        // we carry them as lightweight items with id/created_at and a hidden __entry. Prefer __entry if present.
        const entry: FeedEntry | undefined = (item as any).__feedEntry || undefined;
        if (entry) {
          const onOpen = (id: string) => {
            try {
              sessionStorage.setItem("feedScrollY", String(window.scrollY || 0));
            } catch {}
            navigate(`/poll/${id}`);
          };
          nodes.push(<FeedRenderer key={postId} entry={entry} onOpenPost={onOpen} />);
          i += 1;
          continue;
        }
        i += 1;
        continue;
      }

      // Collect consecutive token-created items into a group
      const startIndex = i;
      const groupItems: PostDto[] = [];
      while (
        i < filteredAndSortedList.length &&
        String(filteredAndSortedList[i].id).startsWith("token-created:")
      ) {
        groupItems.push(filteredAndSortedList[i] as PostDto);
        i += 1;
      }

      const groupId = String(groupItems[0]?.id || `group-${startIndex}`);
      const collapsed = groupItems.length > 3 && !expandedGroups.has(groupId);
      const visibleCount = collapsed ? 3 : groupItems.length;

      for (let j = 0; j < visibleCount; j += 1) {
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

        const entry: FeedEntry = adaptTokenCreatedToEntry(gi, {
          hideMobileDivider: hideDivider,
          mobileTight,
          mobileNoTopPadding,
          mobileNoBottomPadding,
          mobileTightTop,
          mobileTightBottom,
          footer,
        });
        nodes.push(<FeedRenderer key={gi.id} entry={entry} onOpenPost={handleItemClick} />);
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
  }, [filteredAndSortedList, handleItemClick, expandedGroups, toggleGroup]);

  // Preload PostDetail chunk to avoid first-click lazy load delay
  useEffect(() => {
    // Vite supports preloading dynamic chunks via import()
    import("../views/PostDetail").catch(() => {});
    import("../views/PollDetail").catch(() => {});
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
  const cachedPostsForLatest = queryClient.getQueryData<any>(["posts", { limit: 10, sortBy: "latest", search: "", filterBy: "all" }]) ||
                              queryClient.getQueryData<any>(["posts", { limit: 10, sortBy, search: localSearch, filterBy }]);
  const cachedActivitiesForLatest = queryClient.getQueryData<any>(["home-activities"]);
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
      if (process.env.NODE_ENV === 'development') {
        console.log('[Popular Feed] Sentinel not found');
      }
      return;
    }
    // Debug log removed to reduce console spam - uncomment if needed for debugging
    // if (process.env.NODE_ENV === 'development' && sortBy === "hot") {
    //   console.log('[Popular Feed] Setting up intersection observer:', {
    //     hasMorePopular,
    //     fetchingMorePopular,
    //     popularExhausted,
    //     hasMoreLatestForHot,
    //     fetchingMoreLatestForHot,
    //     sentinelExists: !!sentinel,
    //   });
    // }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || fetchingRef.current) {
        // Debug log removed to reduce console spam
        // if (process.env.NODE_ENV === 'development' && sortBy === "hot") {
        //   console.log('[Popular Feed] Intersection observer: not triggering', {
        //     isIntersecting: entry.isIntersecting,
        //     fetchingRef: fetchingRef.current,
        //   });
        // }
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
        // Debug logs removed to reduce console spam - uncomment if needed for debugging
        // if (process.env.NODE_ENV === 'development') {
        //   console.log('🔍 [DEBUG] Intersection Observer TRIGGERED:', {
        //     hasMorePopular,
        //     fetchingMorePopular,
        //     popularExhausted,
        //     hasMoreLatestForHot,
        //     fetchingMoreLatestForHot,
        //     lastPageMeta: lastPage?.meta,
        //     manualHasMore,
        //     popularPagesCount: popularData?.pages?.length || 0,
        //     latestPagesCount: latestDataForHot?.pages?.length || 0,
        //     queryEnabledWithEnoughPosts,
        //   });
        // }
        // If popular posts are exhausted or we don't have enough, fetch latest posts (prioritize this)
        if ((popularExhausted || !hasEnoughPopularPosts) && queryEnabledWithEnoughPosts) {
          // Only fetch if query is enabled, not currently fetching, and there are more pages
          if (hasMoreLatestForHot && !fetchingMoreLatestForHot) {
            // Debug log removed to reduce console spam
            // if (process.env.NODE_ENV === 'development') {
            //   console.log('🔍 [DEBUG] Intersection Observer - FETCHING latest posts');
            // }
            tasks.push(fetchNextLatestForHot());
          }
          // Debug log removed to reduce console spam
          // else if (process.env.NODE_ENV === 'development') {
          //   console.log('🔍 [DEBUG] Intersection Observer - NOT fetching latest posts:', {
          //     hasMoreLatestForHot,
          //     fetchingMoreLatestForHot,
          //     queryEnabledWithEnoughPosts,
          //   });
          // }
        } else if (!popularExhausted && hasEnoughPopularPosts && (hasMorePopular || manualHasMore) && !fetchingMorePopular) {
          // Try to fetch popular posts if there are more and we have enough already
          // Debug log removed to reduce console spam
          // if (process.env.NODE_ENV === 'development') {
          //   console.log('🔍 [DEBUG] Intersection Observer - FETCHING popular posts');
          // }
          tasks.push(fetchNextPopular());
        }
        // Debug log removed to reduce console spam
        // else if (process.env.NODE_ENV === 'development') {
        //   console.log('🔍 [DEBUG] Intersection Observer - NOT fetching (no conditions met):', {
        //     popularExhausted,
        //     hasEnoughPopularPosts,
        //     queryEnabledWithEnoughPosts,
        //     hasMorePopular,
        //     manualHasMore,
        //     fetchingMorePopular,
        //     hasMoreLatestForHot,
        //     fetchingMoreLatestForHot,
        //   });
        // }
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
    <div className="w-full">
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

      <div className="w-full flex flex-col gap-0 md:gap-2 md:mx-0">
        {renderEmptyState()}
        {/* Non-hot: existing renderer - show feed if we have data, even while refetching */}
        {sortBy !== "hot" && (latestData?.pages.length > 0 || activityList.length > 0) && renderFeedItems}

        {/* Hot: render popular posts (which seamlessly includes recent posts after popular posts are exhausted) */}
        {sortBy === "hot" && (popularData?.pages.length > 0 || latestDataForHot?.pages.length > 0) && (
          <>
            {/* Debug log removed to reduce console spam */}
            {/* {process.env.NODE_ENV === 'development' && console.log('🔍 [DEBUG] Rendering hot feed:', {
              filteredAndSortedListLength: filteredAndSortedList.length,
              popularDataPages: popularData?.pages?.length || 0,
              latestDataForHotPages: latestDataForHot?.pages?.length || 0,
            })} */}
            {filteredAndSortedList.map((item: any) => {
              // Check if this is a poll item from the popular feed
              if (item.type === 'poll' && item.metadata) {
                const pollMetadata = item.metadata;
                const voteOptions = pollMetadata.vote_options || [];
                const votesByOption = pollMetadata.votes_count_by_option || {};
                
                // Convert vote_options array to options format expected by PollCreatedCard
                const options = voteOptions.map((opt: { key: number; val: string }) => ({
                  id: opt.key,
                  label: opt.val,
                  votes: votesByOption[String(opt.key)] || 0,
                }));
                
                const totalVotes = pollMetadata.votes_count || 0;
                
                return (
                  <PollItemWrapper
                    key={item.id}
                    pollAddress={pollMetadata.poll_address}
                    title={item.content.split(' - ')[0] || 'Untitled poll'}
                    description={item.content.includes(' - ') ? item.content.split(' - ').slice(1).join(' - ') : undefined}
                    author={item.sender_address}
                    closeHeight={pollMetadata.close_height}
                    createHeight={pollMetadata.create_height}
                    options={options}
                    totalVotes={totalVotes}
                    createdAtIso={item.created_at}
                    txHash={pollMetadata.hash}
                    contractAddress={pollMetadata.poll_address}
                    onOpen={() => handleItemClick(item.id)}
                  />
                );
              }
              
              // Regular post item
              return (
                <ReplyToFeedItem
                  key={item.id}
                  item={item}
                  commentCount={item.total_comments ?? 0}
                  allowInlineRepliesToggle={false}
                  onOpenPost={handleItemClick}
                />
              );
            })}
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
                    // Debug logs removed to reduce console spam - uncomment if needed for debugging
                    // if (process.env.NODE_ENV === 'development') {
                    //   console.log('🔍 [DEBUG] Load More Button CLICKED:', {
                    //     hasMorePopular,
                    //     fetchingMorePopular,
                    //     popularExhausted,
                    //     hasMoreLatestForHot,
                    //     fetchingMoreLatestForHot,
                    //     lastPageMeta: lastPage?.meta,
                    //     manualHasMore,
                    //     popularPagesCount: popularData?.pages?.length || 0,
                    //     latestPagesCount: latestDataForHot?.pages?.length || 0,
                    //     queryEnabledWithEnoughPosts,
                    //   });
                    // }
                    // If popular posts are exhausted or we don't have enough, fetch latest posts (prioritize this)
                    if ((popularExhausted || !hasEnoughPopularPosts) && queryEnabledWithEnoughPosts) {
                      // Only fetch if query is enabled, not currently fetching, and there are more pages
                      if (hasMoreLatestForHot && !fetchingMoreLatestForHot) {
                        // Debug log removed to reduce console spam
                        // if (process.env.NODE_ENV === 'development') {
                        //   console.log('🔍 [DEBUG] Load More Button - FETCHING latest posts');
                        // }
                        await fetchNextLatestForHot();
                      }
                      // Debug log removed to reduce console spam
                      // else if (process.env.NODE_ENV === 'development') {
                      //   console.log('🔍 [DEBUG] Load More Button - NOT fetching latest posts:', {
                      //     hasMoreLatestForHot,
                      //     fetchingMoreLatestForHot,
                      //     queryEnabledWithEnoughPosts,
                      //   });
                      // }
                    } else if (!popularExhausted && hasEnoughPopularPosts && (hasMorePopular || manualHasMore) && !fetchingMorePopular) {
                      // Try to fetch popular posts if there are more and we have enough already
                      // Debug log removed to reduce console spam
                      // if (process.env.NODE_ENV === 'development') {
                      //   console.log('🔍 [DEBUG] Load More Button - FETCHING popular posts');
                      // }
                      await fetchNextPopular();
                    }
                    // Debug log removed to reduce console spam
                    // else if (process.env.NODE_ENV === 'development') {
                    //   console.log('🔍 [DEBUG] Load More Button - NOT fetching:', {
                    //     popularExhausted,
                    //     hasEnoughPopularPosts,
                    //     queryEnabledWithEnoughPosts,
                    //     hasMorePopular,
                    //     manualHasMore,
                    //     fetchingMorePopular,
                    //     hasMoreLatestForHot,
                    //     fetchingMoreLatestForHot,
                    //   });
                    // }
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
    <Shell right={<RightRail hideTrends />} containerClassName="max-w-[1080px] mx-auto">
      {content}
    </Shell>
  ) : (
    content
  );
}

