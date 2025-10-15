import { PostsService } from "@/api/generated/services/PostsService";
import ReplyToFeedItem from "@/features/social/components/ReplyToFeedItem";
import TokenCreatedActivityItem from "@/features/social/components/TokenCreatedActivityItem";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TrendminerApi } from "@/api/backend";
import type { PostDto } from "@/api/generated";

interface AccountFeedProps {
  address: string;
  tab: string;
}

export default function AccountFeed({ address, tab }: AccountFeedProps) {
  const navigate = useNavigate();
  const [createdActivities, setCreatedActivities] = useState<PostDto[]>([]);

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
  useEffect(() => {
    if (tab !== "feed") return;
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
  }, [tab, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  // Load user's created trends as activity items for profile feed
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address || tab !== "feed") return;
      try {
        const resp = await TrendminerApi.listTokens({
          creatorAddress: address,
          orderBy: "created_at",
          orderDirection: "DESC",
          limit: 20,
        }).catch(() => ({ items: [] }));
        if (cancelled) return;
        const items = (resp?.items || []).map(mapTokenCreatedToPost);
        setCreatedActivities(items);
      } catch {
        if (!cancelled) setCreatedActivities([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [address, tab]);

  return (
    <div className="w-full">
      {createdActivities.length > 0 && (
        <div className="flex flex-col gap-2 mb-0 md:mb-2">
          {createdActivities.map((it) => (
            <TokenCreatedActivityItem key={it.id} item={it} />
          ))}
        </div>
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
