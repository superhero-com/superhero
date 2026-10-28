import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuperheroApi } from '../../../api/backend';

type PostLike = { id?: string | number | null; created_at?: string | null };
type PostLanguage = 'en' | 'zh' | 'ar' | 'ru';

export const NEW_POSTS_POLL_MS = 25_000;
const POLL_LIMIT = 10;

const toTime = (value?: string | null) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

export const newestPostTime = (posts: readonly PostLike[]) => posts
  .reduce((max, post) => Math.max(max, toTime(post?.created_at)), 0);

/**
 * Posts from the newest page that are newer than everything already seen and
 * not yet rendered in the feed.
 */
export function countNewPosts(
  polled: readonly PostLike[],
  knownIds: ReadonlySet<string>,
  sinceTime: number,
): number {
  const seen = new Set<string>();
  return polled.filter((post) => {
    const id = String(post?.id ?? '');
    if (!id || seen.has(id) || knownIds.has(id)) return false;
    seen.add(id);
    return toTime(post?.created_at) > sinceTime;
  }).length;
}

/**
 * The backend has no websocket event for new posts, so poll the newest page
 * while the tab is visible and report how many posts are newer than the feed.
 */
export function useNewPostsWatcher({
  enabled,
  language,
  knownPosts,
  intervalMs = NEW_POSTS_POLL_MS,
}: {
  enabled: boolean;
  language?: PostLanguage;
  knownPosts: readonly PostLike[];
  intervalMs?: number;
}) {
  const { data } = useQuery({
    queryKey: ['posts-new-watch', { language }],
    enabled,
    queryFn: async () => {
      const response = await SuperheroApi.listPosts({
        limit: POLL_LIMIT,
        page: 1,
        orderBy: 'created_at',
        orderDirection: 'DESC',
        language,
      }) as { items?: PostLike[] } | undefined;
      return response?.items ?? [];
    },
    refetchInterval: intervalMs,
    // react-query pauses the interval while document.visibilityState is hidden
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: intervalMs / 2,
  });

  // Newest timestamp already acknowledged: set from the first poll, and moved
  // forward when the user loads the new posts.
  const [baseline, setBaseline] = useState<number | null>(null);
  useEffect(() => { setBaseline(null); }, [language]);
  useEffect(() => {
    if (baseline === null && data) setBaseline(newestPostTime(data));
  }, [baseline, data]);

  const knownIds = useMemo(
    () => new Set(knownPosts.map((post) => String(post?.id ?? '')).filter(Boolean)),
    [knownPosts],
  );
  const knownNewest = useMemo(() => newestPostTime(knownPosts), [knownPosts]);

  const count = useMemo(() => {
    if (!enabled || !data || baseline === null) return 0;
    return countNewPosts(data, knownIds, Math.max(baseline, knownNewest));
  }, [enabled, data, baseline, knownIds, knownNewest]);

  const acknowledge = useCallback(() => {
    setBaseline(Math.max(newestPostTime(data ?? []), knownNewest));
  }, [data, knownNewest]);

  return { count, acknowledge };
}
