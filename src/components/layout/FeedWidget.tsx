import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostsService } from '@/api/generated';
import { SuperheroApi } from '@/api/backend';
import type { PostDto } from '@/api/generated';
import { useWallet } from '@/hooks';
import SortControls from '@/features/social/components/SortControls';
import PostSkeleton from '@/features/social/components/PostSkeleton';
import ReplyToFeedItem from '@/features/social/components/ReplyToFeedItem';
import TokenCreatedFeedItem from '@/features/social/components/TokenCreatedFeedItem';
import TokenCreatedActivityItem from '@/features/social/components/TokenCreatedActivityItem';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { PostApiResponse } from '@/features/social/types';

function useUrlQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FeedWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlQuery = useUrlQuery();
  const { chainNames } = useWallet();
  const ACTIVITY_PAGE_SIZE = 50;
  const sortByRef = useRef<string>('hot');

  const sortBy = (urlQuery.get('sortBy') as 'hot' | 'latest') || 'hot';
  const popularWindow = (urlQuery.get('window') as '24h' | '7d' | '30d' | 'all') || '24h';
  
  // Ensure sortByRef is synced
  useEffect(() => {
    sortByRef.current = sortBy;
  }, [sortBy]);

  const handleSortChange = useCallback((newSort: 'hot' | 'latest') => {
    const params = new URLSearchParams(location.search);
    params.set('sortBy', newSort);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    sortByRef.current = newSort;
  }, [location.pathname, location.search, navigate]);

  const handlePopularWindowChange = useCallback((window: '24h' | '7d' | '30d' | 'all') => {
    const params = new URLSearchParams(location.search);
    params.set('window', window);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [location.pathname, navigate]);

  const { data: popularData, isFetching: popularLoading, refetch: refetchPopular } = useInfiniteQuery({
    queryKey: ['posts-popular-widget', popularWindow],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await SuperheroApi.listPopularPosts({
        window: popularWindow,
        page: pageParam as number,
        limit: ACTIVITY_PAGE_SIZE,
      });
      return response as PostApiResponse;
    },
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta?.currentPage || !meta?.totalPages) return undefined;
      return meta.currentPage < meta.totalPages ? meta.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: sortBy === 'hot',
  });

  const { data: latestData, isFetching: latestLoading, refetch: refetchLatest } = useInfiniteQuery({
    queryKey: ['posts-latest-widget'],
    queryFn: ({ pageParam = 1 }) =>
      PostsService.listAll({
        limit: ACTIVITY_PAGE_SIZE,
        page: pageParam,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      }) as Promise<{ items: PostDto[]; meta: any }>,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta?.currentPage || !meta?.totalPages) return undefined;
      return meta.currentPage < meta.totalPages ? meta.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: sortBy === 'latest',
  });

  const currentData = sortBy === 'hot' ? popularData : latestData;
  const isLoading = sortBy === 'hot' ? popularLoading : latestLoading;

  const allPosts = useMemo(() => {
    if (!currentData?.pages) return [];
    const posts = currentData.pages.flatMap((page: any) => {
      // Handle both response formats: { items: [] } or direct array
      if (Array.isArray(page)) return page;
      if (page?.items && Array.isArray(page.items)) return page.items;
      return [];
    });
    return posts;
  }, [currentData]);

  const handleOpenPost = useCallback((postId: string) => {
    navigate(`/post/${postId}`);
  }, [navigate]);

  return (
    <div className="h-fit min-w-0">
      <GlassSurface className="mb-4" interactive={false}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <h3 className="text-base font-bold text-white">Feed</h3>
          </div>
          <a 
            href="/" 
            className="text-xs text-white/40 hover:text-white transition-colors"
            title="Open in full screen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </GlassSurface>

      {/* Sort Controls */}
      <div className="mb-4">
        <SortControls
          sortBy={sortBy}
          onSortChange={handleSortChange}
          popularWindow={popularWindow}
          onPopularWindowChange={handlePopularWindowChange}
          popularFeedEnabled={true}
        />
      </div>

      {/* Feed Posts */}
      <div className="space-y-2">
        {isLoading && !allPosts.length && (
          <>
            {[...Array(3)].map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </>
        )}

        {allPosts.slice(0, 10).map((item: PostDto) => {
          const isTokenCreated = item.id?.toString().startsWith('token-created:');
          
          if (isTokenCreated) {
            return (
              <TokenCreatedActivityItem
                key={item.id}
                item={item}
                hideMobileDivider={false}
              />
            );
          }

          return (
            <ReplyToFeedItem
              key={item.id}
              item={item}
              onOpenPost={handleOpenPost}
              commentCount={item.total_comments ?? 0}
              compact={true}
            />
          );
        })}

        {!isLoading && allPosts.length === 0 && (
          <GlassSurface className="p-6 text-center">
            <p className="text-white/60">No posts yet</p>
          </GlassSurface>
        )}

        {allPosts.length > 0 && (
          <div className="text-center pt-2">
            <a
              href="/"
              className="text-sm text-[var(--neon-teal)] hover:underline"
            >
              View all posts →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
