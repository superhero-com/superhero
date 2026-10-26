import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SuperheroApi } from '../../../api/backend';
import type { PostDto } from '../../../api/generated';
import { SocialGraphConnectionsService } from '../../../api/socialGraphConnections';
import { socialGraphScope } from '../../../hooks/useSocialGraph';
import type { PostApiResponse } from '../types';
import {
  FOLLOWING_FEED_MAX_ACCOUNTS,
  FOLLOWING_FEED_PAGE_SIZE,
  createFollowingFeedState,
  takeFollowingFeedPage,
  type FollowingFeedPage,
  type FollowingFeedState,
} from '../utils/followingFeed';

type Language = 'en' | 'zh' | 'ar' | 'ru';

const FOLLOWING_LIST_PAGE_SIZE = 100;

/** Every account `address` follows, paged through `next_cursor` up to the merge cap. */
export async function fetchAllFollowing(address: string, max = FOLLOWING_FEED_MAX_ACCOUNTS) {
  const addresses: string[] = [];
  let cursor: string | undefined;
  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await SocialGraphConnectionsService.listSocialGraphFollowing({
      address,
      cursor,
      limit: Math.min(FOLLOWING_LIST_PAGE_SIZE, max - addresses.length),
    });
    (page?.items || []).forEach((item) => {
      if (item?.address && !addresses.includes(item.address)) addresses.push(item.address);
    });
    cursor = page?.next_cursor || undefined;
  } while (cursor && addresses.length < max);
  return addresses.slice(0, max);
}

export const followingFeedKey = (viewer?: string, language?: Language) => [
  'following-feed', ...socialGraphScope(), viewer, language,
];

/**
 * Home "Following" feed: posts from accounts `viewer` follows, newest first.
 * Merged client-side because the posts API filters a single account per request.
 */
export function useFollowingFeed(
  viewer: string | undefined,
  language: Language | undefined,
  enabled: boolean,
) {
  const isEnabled = enabled && !!viewer?.startsWith('ak_');

  const followingQuery = useQuery({
    queryKey: ['following-feed-accounts', ...socialGraphScope(), viewer],
    enabled: isEnabled,
    queryFn: () => fetchAllFollowing(viewer!),
    staleTime: 30_000,
  });
  const following = followingQuery.data;

  const feedQuery = useInfiniteQuery<
    FollowingFeedPage<PostDto>,
    Error,
    { pages: FollowingFeedPage<PostDto>[] },
    unknown[],
    FollowingFeedState<PostDto> | null
  >({
    queryKey: [...followingFeedKey(viewer, language), following],
    enabled: isEnabled && !!following && following.length > 0,
    initialPageParam: null,
    queryFn: ({ pageParam }) => takeFollowingFeedPage<PostDto>(
      pageParam ?? createFollowingFeedState<PostDto>(following || []),
      async (accountAddress, page) => {
        const res = await SuperheroApi.listPosts({
          accountAddress,
          page,
          limit: FOLLOWING_FEED_PAGE_SIZE,
          orderBy: 'created_at',
          orderDirection: 'DESC',
          language,
        }) as unknown as PostApiResponse;
        const meta = res?.meta;
        return {
          items: res?.items || [],
          hasMore: !!meta && meta.currentPage < meta.totalPages,
        };
      },
    ),
    getNextPageParam: (lastPage) => lastPage.nextState,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const items: PostDto[] = feedQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const followsNobody = followingQuery.isSuccess && (following?.length ?? 0) === 0;

  return {
    items,
    followsNobody,
    isLoading: isEnabled && (followingQuery.isPending || (!followsNobody && feedQuery.isPending)),
    error: (followingQuery.error as Error | null) || feedQuery.error,
    hasNextPage: !!feedQuery.hasNextPage,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
    refetch: async () => {
      await followingQuery.refetch();
      return feedQuery.refetch();
    },
    hasData: (feedQuery.data?.pages.length ?? 0) > 0,
  };
}
