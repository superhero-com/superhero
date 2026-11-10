import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SuperheroApi } from '../../../api/backend';
import type { PostDto } from '../../../api/generated';
import type { PostApiResponse } from '../types';

export const TOPIC_POSTS_PAGE_SIZE = 100;

/** '#Tag' and 'tag' share one cache entry, like the API's topic lookup. */
export const topicPostsKey = (topic: string) => (
  ['topic-posts', String(topic || '').replace(/^#/, '').toLowerCase()] as const
);

/** Posts tagged with exactly this topic, newest first. */
export function useTopicPosts(topic: string) {
  const queryKey = topicPostsKey(topic);
  const name = queryKey[1];

  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(name),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => SuperheroApi.listPosts({
      topic: name,
      page: pageParam,
      limit: TOPIC_POSTS_PAGE_SIZE,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    }) as unknown as Promise<PostApiResponse>,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta;
      return meta && meta.currentPage < meta.totalPages ? meta.currentPage + 1 : undefined;
    },
    refetchInterval: 120 * 1000,
  });

  const items = useMemo<PostDto[]>(() => {
    // Offset pages: a post landing between two loads repeats at the boundary.
    const seen = new Set<string>();
    return (query.data?.pages.flatMap((page) => page?.items || []) ?? []).filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [query.data]);

  return {
    items,
    pageCount: query.data?.pages.length ?? 0,
    totalItems: query.data?.pages[0]?.meta?.totalItems,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    // A failed later page or refresh leaves the loaded posts valid.
    error: items.length ? null : query.error,
    hasNextPage: query.hasNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
