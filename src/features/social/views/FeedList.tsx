import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { PostsService } from "../../../api/generated";
import type { PostDto } from "../../../api/generated";
import { TrendminerApi } from "../../../api/backend";
import WebSocketClient from "../../../libs/WebSocketClient";
import AeButton from "../../../components/AeButton";
import WelcomeBanner from "../../../components/WelcomeBanner";
import Shell from "../../../components/layout/Shell";
import RightRail from "../../../components/layout/RightRail";
import { useWallet } from "../../../hooks";
import CreatePost from "../components/CreatePost";
import SortControls from "../components/SortControls";
import EmptyState from "../components/EmptyState";
import ReplyToFeedItem from "../components/ReplyToFeedItem";
import TokenCreatedFeedItem from "../components/TokenCreatedFeedItem";
import TokenCreatedActivityItem from "../components/TokenCreatedActivityItem";
import { PostApiResponse } from "../types";

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

  // Comment counts are now provided directly by the API in post.total_comments

  // URL parameters
  const sortBy = urlQuery.get("sortBy") || "latest";
  const search = urlQuery.get("search") || "";
  const filterBy = urlQuery.get("filterBy") || "all";

  const [localSearch, setLocalSearch] = useState(search);

  // Token-created events mapped into Post-like items
  const [tokenEvents, setTokenEvents] = useState<PostDto[]>([]);

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

  // Initial fetch of recent token-created events
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const resp = await TrendminerApi.listTokens({
          orderBy: "created_at",
          orderDirection: "DESC",
          limit: 50,
        }).catch(() => ({ items: [] }));
        if (cancelled) return;
        const items: any[] = resp?.items || [];
        const mapped = items
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
        setTokenEvents(mapped);
      } catch {
        if (!cancelled) setTokenEvents([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mapTokenCreatedToPost]);

  // Live updates for token-created via websocket
  useEffect(() => {
    const unsubscribe = WebSocketClient.subscribeToNewTokenSales((payload: any) => {
      setTokenEvents((prev) => {
        const mapped = mapTokenCreatedToPost(payload);
        // avoid duplicates by id
        if (prev.some((p) => p.id === mapped.id)) return prev;
        return [mapped, ...prev].slice(0, 100);
      });
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [mapTokenCreatedToPost]);

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
    () => data?.pages?.flatMap((page) => page?.items ?? []) ?? [],
    [data]
  );

  // Combine posts with token-created events and sort by created_at DESC
  const combinedList = useMemo(() => {
    // Hide token-created events on the popular (hot) tab
    const includeEvents = sortBy !== "hot";
    const merged = includeEvents ? [...tokenEvents, ...list] : [...list];
    return merged.sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });
  }, [list, tokenEvents, sortBy]);

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
      navigate(`/?sortBy=${newSortBy}`);
    },
    [navigate]
  );

  const handleItemClick = useCallback(
    (postId: string) => {
      // Save current feed scroll position before leaving
      try {
        sessionStorage.setItem("feedScrollY", String(window.scrollY || 0));
      } catch {}
      const idStr = String(postId);
      if (idStr.startsWith("token-created:")) {
        const parts = idStr.replace(/_v3$/, "").split(":");
        const tokenNameEnc = parts[1] || "";
        const tokenName = decodeURIComponent(tokenNameEnc);
        navigate(`/trends/tokens/${tokenName}`);
        return;
      }
      const cleanId = idStr.replace(/_v3$/, "");
      navigate(`/post/${cleanId}`);
    },
    [navigate]
  );

  // Render helpers
  const renderEmptyState = () => {
    if (error) {
      return <EmptyState type="error" error={error} onRetry={refetch} />;
    }
    if (!error && filteredAndSortedList.length === 0 && !isLoading) {
      return <EmptyState type="empty" hasSearch={!!localSearch} />;
    }
    if (isLoading && filteredAndSortedList.length === 0) {
      return <EmptyState type="loading" />;
    }
    return null;
  };

  // Memoized render function for better performance
  const renderFeedItems = useMemo(() => {
    return filteredAndSortedList.map((item) => {
      const postId = item.id;
      const isTokenCreated = String(postId).startsWith("token-created:");
      if (isTokenCreated) {
        return (
          <TokenCreatedActivityItem
            key={postId}
            item={item}
          />
        );
      }
      return (
        <ReplyToFeedItem
          key={postId}
          item={item}
          commentCount={item.total_comments ?? 0}
          allowInlineRepliesToggle={false}
          onOpenPost={handleItemClick}
        />
      );
    });
  }, [filteredAndSortedList, handleItemClick]);

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
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { root: null, rootMargin: '600px 0px', threshold: 0 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const content = (
    <div className="w-full">
      {!standalone && (
        <div className="mb-3 md:mb-4">
          <WelcomeBanner />
        </div>
      )}
      {/* Mobile: CreatePost first, then SortControls */}
      <div className="md:hidden">
        <CreatePost onSuccess={refetch} />
        <SortControls
          sortBy={sortBy}
          onSortChange={handleSortChange}
          className="sticky top-0 z-10 w-full"
        />
      </div>

      {/* Desktop: CreatePost first, then SortControls */}
      <div className="hidden md:block">
        <CreatePost onSuccess={refetch} />
        <SortControls sortBy={sortBy} onSortChange={handleSortChange} />
      </div>

      <div className="w-full flex flex-col gap-0 md:gap-2 md:mx-0">
        {renderEmptyState()}
        {renderFeedItems}
      </div>

      {hasNextPage && filteredAndSortedList.length > 0 && (
        <>
          {/* Desktop: explicit load more button */}
          <div className="hidden md:block p-4 md:p-6 text-center">
            <AeButton
              loading={isFetchingNextPage}
              onClick={() => fetchNextPage()}
              className="bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-cubic-bezier hover:from-white/15 hover:to-white/10 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            >
              Load more
            </AeButton>
          </div>
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
