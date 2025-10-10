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
      PostsService.getComments({ id: `${String(id).replace(/_v3$/,'')}_v3`, orderDirection: 'DESC', page: pageParam, limit: 20 }) as any,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (meta?.currentPage && meta?.totalPages && meta.currentPage < meta.totalPages) return meta.currentPage + 1;
      return undefined;
    },
    initialPageParam: 1,
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

  if (isLoading) return <div className="text-center py-6 text-white/70">Loading replies…</div>;
  if (error) return (
    <div className="text-center py-6">
      <div className="text-white/70 mb-2">Error loading replies.</div>
      <button className="text-sm underline" onClick={() => refetch()}>Retry</button>
    </div>
  );

  if (!list.length) return <div className="text-center py-6 text-white/60">No replies yet.</div>;

  return (
    <div className="grid gap-3">
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


