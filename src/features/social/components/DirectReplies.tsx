import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostsService, PostDto } from '../../../api/generated';
import ReplyToFeedItem from './ReplyToFeedItem';

const DirectReplies = ({
  id,
  onOpenPost,
}: {
  id: string;
  onOpenPost: (postId: string) => void;
}) => {
  const { t } = useTranslation('social');
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
    queryFn: ({ pageParam = 1 }) => PostsService.getComments({
      id: `${String(id).replace(/_v3$/, '')}_v3`, orderDirection: 'ASC', page: pageParam, limit: 50,
    }) as any,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (meta?.currentPage && meta?.totalPages && meta.currentPage < meta.totalPages) return meta.currentPage + 1;
      return undefined;
    },
    initialPageParam: 1,
    // No websocket event for new replies: refresh while the tab is visible.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const list: PostDto[] = useMemo(
    () => data?.pages?.flatMap((p: any) => p?.items || []) || [],
    [data],
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return () => {};
    const el = sentinelRef.current;
    if (!el) return () => {};
    const observer = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { root: null, rootMargin: '600px 0px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-load a few pages so short threads show fully without scrolling. Every page
  // re-runs this effect, so the count lives in a ref; the poll refetches each loaded page.
  const autoLoadedPages = useRef(0);
  useEffect(() => { autoLoadedPages.current = 0; }, [id]);
  useEffect(() => {
    if (!data || !hasNextPage || isFetchingNextPage || autoLoadedPages.current >= 5) return;
    autoLoadedPages.current += 1;
    fetchNextPage();
  }, [data, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <div className="post-detail__state" role="status">{t('social:loadingReplies')}</div>;
  if (error) {
    return (
      <div className="post-detail__state" role="alert">
        <div className="post-detail__muted">{t('social:errorLoadingReplies')}</div>
        <button type="button" className="text-sm underline" onClick={() => refetch()}>{t('common:buttons.retry')}</button>
      </div>
    );
  }

  if (!list.length) return <p className="post-detail__empty">{t('postDetail.empty')}</p>;

  return (
    <div className="post-detail__replies">
      {list.map((reply) => (
        <ReplyToFeedItem
          key={reply.id}
          item={reply}
          commentCount={reply.total_comments ?? 0}
          hideParentContext
          allowInlineRepliesToggle={(reply.total_comments ?? 0) > 0}
          threadDepth={0}
          onOpenPost={(replyId) => onOpenPost(String(replyId).replace(/_v3$/, ''))}
        />
      ))}
      {hasNextPage && <div ref={sentinelRef} className="h-10" />}
    </div>
  );
};

export default DirectReplies;
