import { PostsService } from "@/api/generated/services/PostsService";
import ReplyToFeedItem from "@/features/social/components/ReplyToFeedItem";
import TokenCreatedActivityItem from "@/features/social/components/TokenCreatedActivityItem";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TrendminerApi } from "@/api/backend";
import type { PostDto } from "@/api/generated";

interface AccountFeedProps {
  address: string;
  tab: string;
}

export default function AccountFeed({ address, tab }: AccountFeedProps) {
  const navigate = useNavigate();
  // Infinite activities for this profile (smaller initial batch)
  const {
    data: createdActivitiesPages,
    isLoading: aLoading,
    fetchNextPage: fetchNextActivities,
    hasNextPage: hasMoreActivities,
    isFetchingNextPage: fetchingMoreActivities,
  } = useInfiniteQuery<PostDto[], Error>({
    queryKey: ["profile-activities", address],
    enabled: !!address && tab === "feed",
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const resp = await TrendminerApi.listTokens({
        creatorAddress: address,
        orderBy: "created_at",
        orderDirection: "DESC",
        limit: 20,
        page: pageParam as number,
      }).catch(() => ({ items: [] }));
      const items = (resp?.items || []).map(mapTokenCreatedToPost);
      return items;
    },
    getNextPageParam: (lastPage, pages) => (lastPage && lastPage.length === 20 ? pages.length + 1 : undefined),
  });
  const createdActivities: PostDto[] = useMemo(
    () => (createdActivitiesPages?.pages ? (createdActivitiesPages.pages as PostDto[][]).flatMap((p) => p) : []),
    [createdActivitiesPages]
  );

  // Infinite posts for this profile
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["profile-posts", address],
    enabled: !!address && tab === "feed",
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      PostsService.listAll({
        accountAddress: address,
        orderBy: "created_at",
        orderDirection: "DESC",
        limit: 10,
        page: pageParam,
      }) as any,
    getNextPageParam: (lastPage: any) => {
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

  const list = useMemo(
    () => data?.pages?.flatMap((p: any) => p?.items ?? []) ?? [],
    [data]
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const initialLoading = aLoading || isLoading;
  useEffect(() => {
    if (tab !== "feed" || initialLoading) return;
    if (!('IntersectionObserver' in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || fetchingRef.current) return;
      fetchingRef.current = true;
      const tasks: Promise<any>[] = [];
      if (hasNextPage && !isFetchingNextPage) tasks.push(fetchNextPage());
      if (hasMoreActivities && !fetchingMoreActivities) tasks.push(fetchNextActivities());
      Promise.all(tasks).finally(() => {
        fetchingRef.current = false;
      });
    }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, initialLoading, hasNextPage, isFetchingNextPage, fetchNextPage, hasMoreActivities, fetchingMoreActivities, fetchNextActivities]);

  // Map Trendminer token -> Post-like activity item
  function mapTokenCreatedToPost(payload: any): PostDto {
    const saleAddress: string = payload?.sale_address || payload?.address || "";
    const name: string = payload?.token_name || payload?.name || "Unknown";
    const createdAt: string = payload?.created_at || new Date().toISOString();
    const encodedName = encodeURIComponent(name);
    const id = `token-created:${encodedName}:${saleAddress}:${createdAt}_v3`;
    return {
      id,
      tx_hash: payload?.tx_hash || "",
      tx_args: [
        { token_name: name },
        { sale_address: saleAddress },
        { kind: "token-created" },
      ],
      sender_address: payload?.creator_address || address || "",
      contract_address: saleAddress || "",
      type: "TOKEN_CREATED",
      content: "",
      topics: ["token:created", `token_name:${name}`, `#${name}`].filter(Boolean) as string[],
      media: [],
      total_comments: 0,
      created_at: createdAt,
    } as PostDto;
  }

  // (no separate effect: activities are handled by the infinite query above)

  return (
    <div className="w-full">
      {createdActivities.length > 0 && (
        <ActivitiesWithCollapse items={createdActivities} />
      )}
      <div className="w-full flex flex-col gap-2 mb-8 md:mb-10">
        {list.map((item: any) => (
          <ReplyToFeedItem
            key={item.id}
            item={item}
            commentCount={item.total_comments ?? 0}
            allowInlineRepliesToggle={false}
            onOpenPost={(id: string) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)}
          />
        ))}
        {hasNextPage && <div ref={sentinelRef} className="h-10" />}
        {!isLoading && list.length === 0 && createdActivities.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No posts yet</div>
        )}
      </div>
    </div>
  );
}

function ActivitiesWithCollapse({ items }: { items: PostDto[] }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const visible = expanded ? items : items.slice(0, 3);
  const showToggle = items.length > 3;
  return (
    <div className="flex flex-col gap-2 mb-0 md:mb-2">
      {visible.map((it, idx) => {
        const isLast = idx === visible.length - 1;
        const hideDivider = !expanded ? !isLast : false; // hide middle lines on mobile when collapsed
        const mobileTight = !expanded && !isLast && idx > 0;
        const footer = !expanded && isLast && showToggle ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center text-[13px] px-2 py-1 bg-transparent border-0 text-white/80 hover:text-white"
            aria-expanded={expanded}
          >
            {`Show ${items.length - 3} more`}
          </button>
        ) : undefined;
        return (
          <TokenCreatedActivityItem
            key={it.id}
            item={it}
            hideMobileDivider={hideDivider}
            mobileTight={mobileTight}
            footer={footer}
          />
        );
      })}
      {showToggle && (
        (
          <div className="hidden md:block w-full px-2 md:px-0">
            <button
              type="button"
              onClick={toggle}
              className="w-full md:w-auto mx-auto flex items-center justify-center text-[13px] md:text-sm px-3 py-2 md:px-0 md:py-0 bg-transparent border-0 text-white/80 hover:text-white transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? 'Show less' : `Show ${items.length - 3} more`}
            </button>
          </div>
        )
      )}
    </div>
  );
}
