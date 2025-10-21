import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReplyToFeedItem from "./ReplyToFeedItem";
import AeButton from "../../../components/AeButton";
import { TrendminerApi } from "../../../api/backend";

export default function TokenTopicFeed({ topicName, showHeader = false, displayTokenName }: { topicName: string; showHeader?: boolean; displayTokenName?: string }) {
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
      {sortedPosts.length === 0 && (
        <div className="text-white/60 text-sm">Be the first to speak about {displayTag}.</div>
      )}
      {sortedPosts.map((item: any) => (
        <ReplyToFeedItem key={item.id} item={item} commentCount={item.total_comments ?? 0} onOpenPost={() => { /* caller sets navigation */ }} />
      ))}
      <div className="text-center mt-1.5">
        <AeButton onClick={() => refetch()} disabled={isFetching} loading={isFetching} variant="ghost" size="medium" className="min-w-24">
          {isFetching ? 'Loading…' : 'Refresh'}
        </AeButton>
      </div>
    </div>
  );
}


