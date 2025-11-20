import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReplyToFeedItem from "./ReplyToFeedItem";
import { PostsService } from "../../../api/generated";
import AeButton from "../../../components/AeButton";
import { SuperheroApi } from "../../../api/backend";
import { TokensService } from "../../../api/generated/services/TokensService";
import type { TokenHolderDto } from "../../../api/generated/models/TokenHolderDto";
import { Decimal } from "@/libs/decimal";

type TokenTopicFeedProps = {
  topicName: string;
  showHeader?: boolean;
  displayTokenName?: string;
  showEmptyMessage?: boolean;
  /**
   * Optional token sale address for the Trend token associated with this topic.
   * When provided, we'll load holders and enable:
   * - default \"holders only\" filtering (when holdersOnly is true)
   * - per-post holder indicator + balance
   */
  tokenSaleAddress?: string;
  /**
   * Decimals for the Trend token (used to prettify holder balances).
   */
  tokenDecimals?: number;
  /**
   * Display symbol/name for the Trend token, e.g. \"TOKEN\".
   */
  tokenSymbol?: string;
  /**
   * When true, limit posts to authors that hold the token.
   * This should be controlled by the parent (token page), but defaults to true.
   */
  holdersOnly?: boolean;
};

export default function TokenTopicFeed({
  topicName,
  showHeader = false,
  displayTokenName,
  showEmptyMessage = false,
  tokenSaleAddress,
  tokenDecimals,
  tokenSymbol,
  holdersOnly = true,
}: TokenTopicFeedProps) {
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
  const hashtagRegex = useMemo(() => {
    return new RegExp(`(^|[^A-Za-z0-9_])#${escapeRegExp(baseName)}(?![A-Za-z0-9_])`, 'i');
  }, [baseName]);

  // Optional: load holders for this Trend token so we can:
  // - filter posts to token holders only
  // - show holder balance badge on each item
  const { data: holdersResponse } = useQuery({
    queryKey: ["TokensService.listTokenHolders-for-topic-feed", tokenSaleAddress],
    enabled: !!tokenSaleAddress,
    queryFn: async () => {
      if (!tokenSaleAddress) {
        return { items: [] as TokenHolderDto[] };
      }
      const response = await TokensService.listTokenHolders({
        address: tokenSaleAddress,
        // Large page size to cover most holders, but still bounded
        limit: 500,
        page: 1,
      }) as unknown as { items: TokenHolderDto[] };
      if (Array.isArray((response as any)?.items)) return response;
      if (Array.isArray(response as any)) {
        return { items: response as any as TokenHolderDto[] };
      }
      return { items: [] as TokenHolderDto[] };
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const holdersByAddress = useMemo(() => {
    const map = new Map<string, TokenHolderDto>();
    const items: TokenHolderDto[] = Array.isArray((holdersResponse as any)?.items)
      ? (holdersResponse as any).items
      : [];
    for (const h of items) {
      if (!h?.address) continue;
      map.set(String(h.address).toLowerCase(), h);
    }
    return map;
  }, [holdersResponse]);

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
    let deduped = Array.from(byKey.values()).sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    }).slice(0, MAX_POSTS);

    // Optional: limit to token holders only (when enabled and we have holder data)
    if (holdersOnly && tokenSaleAddress) {
      deduped = deduped.filter((p: any) => {
        const addr = String(p?.sender_address || "").toLowerCase();
        const holder = holdersByAddress.get(addr);
        if (!holder) return false;
        try {
          return Decimal.from(holder.balance || "0").gt("0");
        } catch {
          return false;
        }
      });
    }

    return deduped;
  }, [posts, altPosts, replyMatches, hashtagRegex, holdersOnly, tokenSaleAddress, holdersByAddress]);

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
      {displayPosts.map((item: any) => {
        let tokenHolderLabel: string | undefined;
        if (tokenSaleAddress) {
          const addr = String(item?.sender_address || "").toLowerCase();
          const holder = holdersByAddress.get(addr);
          if (holder && holder.balance) {
            try {
              const decimals = typeof tokenDecimals === "number" && Number.isFinite(tokenDecimals)
                ? tokenDecimals
                : 18;
              const pretty = Decimal.from(holder.balance).div(10 ** decimals).prettify();
              const symbolBase =
                (displayTokenName || tokenSymbol || baseName || "").toString().replace(/^#/, "");
              const symbol = symbolBase ? ` ${symbolBase}` : "";
              tokenHolderLabel = `${pretty}${symbol}`;
            } catch {
              // Fallback: show raw balance if Decimal parsing fails
              const symbolBase =
                (displayTokenName || tokenSymbol || baseName || "").toString().replace(/^#/, "");
              const symbol = symbolBase ? ` ${symbolBase}` : "";
              tokenHolderLabel = `${holder.balance}${symbol}`;
            }
          }
        }

        return (
          <ReplyToFeedItem
            key={item.id}
            item={item}
            commentCount={item.total_comments ?? 0}
            allowInlineRepliesToggle={false}
            tokenHolderLabel={tokenHolderLabel}
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
        );
      })}
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


