import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Decimal } from '@/libs/decimal';
import ReplyToFeedItem from './ReplyToFeedItem';
import PostSkeleton from './PostSkeleton';
import { PostsService } from '../../../api/generated';
import AeButton from '../../../components/AeButton';
import { SuperheroApi } from '../../../api/backend';
import { TokensService } from '../../../api/generated/services/TokensService';
import type { TokenHolderDto } from '../../../api/generated/models/TokenHolderDto';

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
  /**
   * Optional callback used on Trend token pages: when the holders-only filter
   * results in zero posts but there are non-holder posts available, we'll
   * auto-switch to "all posts" and call this so the parent can update its UI.
   */
  onAutoDisableHoldersOnly?: () => void;
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
  onAutoDisableHoldersOnly,
}: TokenTopicFeedProps) {
  const [autoSwitchedFromHolders, setAutoSwitchedFromHolders] = useState(false);
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseName = useMemo(() => String(topicName || '').replace(/^#/, ''), [topicName]);
  const lookup = useMemo(() => `#${baseName.toLowerCase()}`, [baseName]);
  const lookupOriginal = useMemo(() => `#${baseName}`, [baseName]);
  const displayTag = useMemo(() => {
    const base = String(displayTokenName || topicName || '').replace(/^#/, '');
    return `#${base ? base.toUpperCase() : ''}`;
  }, [displayTokenName, topicName]);

  const {
    data, isLoading, error, refetch, isFetching,
  } = useQuery({
    queryKey: ['topic-by-name', lookup],
    queryFn: () => SuperheroApi.getTopicByName(baseName.toLowerCase()) as Promise<any>,
    enabled: Boolean(baseName),
    refetchInterval: 120 * 1000,
  });

  const posts: any[] = Array.isArray((data as any)?.posts) ? (data as any).posts : [];
  const postCount: number | undefined = typeof (data as any)?.post_count === 'number' ? (data as any).post_count : undefined;

  // Build a unified hashtag regex early to check if posts match the filter
  // Exclude matches where the hashtag is followed by a hyphen and more characters
  // (e.g., #superhero should not match #superhero-devs)
  const hashtagRegex = useMemo(
    () =>
    // Match the hashtag only if it's not followed by a hyphen and more characters
    // The negative lookahead checks: not (word char OR hyphen followed by at least one char)
      new RegExp(`(^|[^A-Za-z0-9_])#${escapeRegExp(baseName)}(?![A-Za-z0-9_]|-[A-Za-z0-9_])`, 'i'),
    [baseName],
  );

  // Optional: load holders for this Trend token so we can:
  // - filter posts to token holders only
  // - show holder balance badge on each item
  const { data: holdersResponse, isFetching: isFetchingHolders } = useQuery({
    queryKey: ['TokensService.listTokenHolders-for-topic-feed', tokenSaleAddress],
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
  const hasFilteredPosts = useMemo(() => posts.some((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || ''))), [posts, hashtagRegex]);

  // Alternate casing fallback: try original-cased topic if lowercase is empty
  const { data: dataOriginal, isFetching: isFetchingOriginal, refetch: refetchOriginal } = useQuery({
    queryKey: ['topic-by-name-original', lookupOriginal],
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
    queryKey: ['posts-search-hashtag', baseName],
    enabled: Boolean(baseName),
    // Use full-text search for the hashtag to reduce payload to exact mentions
    queryFn: () => PostsService.listAll({
      orderBy: 'created_at', orderDirection: 'DESC', search: `#${baseName}`, limit: 200,
    }) as unknown as Promise<any>,
    refetchInterval: 120 * 1000,
  });
  const replyMatches: any[] = useMemo(() => {
    const items = Array.isArray((repliesSearch as any)?.items) ? (repliesSearch as any).items : [];
    return items.filter((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
  }, [repliesSearch, hashtagRegex]);

  const MAX_POSTS = 200;

  // Merge all sources, ensure uniq (by id/slug) and newest-first sorting
  const allPosts: any[] = useMemo(() => {
    const postsFiltered = posts.filter((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
    const altPostsFiltered = altPosts.filter((p: any) => hashtagRegex.test(String(p?.content || p?.text || p?.title || '')));
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

  // Subset of posts authored by token holders with a positive balance
  const holderPosts: any[] = useMemo(() => {
    if (!tokenSaleAddress) return [];
    return allPosts.filter((p: any) => {
      const addr = String(p?.sender_address || '').toLowerCase();
      const holder = holdersByAddress.get(addr);
      if (!holder) return false;
      try {
        return Decimal.from(holder.balance || '0').gt('0');
      } catch {
        return false;
      }
    });
  }, [allPosts, tokenSaleAddress, holdersByAddress]);

  // Final list based on holders filter
  const displayPosts: any[] = useMemo(() => {
    if (holdersOnly && tokenSaleAddress) {
      return holderPosts;
    }
    return allPosts;
  }, [holdersOnly, tokenSaleAddress, holderPosts, allPosts]);

  // If holders-only yields no posts but there are regular posts, automatically
  // switch to "all posts" and surface a small info banner.
  useEffect(() => {
    if (!holdersOnly || !tokenSaleAddress || autoSwitchedFromHolders) return;
    // Wait until holders have been fetched at least once so we don't
    // prematurely switch to "All posts" before we know if holders exist.
    if (isFetchingHolders) return;
    if (allPosts.length > 0 && holderPosts.length === 0 && onAutoDisableHoldersOnly) {
      setAutoSwitchedFromHolders(true);
      onAutoDisableHoldersOnly();
    }
  }, [holdersOnly, tokenSaleAddress, allPosts, holderPosts, onAutoDisableHoldersOnly, autoSwitchedFromHolders, isFetchingHolders]);

  // Reset auto-switch banner state when topic or token context changes
  useEffect(() => {
    setAutoSwitchedFromHolders(false);
  }, [topicName, tokenSaleAddress]);

  useEffect(() => {
    // initial refetch safety if needed
  }, [lookup]);

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between mb-1 px-1 md:px-0">
          <h4 className="m-0 text-white/80 text-sm md:text-[15px] font-medium">
            Loading posts for
            {' '}
            {displayTag || `#${baseName.toUpperCase()}`}
          </h4>
          <div className="text-[11px] text-white/55 hidden md:block">
            Fetching latest posts...
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <PostSkeleton key={i} />
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
          Failed to load posts for
          {' '}
          {lookup.toUpperCase()}
          .
          {' '}
          <AeButton size="small" variant="ghost" onClick={() => refetch()} className="inline-flex ml-2">Retry</AeButton>
        </div>
      );
    }
    // If topic not found yet → treat as empty state
  }

  return (
    <div className="grid gap-2">
      {showHeader && (
        <div className="flex items-center justify-between mb-1">
          <h4 className="m-0 text-white/90 font-semibold">
            Posts for
            {displayTag}
          </h4>
          {postCount != null && (
            <div className="text-xs text-white/60">
              {postCount}
              {' '}
              total
            </div>
          )}
        </div>
      )}

      {/* Info banner when user explicitly selects "Holders only" but there are no holder posts */}
      {holdersOnly && tokenSaleAddress && allPosts.length > 0 && holderPosts.length === 0 && (
        <div className="mt-1.5 mb-1 mx-1 md:mx-0 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 md:px-4 py-2.5 text-xs text-emerald-100 flex items-start gap-2">
          <span className="text-[14px] pt-0.5" aria-hidden="true">🏅</span>
          <div className="text-left">
            <div className="font-semibold text-emerald-100">
              No posts from token holders yet.
            </div>
            <div className="mt-0.5 text-emerald-100/90 text-[11px] sm:text-xs leading-snug">
              If you hold this token, create a post with
              {' '}
              <span className="font-semibold text-emerald-100 underline decoration-emerald-300/60 decoration-dashed underline-offset-2">
                {displayTag}
              </span>
              {' '}
              to appear here.
            </div>
          </div>
        </div>
      )}

      {/* Info banner when holders-only had no matches and we auto-switched to all posts */}
      {autoSwitchedFromHolders && !holdersOnly && allPosts.length > 0 && holderPosts.length === 0 && (
        <div className="mt-1.5 mb-1 mx-1 md:mx-0 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 md:px-4 py-2.5 text-xs text-emerald-100 flex items-start gap-2">
          <span className="text-[14px] pt-0.5" aria-hidden="true">ℹ️</span>
          <div className="text-left">
            <div className="font-semibold text-emerald-100">
              No posts from token holders yet.
            </div>
            <div className="mt-0.5 text-emerald-100/90 text-[11px] sm:text-xs leading-snug">
              Showing all posts for
              {' '}
              <span className="font-semibold text-emerald-100">
                {displayTag}
              </span>
              {' '}
              while we wait for holders to join the conversation.
            </div>
          </div>
        </div>
      )}

      {/* Empty state when there are no posts at all for this trend */}
      {showEmptyMessage && allPosts.length === 0 && displayPosts.length === 0 && (
        <div className="mt-1 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-5 text-center">
          <div className="text-2xl mb-1" aria-hidden="true">🗯️</div>
          <div className="font-semibold text-white/85 mb-1 text-sm md:text-[15px]">
            No posts for
            {' '}
            {displayTag}
          </div>
          <div className="text-xs text-white/60 max-w-md mx-auto">
            Be the first to start a conversation — create a post that includes
            {' '}
            <span className="font-medium text-white/80">{displayTag}</span>
            {' '}
            in the text.
          </div>
        </div>
      )}
      {displayPosts.map((item: any) => {
        let tokenHolderLabel: string | undefined;
        if (tokenSaleAddress) {
          const addr = String(item?.sender_address || '').toLowerCase();
          const holder = holdersByAddress.get(addr);
          if (holder && holder.balance) {
            try {
              const balanceDecimal = Decimal.from(holder.balance || '0');
              if (balanceDecimal.gt('0')) {
                const decimals = typeof tokenDecimals === 'number' && Number.isFinite(tokenDecimals)
                  ? tokenDecimals
                  : 18;
                const pretty = balanceDecimal.div(10 ** decimals).prettify();
                const symbolBase = (displayTokenName || tokenSymbol || baseName || '').toString().replace(/^#/, '');
                const symbol = symbolBase ? ` ${symbolBase}` : '';
                tokenHolderLabel = `${pretty}${symbol}`;
              }
            } catch {
              // Fallback: show raw balance if Decimal parsing fails
              const symbolBase = (displayTokenName || tokenSymbol || baseName || '').toString().replace(/^#/, '');
              const symbol = symbolBase ? ` ${symbolBase}` : '';
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
                const cleanId = String(id || item.id).replace(/_v3$/, '');
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
        <AeButton
          onClick={() => {
            refetch();
            refetchReplies();
            if (displayPosts.length === 0) {
              refetchOriginal();
            }
          }}
          disabled={isFetching || isFetchingOriginal || isFetchingReplies}
          loading={isFetching || isFetchingOriginal || isFetchingReplies}
          variant="ghost"
          size="medium"
          className="min-w-24"
        >
          {(isFetching || isFetchingOriginal || isFetchingReplies) ? 'Loading…' : 'Refresh'}
        </AeButton>
      </div>
    </div>
  );
}
