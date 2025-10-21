import React, { useEffect, useMemo } from "react";
import { Backend } from "../../../api/backend";
import { useQuery } from "@tanstack/react-query";
import ReplyToFeedItem from "./ReplyToFeedItem";
import AeButton from "../../../components/AeButton";
import { TrendminerApi } from "../../../api/backend";

export default function TokenTopicFeed({ topicName, showHeader = false, displayTokenName, showEmptyMessage = false }: { topicName: string; showHeader?: boolean; displayTokenName?: string; showEmptyMessage?: boolean }) {
  const lookup = useMemo(() => `#${String(topicName || '').replace(/^#/, '').toLowerCase()}`, [topicName]);
  const displayTag = useMemo(() => {
    const base = String(displayTokenName || topicName || '').replace(/^#/, '');
    return `#${base ? base.toUpperCase() : ''}`;
  }, [displayTokenName, topicName]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["topic-by-name", lookup],
    queryFn: () => TrendminerApi.getTopicByName(lookup) as Promise<any>,
    refetchInterval: 120 * 1000,
  });

  const posts: any[] = Array.isArray((data as any)?.posts) ? (data as any).posts : [];
  const postCount: number | undefined = typeof (data as any)?.post_count === 'number' ? (data as any).post_count : undefined;
  const sortedPosts = useMemo(() => {
    return posts.slice().sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at; // newest first
    });
  }, [posts]);

  // Fallback: if Trendminer has no posts for this topic, search the on-chain feed by hashtag
  const { data: fallbackFeed, refetch: refetchFallback, isFetching: isFetchingFallback } = useQuery({
    queryKey: ["fallback-feed-hashtag", lookup],
    enabled: sortedPosts.length === 0,
    queryFn: async () => {
      // Page 1, newest first; include posts (v3). Search supports substring match server-side.
      const res = await Backend.getFeed(1, "new", null, lookup);
      return res;
    },
    refetchInterval: 120 * 1000,
  });

  const fallbackPosts: any[] = useMemo(() => {
    if (!fallbackFeed || sortedPosts.length > 0) return [];
    const regex = new RegExp(`(^|[^A-Za-z0-9_])${lookup.replace(/[#]/g, "#")}([^A-Za-z0-9_]|$)`, "i");
    const items = Array.isArray((fallbackFeed as any)?.results || (fallbackFeed as any)?.items)
      ? ((fallbackFeed as any).results || (fallbackFeed as any).items)
      : [];
    return items.filter((p: any) => regex.test(String(p?.text || p?.title || "")));
  }, [fallbackFeed, lookup, sortedPosts.length]);

  useEffect(() => {
    // initial refetch safety if needed
  }, [lookup]);

  if (isLoading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/10 rounded-xl p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    const msg = ((error as any)?.message || '').toString();
    const isNotFound = /404|not found/i.test(msg);
    if (!isNotFound) {
      return (
        <div className="text-white/80">
          Failed to load posts for {lookup.toUpperCase()}. <AeButton size="small" variant="ghost" onClick={() => refetch()} className="inline-flex ml-2">Retry</AeButton>
        </div>
      );
    }
    // If topic not found yet → treat as empty state
  }

  return (
    <div className="grid gap-2">
      {showHeader && (
        <div className="flex items-center justify-between mb-1">
          <h4 className="m-0 text-white/90 font-semibold">Posts for {displayTag}</h4>
          {postCount != null && (
            <div className="text-xs text-white/60">{postCount} total</div>
          )}
        </div>
      )}
      {sortedPosts.length === 0 && showEmptyMessage && (
        <div className="text-white/60 text-sm">Be the first to speak about {displayTag}.</div>
      )}
      {(sortedPosts.length > 0 ? sortedPosts : fallbackPosts).map((item: any) => (
        <ReplyToFeedItem key={item.id} item={item} commentCount={item.total_comments ?? 0} onOpenPost={() => { /* caller sets navigation */ }} />
      ))}
      <div className="text-center mt-1.5">
        <AeButton onClick={() => { refetch(); if (sortedPosts.length === 0) refetchFallback(); }} disabled={isFetching || isFetchingFallback} loading={isFetching || isFetchingFallback} variant="ghost" size="medium" className="min-w-24">
          {isFetching ? 'Loading…' : 'Refresh'}
        </AeButton>
      </div>
    </div>
  );
}


