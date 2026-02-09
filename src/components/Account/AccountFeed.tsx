import { PostsService } from '@/api/generated/services/PostsService';
import ReplyToFeedItem from '@/features/social/components/ReplyToFeedItem';
import TokenCreatedActivityItem from '@/features/social/components/TokenCreatedActivityItem';
import PostSkeleton from '@/features/social/components/PostSkeleton';
import { useNavigate } from 'react-router-dom';
import {
  useEffect, useMemo, useRef, useState, useCallback,
} from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SuperheroApi } from '@/api/backend';
import type { PostDto } from '@/api/generated';

interface AccountFeedProps {
  address: string;
  tab: string;
}

export default function AccountFeed({ address, tab }: AccountFeedProps) {
  const navigate = useNavigate();
  const ACTIVITY_PAGE_SIZE = 50;
  // Infinite activities for this profile (smaller initial batch)
  const {
    data: createdActivitiesPages,
    isLoading: aLoading,
    fetchNextPage: fetchNextActivities,
    hasNextPage: hasMoreActivities,
    isFetchingNextPage: fetchingMoreActivities,
  } = useInfiniteQuery<PostDto[], Error>({
    queryKey: ['profile-activities', address],
    enabled: !!address && tab === 'feed',
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const resp = await SuperheroApi.listTokens({
        creatorAddress: address,
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: ACTIVITY_PAGE_SIZE,
        page: pageParam as number,
      }).catch(() => ({ items: [] }));
      const items = (resp?.items || []).map(mapTokenCreatedToPost);
      return items;
    },
    getNextPageParam: (lastPage, pages) => (lastPage && lastPage.length === ACTIVITY_PAGE_SIZE ? pages.length + 1 : undefined),
    refetchOnMount: false, // Use cached data when switching tabs
    staleTime: 30_000, // Consider data fresh for 30 seconds
  });
  const createdActivities: PostDto[] = useMemo(
    () => (createdActivitiesPages?.pages ? (createdActivitiesPages.pages as PostDto[][]).flatMap((p) => p) : []),
    [createdActivitiesPages],
  );

  // Infinite posts for this profile
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['profile-posts', address],
    enabled: !!address && tab === 'feed',
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => PostsService.listAll({
      accountAddress: address,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 10,
      page: pageParam,
    }) as any,
    getNextPageParam: (lastPage: any) => {
      if (
        lastPage?.meta?.currentPage
        && lastPage?.meta?.totalPages
        && lastPage.meta.currentPage < lastPage.meta.totalPages
      ) {
        return lastPage.meta.currentPage + 1;
      }
      return undefined;
    },
    refetchOnMount: false, // Use cached data when switching tabs
    staleTime: 30_000, // Consider data fresh for 30 seconds
  });

  const list = useMemo(
    () => data?.pages?.flatMap((p: any) => p?.items ?? []) ?? [],
    [data],
  );

  // Combine posts with token-created events and sort by created_at DESC
  const combinedList = useMemo(() => {
    const merged: PostDto[] = [...createdActivities, ...list];
    return merged.sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });
  }, [createdActivities, list]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const initialLoading = aLoading || isLoading;
  useEffect(() => {
    if (tab !== 'feed' || initialLoading) return;
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
    }, { root: null, rootMargin: '800px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, initialLoading, hasNextPage, isFetchingNextPage, fetchNextPage, hasMoreActivities, fetchingMoreActivities, fetchNextActivities]);

  // Map Trendminer token -> Post-like activity item
  function mapTokenCreatedToPost(payload: any): PostDto {
    const saleAddress: string = payload?.sale_address || payload?.address || '';
    const name: string = payload?.token_name || payload?.name || 'Unknown';
    const createdAt: string = payload?.created_at || new Date().toISOString();
    const encodedName = encodeURIComponent(name);
    const id = `token-created:${encodedName}:${saleAddress}:${createdAt}_v3`;
    return {
      id,
      tx_hash: payload?.tx_hash || '',
      tx_args: [
        { token_name: name },
        { sale_address: saleAddress },
        { kind: 'token-created' },
      ],
      sender_address: payload?.creator_address || address || '',
      contract_address: saleAddress || '',
      type: 'TOKEN_CREATED',
      content: '',
      topics: ['token:created', `token_name:${name}`, `#${name}`].filter(Boolean) as string[],
      media: [],
      total_comments: 0,
      created_at: createdAt,
    } as PostDto;
  }

  // (no separate effect: activities are handled by the infinite query above)

  // Collapsible groups state keyed by first item id in the group (for token-created runs)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const renderItems = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < combinedList.length) {
      const item: any = combinedList[i];
      const postId = item.id;
      const isTokenCreated = String(postId).startsWith('token-created:');

      if (!isTokenCreated) {
        nodes.push(
          <ReplyToFeedItem
            key={postId}
            item={item}
            commentCount={item.total_comments ?? 0}
            allowInlineRepliesToggle={false}
            onOpenPost={(slugOrId: string) => navigate(`/post/${slugOrId.replace(/_v3$/, '')}`)}
          />,
        );
        i += 1;
        continue;
      }

      // Group consecutive token-created items
      const startIndex = i;
      const groupItems: PostDto[] = [];
      while (
        i < combinedList.length
        && String(combinedList[i].id).startsWith('token-created:')
      ) {
        groupItems.push(combinedList[i] as PostDto);
        i += 1;
      }

      const groupId = String(groupItems[0]?.id || `group-${startIndex}`);
      const collapsed = groupItems.length > 3 && !expandedGroups.has(groupId);
      const visibleCount = collapsed ? 3 : groupItems.length;
      const hasMultiple = visibleCount > 1;

      for (let j = 0; j < visibleCount; j += 1) {
        const gi = groupItems[j];
        const isLastVisible = j === visibleCount - 1;
        const isFirstVisible = j === 0;
        const isMiddle = j > 0 && !isLastVisible;
        const hideDivider = !isLastVisible; // only after last on mobile
        const mobileTight = isMiddle; // py-0.5
        const mobileNoTopPadding = false;
        const mobileNoBottomPadding = false;
        const mobileTightTop = hasMultiple && isLastVisible; // last pt-0.5
        const mobileTightBottom = hasMultiple && isFirstVisible; // first pb-0.5
        const footer = isLastVisible && groupItems.length > 3 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleGroup(groupId); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center text-[13px] px-2 py-1 bg-transparent border-0 text-white/80 hover:text-white outline-none focus:outline-none shadow-none ring-0 focus:ring-0 appearance-none [text-shadow:none]"
            style={{
              WebkitTapHighlightColor: 'transparent', filter: 'none', WebkitAppearance: 'none', background: 'transparent', boxShadow: 'none',
            }}
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
          />,
        );
      }

      // Desktop row for toggle
      if (groupItems.length > 3) {
        nodes.push(
          <div key={`${groupId}-toggle-expanded`} className="hidden md:block w-full px-2 md:px-0">
            <button
              type="button"
              onClick={() => toggleGroup(groupId)}
              className="w-full md:w-auto mx-auto flex items-center justify-center text-[13px] md:text-xs px-3 py-2 md:px-0 md:py-0 bg-transparent border-0 text-white/80 hover:text-white transition-colors outline-none focus:outline-none shadow-none ring-0 focus:ring-0 appearance-none [text-shadow:none]"
              style={{
                WebkitTapHighlightColor: 'transparent', filter: 'none', WebkitAppearance: 'none', background: 'transparent', boxShadow: 'none',
              }}
              aria-expanded={!collapsed}
            >
              {collapsed ? `Show ${groupItems.length - 3} more` : 'Show less'}
            </button>
          </div>,
        );
      }
    }
    return nodes;
  }, [combinedList, expandedGroups, navigate, toggleGroup]);

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-2 mb-8 md:mb-10">
        {initialLoading ? (
          // Show skeleton loaders while loading
          Array.from({ length: 3 }, (_, i) => <PostSkeleton key={`skeleton-${i}`} />)
        ) : (
          <>
            {renderItems}
            {(hasNextPage || hasMoreActivities) && <div ref={sentinelRef} className="h-10" />}
            {combinedList.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No posts yet</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
