import { useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SuperheroApi } from '../../../api/backend';
import type { PostDto } from '../../../api/generated';
import { SocialGraphConnectionsService } from '../../../api/socialGraphConnections';
import { socialGraphScope } from '../../../hooks/useSocialGraph';
import type { PostApiResponse } from '../types';

type Language = 'en' | 'zh' | 'ar' | 'ru';

const FOLLOWING_FEED_PAGE_SIZE = 10;

const followingFeedKey = (viewer?: string, language?: Language) => [
  'following-feed', ...socialGraphScope(), viewer, language,
];

/** Home "Following" feed: posts from accounts `viewer` follows, newest first. */
export function useFollowingFeed(
  viewer: string | undefined,
  language: Language | undefined,
  enabled: boolean,
) {
  const isEnabled = enabled && !!viewer?.startsWith('ak_');

  const feedQuery = useInfiniteQuery({
    queryKey: followingFeedKey(viewer, language),
    enabled: isEnabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => SuperheroApi.listPosts({
      followedBy: viewer,
      page: pageParam,
      limit: FOLLOWING_FEED_PAGE_SIZE,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      language,
    }) as unknown as Promise<PostApiResponse>,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta;
      return meta && meta.currentPage < meta.totalPages ? meta.currentPage + 1 : undefined;
    },
    staleTime: 10_000,
  });

  const items = useMemo<PostDto[]>(() => {
    // Pages are offset-based: a post landing between two loads repeats the row at the boundary.
    const seen = new Set<string>();
    return (feedQuery.data?.pages.flatMap((page) => page?.items || []) ?? []).filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [feedQuery.data]);
  const feedEmpty = feedQuery.isSuccess && items.length === 0;

  // Only an empty feed needs this, to tell "follows nobody" from "nobody posted".
  const followsAnyoneQuery = useQuery({
    queryKey: ['following-feed-follows-anyone', ...socialGraphScope(), viewer],
    enabled: isEnabled && feedEmpty,
    queryFn: async () => {
      const page = await SocialGraphConnectionsService.listSocialGraphFollowing({
        address: viewer!,
        limit: 1,
      });
      return (page?.items?.length ?? 0) > 0;
    },
    staleTime: 30_000,
  });

  return {
    items,
    followsNobody: followsAnyoneQuery.data === false,
    isLoading: isEnabled && (feedQuery.isPending || (feedEmpty && followsAnyoneQuery.isPending)),
    // A failed refresh leaves the loaded posts valid, and the next focus retries it.
    error: feedQuery.isRefetchError && items.length ? null : feedQuery.error,
    hasNextPage: feedQuery.hasNextPage,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
    refetch: feedQuery.refetch,
  };
}
