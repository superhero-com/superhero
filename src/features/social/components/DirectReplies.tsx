import React, { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostsService, PostDto } from '../../../api/generated';
import ReplyToFeedItem from './ReplyToFeedItem';

export default function DirectReplies({
  id,
  onOpenPost,
}: {
  id: string;
  onOpenPost: (postId: string) => void;
}) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['post-comments', id, 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      PostsService.getComments({ id: `${String(id).replace(/_v3$/,'')}_v3`, orderDirection: 'ASC', page: pageParam, limit: 50 }) as any,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (meta?.currentPage && meta?.totalPages && meta.currentPage < meta.totalPages) return meta.currentPage + 1;
      return undefined;
    },
    initialPageParam: 1,
    refetchOnWindowFocus: true, // Refresh comments when user returns to tab (new comments may have been added)
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });

  const list: PostDto[] = useMemo(
    () => data?.pages?.flatMap((p: any) => p?.items || []) || [],
    [data]
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { root: null, rootMargin: '600px 0px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-drain a few pages so short threads show fully without scrolling
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const maxAutoPages = 5;
    async function drain() {
      let steps = 0;
      while (!cancelled && hasNextPage && !isFetchingNextPage && steps < maxAutoPages) {
        steps += 1;
        await fetchNextPage();
      }
    }
    if (hasNextPage && !isFetchingNextPage) {
      drain();
    }
    return () => { cancelled = true; };
  }, [data, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <div className="text-center py-6 text-white/70">Loading replies…</div>;
  if (error) return (
    <div className="text-center py-6">
      <div className="text-white/70 mb-2">Error loading replies.</div>
      <button className="text-sm underline" onClick={() => refetch()}>Retry</button>
    </div>
  );

  // If empty, do not render placeholder; the comment form below will be shown by the page

  return (
    <div className="grid gap-0 md:gap-3">
      {list.map((reply) => (
        <ReplyToFeedItem
          key={reply.id}
          item={reply}
          commentCount={reply.total_comments ?? 0}
          hideParentContext
          allowInlineRepliesToggle={false}
          onOpenPost={(id) => onOpenPost(String(id).replace(/_v3$/,''))}
        />
      ))}
      {hasNextPage && <div ref={sentinelRef} className="h-10" />}
    </div>
  );
}


