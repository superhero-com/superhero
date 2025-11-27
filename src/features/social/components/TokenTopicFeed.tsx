import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReplyToFeedItem from "./ReplyToFeedItem";
import { PostsService } from "../../../api/generated";
import AeButton from "../../../components/AeButton";
import { SuperheroApi } from "../../../api/backend";

export default function TokenTopicFeed({ topicName, showHeader = false, displayTokenName, showEmptyMessage = false }: { topicName: string; showHeader?: boolean; displayTokenName?: string; showEmptyMessage?: boolean }) {
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseName = useMemo(() => String(topicName || '').replace(/^#/, ''), [topicName]);
  const lookup = useMemo(() => `#${baseName.toLowerCase()}`, [baseName]);
  const lookupOriginal = useMemo(() => `#${baseName}`, [baseName]);
  const displayTag = useMemo(() => {
    const base = String(displayTokenName || topicName || '').replace(/^#/, '');
    return `#${base ? base.toUpperCase() : ''}`;
  }, [displayTokenName, topicName]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["topic-by-name", lookup],
    queryFn: () => SuperheroApi.getTopicByName(baseName.toLowerCase()) as Promise<any>,
    enabled: Boolean(baseName),
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

  // Build a unified hashtag regex early to check if posts match the filter
  // Exclude matches where the hashtag is followed by a hyphen and more characters
  // (e.g., #superhero should not match #superhero-devs)
  const hashtagRegex = useMemo(() => {
    // Match the hashtag only if it's not followed by a hyphen and more characters
    // The negative lookahead checks: not (word char OR hyphen followed by at least one char)
    return new RegExp(`(^|[^A-Za-z0-9_])#${escapeRegExp(baseName)}(?![A-Za-z0-9_]|-[A-Za-z0-9_])`, 'i');
  }, [baseName]);

  // Check if any posts match the hashtag filter (not just if posts exist)
  const hasFilteredPosts = useMemo(() => {
    return posts.some((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
  }, [posts, hashtagRegex]);

  // Alternate casing fallback: try original-cased topic if lowercase is empty
  const { data: dataOriginal, isFetching: isFetchingOriginal, refetch: refetchOriginal } = useQuery({
    queryKey: ["topic-by-name-original", lookupOriginal],
    enabled: !hasFilteredPosts && Boolean(baseName),
    queryFn: () => SuperheroApi.getTopicByName(baseName) as Promise<any>,
    refetchInterval: 120 * 1000,
  });

  const altPosts: any[] = useMemo(() => {
    const items: any[] = Array.isArray((dataOriginal as any)?.posts) ? (dataOriginal as any).posts : [];
    return items.slice().sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
  }, [dataOriginal]);


  // Include replies that reference the hashtag in their content or topics
  const { data: repliesSearch, isFetching: isFetchingReplies, refetch: refetchReplies } = useQuery({
    // Include baseName in queryKey to ensure different case variations get different cache entries
    queryKey: ["posts-search-hashtag", baseName],
    enabled: Boolean(baseName),
    // Use full-text search for the hashtag to reduce payload to exact mentions
    queryFn: () => PostsService.listAll({ orderBy: 'created_at', orderDirection: 'DESC', search: `#${baseName}`, limit: 200 }) as unknown as Promise<any>,
    refetchInterval: 120 * 1000,
  });
  const replyMatches: any[] = useMemo(() => {
    const items = Array.isArray((repliesSearch as any)?.items) ? (repliesSearch as any).items : [];
    return items.filter((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
  }, [repliesSearch, hashtagRegex]);

  const MAX_POSTS = 200;

  // Merge all sources, ensure uniq (by id/slug) and newest-first sorting
  const displayPosts: any[] = useMemo(() => {
    const postsFiltered = posts.filter((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
    const altPostsFiltered = altPosts.filter((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
    // fallbackPosts already filtered at line 66, but use consistent field priority to avoid excluding valid posts
    // Check all fields (text || title || content) to match the initial filter's priority
    const merged = [...postsFiltered, ...altPostsFiltered, ...replyMatches];
    const byKey = new Map<string, any>();
    for (const p of merged) {
      const key = String((p as any)?.id ?? (p as any)?.slug ?? '');
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, p);
    }
    return Array.from(byKey.values()).sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    }).slice(0, MAX_POSTS);
  }, [posts, altPosts, replyMatches, hashtagRegex]);

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
      {displayPosts.length === 0 && showEmptyMessage && (
        <div className="text-white/60 text-sm">Be the first to speak about {displayTag}.</div>
      )}
      {displayPosts.map((item: any) => (
        <ReplyToFeedItem
          key={item.id}
          item={item}
          commentCount={item.total_comments ?? 0}
          allowInlineRepliesToggle={false}
          onOpenPost={(id: string) => {
            try {
              const cleanId = String(id || item.id).replace(/_v3$/, "");
              const target = (item as any)?.slug || cleanId;
              window.location.assign(`/post/${target}`);
            } catch {
              // no-op
            }
          }}
        />
      ))}
      <div className="text-center mt-1.5">
        <AeButton onClick={
          () => {
            refetch();
            refetchReplies();
            if (displayPosts.length === 0) {
              refetchOriginal();
              }
            }
          } 
          disabled={isFetching || isFetchingOriginal  || isFetchingReplies}
          loading={isFetching || isFetchingOriginal || isFetchingReplies}
          variant="ghost"
          size="medium"
          className="min-w-24"
        >
          {(isFetching || isFetchingReplies) ? 'Loading…' : 'Refresh'}
        </AeButton>
      </div>
    </div>
  );
}


