import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { PostsService } from "../../../api/generated";
import type { PostDto } from "../../../api/generated";
import { TrendminerApi } from "../../../api/backend";
import WebSocketClient from "../../../libs/WebSocketClient";
import AeButton from "../../../components/AeButton";
import HeroBannerCarousel from "../../../components/hero-banner/HeroBannerCarousel";
import Shell from "../../../components/layout/Shell";
import RightRail from "../../../components/layout/RightRail";
import { useWallet } from "../../../hooks";
import CreatePost, { CreatePostRef } from "../components/CreatePost";
import SortControls from "../components/SortControls";
import EmptyState from "../components/EmptyState";
import ReplyToFeedItem from "../components/ReplyToFeedItem";
import TokenCreatedFeedItem from "../components/TokenCreatedFeedItem";
import TokenCreatedActivityItem from "../components/TokenCreatedActivityItem";
import { PostApiResponse } from "../types";
import Head from "../../../seo/Head";

// Custom hook
function useUrlQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FeedList({
  standalone = true,
}: { standalone?: boolean } = {}) {
  const navigate = useNavigate();
  const urlQuery = useUrlQuery();
  const { chainNames } = useWallet();
  const queryClient = useQueryClient();
  const ACTIVITY_PAGE_SIZE = 50;
  const createPostRef = useRef<CreatePostRef>(null);

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

  // URL parameters
  const sortBy = urlQuery.get("sortBy") || "latest";
  const search = urlQuery.get("search") || "";
  const filterBy = urlQuery.get("filterBy") || "all";
  const shouldAutoFocusPost = urlQuery.get("post") === "new";

  const [localSearch, setLocalSearch] = useState(search);

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
  } = useInfiniteQuery<PostDto[], Error>({
    queryKey: ["home-activities"],
    enabled: sortBy !== "hot",
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const resp = await TrendminerApi.listTokens({
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
  });
  const activityList: PostDto[] = useMemo(
    () => (activitiesPages?.pages ? (activitiesPages.pages as PostDto[][]).flatMap((p) => p) : []),
    [activitiesPages]
  );

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
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["posts", { limit: 10, sortBy, search, filterBy }],
    queryFn: ({ pageParam = 1 }) =>
      PostsService.listAll({
        limit: 10,
        page: pageParam,
        orderBy:
          sortBy === "latest"
            ? "created_at"
            : sortBy === "hot"
            ? "total_comments"
            : "created_at",
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
  });

  // Derived state: posts list
  const list = useMemo(
    () => (data?.pages ? (data.pages as any[]).flatMap((page: any) => page?.items ?? []) : []),
    [data]
  );

  // Combine posts with token-created events and sort by created_at DESC
  const combinedList = useMemo(() => {
    // Hide token-created events on the popular (hot) tab
    const includeEvents = sortBy !== "hot";
    const merged = includeEvents ? [...activityList, ...list] : [...list];
    // Keep backend order for 'hot'; only sort by time when we interleave activities
    if (!includeEvents) return merged;
    return merged.sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });
  }, [list, activityList, sortBy]);

  // Memoized filtered list
  const filteredAndSortedList = useMemo(() => {
    let filtered = [...combinedList];

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
      // Clear cached pages to avoid showing stale lists during rapid tab switches
      queryClient.removeQueries({ queryKey: ["posts"], exact: false });
      queryClient.removeQueries({ queryKey: ["home-activities"], exact: false });
      navigate(`/?sortBy=${newSortBy}`);
    },
    [navigate, queryClient]
  );

  const handleItemClick = useCallback(
    (postId: string) => {
      const idStr = String(postId);
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
      const cleanId = idStr.replace(/_v3$/, "");
      navigate(`/post/${cleanId}`);
    },
    [navigate]
  );

  // Render helpers
  const renderEmptyState = () => {
    const initialLoading = (sortBy !== "hot" && activitiesLoading) || isLoading;
    if (error) {
      return <EmptyState type="error" error={error} onRetry={refetch} />;
    }
    if (!error && filteredAndSortedList.length === 0 && !initialLoading) {
      return <EmptyState type="empty" hasSearch={!!localSearch} />;
    }
    if (initialLoading && filteredAndSortedList.length === 0) {
      return <EmptyState type="loading" />;
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

      if (!isTokenCreated) {
        nodes.push(
          <ReplyToFeedItem
            key={postId}
            item={item}
            commentCount={item.total_comments ?? 0}
            allowInlineRepliesToggle={false}
            onOpenPost={handleItemClick}
          />
        );
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
  const initialLoading = (sortBy !== "hot" && activitiesLoading) || isLoading;
  const [showLoadMore, setShowLoadMore] = useState(false);
  useEffect(() => { setShowLoadMore(false); }, [sortBy]);
  useEffect(() => {
    if (initialLoading) return;
    if (!('IntersectionObserver' in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || fetchingRef.current) return;
      setShowLoadMore(true);
      fetchingRef.current = true;
      const tasks: Promise<any>[] = [];
      if (hasNextPage && !isFetchingNextPage) tasks.push(fetchNextPage());
      if (sortBy !== "hot" && hasMoreActivities && !fetchingMoreActivities) tasks.push(fetchNextActivities());
      Promise.all(tasks).finally(() => {
        fetchingRef.current = false;
      });
    }, { root: null, rootMargin: '800px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialLoading, hasNextPage, isFetchingNextPage, fetchNextPage, sortBy, hasMoreActivities, fetchingMoreActivities, fetchNextActivities]);

  const content = (
    <div className="w-full">
      <Head
        title="Superhero.com – The All‑in‑One Social + Crypto App"
        description="Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network."
        canonicalPath="/"
      />
      {!standalone && !isBannerDismissed && (
        <div className="mb-3 md:mb-4">
          <HeroBannerCarousel 
            onStartPosting={() => createPostRef.current?.focus()} 
          />
        </div>
      )}
      {/* Single CreatePost instance for consistent focus/scroll across viewports */}
      <div>
        <CreatePost ref={createPostRef} onSuccess={refetch} autoFocus={shouldAutoFocusPost} />
        {/* Sort controls rendered once; styles adapt per breakpoint */}
        <div className="md:hidden">
          <SortControls
            sortBy={sortBy}
            onSortChange={handleSortChange}
            className="sticky top-0 z-10 w-full"
          />
        </div>
        <div className="hidden md:block">
          <SortControls sortBy={sortBy} onSortChange={handleSortChange} />
        </div>
      </div>

      <div className="w-full flex flex-col gap-0 md:gap-2 md:mx-0">
        {renderEmptyState()}
        {((sortBy !== "hot" && !activitiesLoading) || sortBy === "hot") && !isLoading && renderFeedItems}
      </div>

      {!initialLoading && hasNextPage && filteredAndSortedList.length > 0 && (
        <>
          {/* Desktop: explicit load more button */}
          {showLoadMore && (
            <div className="hidden md:block p-4 md:p-6 text-center">
              <AeButton
                loading={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-cubic-bezier hover:from-white/15 hover:to-white/10 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
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
