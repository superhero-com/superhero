import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { AnyFeedPlugin, FeedEntry } from './types';

// Call each plugin.fetchPage in parallel (if provided) and merge results by createdAt
export function usePluginEntries(plugins: AnyFeedPlugin[], enabled: boolean) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed-plugins', plugins.map((p) => p.kind)],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const pages = await Promise.all(
        plugins.map(async (p) => {
          if (!p.fetchPage) return { entries: [], nextPage: undefined };
          try {
            return await p.fetchPage(pageParam as number);
          } catch {
            return { entries: [], nextPage: undefined };
          }
        })
      );
      const entries = pages.flatMap((pg) => pg.entries);
      const nextPage = pages.some((pg) => pg.nextPage != null) ? (pageParam as number) + 1 : undefined;
      return { entries, nextPage } as { entries: FeedEntry[]; nextPage?: number };
    },
    getNextPageParam: (last) => last?.nextPage,
  });

  const merged = useMemo(() => {
    const entries = data?.pages ? data.pages.flatMap((p) => p.entries) : [];
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  return { entries: merged, fetchNextPage, hasNextPage, isFetchingNextPage };
}


