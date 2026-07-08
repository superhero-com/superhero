import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const TokenTopicFeed = ({
  topicName,
  showHeader = false,
  displayTokenName,
  showEmptyMessage = false,
  tokenSaleAddress,
  tokenDecimals,
  tokenSymbol,
  holdersOnly = true,
  onAutoDisableHoldersOnly,
}: TokenTopicFeedProps) => {
  const { t } = useTranslation('social');
  const [autoSwitchedFromHolders, setAutoSwitchedFromHolders] = useState(false);
  // Render the feed incrementally. Each mounted post fires its own requests
  // (avatar + recursive comment-count walk), so mounting the full list up front
  // floods the network — especially on mobile. Start with ~1-2 viewports and
  // let the user load more on demand.
  const POSTS_PER_PAGE = 10;
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
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

  const posts: any[] = useMemo(
    () => (Array.isArray((data as any)?.posts) ? (data as any).posts : []),
    [data],
  );
  const postCount: number | undefined = typeof (data as any)?.post_count === 'number' ? (data as any).post_count : undefined;

  // Build a unified hashtag regex early to check if posts match the filter
  // Exclude matches where the hashtag is followed by a hyphen and more characters
  // (e.g., #superhero should not match #superhero-devs)
  const hashtagRegex = useMemo(() => (
    // Match the hashtag only if it's not followed by a hyphen and more characters
    // The negative lookahead checks: not (word char OR hyphen followed by at least one char)
    new RegExp(`(^|[^A-Za-z0-9_])#${escapeRegExp(baseName)}(?![A-Za-z0-9_]|-[A-Za-z0-9_])`, 'i')
  ), [baseName]);

  // Optional: load holders for this Trend token so we can:
  // - filter posts to token holders only
  // - show holder balance badge on each item
  const {
    data: holdersResponse,
    isFetching: isFetchingHolders,
    isSuccess: holdersLoaded,
    isError: holdersFailed,
  } = useQuery({
    queryKey: ['TokensService.listTokenHolders-for-topic-feed', tokenSaleAddress],
    enabled: !!tokenSaleAddress,
    queryFn: async () => {
      if (!tokenSaleAddress) {
        return { items: [] as TokenHolderDto[], complete: true };
      }
      // The API caps `limit` at 100, so paginate to cover most holders while staying bounded.
      const PAGE_SIZE = 100;
      const MAX_PAGES = 5; // up to 500 holders
      const items: TokenHolderDto[] = [];
      // `complete` means the holder set is authoritative enough to filter
      // against — not that every last holder is included. The API returns
      // holders by balance descending, so two outcomes are authoritative: we
      // reach the natural end (a page shorter than PAGE_SIZE), or we exhaust the
      // MAX_PAGES cap with full pages and hold the canonical top-N holders. A
      // popular token with more than MAX_PAGES * PAGE_SIZE holders must still be
      // filtered — otherwise "Holders only" silently shows every post. `complete`
      // becomes false only when a page fails mid-pagination, leaving an arbitrary
      // partial set; consumers then fall back to showing all posts rather than
      // filter against an untrustworthy map.
      let complete = true;
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        let response: { items?: TokenHolderDto[] } | TokenHolderDto[];
        try {
          // Sequential by design: we stop early once a page returns fewer than
          // PAGE_SIZE items, so the next request depends on the current result.
          // eslint-disable-next-line no-await-in-loop
          response = await TokensService.listTokenHolders({
            address: tokenSaleAddress,
            limit: PAGE_SIZE,
            page,
          }) as unknown as { items?: TokenHolderDto[] } | TokenHolderDto[];
        } catch (err) {
          // Preserve holders gathered from earlier pages: a late-page failure
          // must not discard a real holder set. Only fail the whole query when
          // we have nothing at all, so the caller can tell "unknown" (error)
          // apart from "no holders" (successful empty result).
          if (items.length === 0) throw err;
          // A mid-pagination failure truncates the set at an arbitrary point —
          // mark it non-authoritative so we don't hide posts based on it.
          complete = false;
          break;
        }
        let pageItems: TokenHolderDto[] = [];
        if (Array.isArray((response as any)?.items)) {
          pageItems = (response as any).items;
        } else if (Array.isArray(response)) {
          pageItems = response as TokenHolderDto[];
        }
        items.push(...pageItems);
        // A short page means we've reached the last holder — stop early.
        // `complete` is already true (the default for a clean run).
        if (pageItems.length < PAGE_SIZE) break;
      }
      return { items, complete };
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const holdersByAddress = useMemo(() => {
    const map = new Map<string, TokenHolderDto>();
    const items: TokenHolderDto[] = Array.isArray((holdersResponse as any)?.items)
      ? (holdersResponse as any).items
      : [];
    items.forEach((h) => {
      if (!h?.address) return;
      map.set(String(h.address).toLowerCase(), h);
    });
    return map;
  }, [holdersResponse]);

  // Whether the fetched holder set is authoritative enough to filter against:
  // the query succeeded and pagination either reached the natural end or filled
  // the MAX_PAGES cap (the top-N holders by balance). Only a mid-pagination
  // failure leaves it false, so we never hide posts against a broken map.
  const holdersComplete = holdersLoaded && Boolean((holdersResponse as any)?.complete);

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
    merged.forEach((p: any) => {
      const key = String((p as any)?.id ?? (p as any)?.slug ?? '');
      if (!key) return;
      if (!byKey.has(key)) byKey.set(key, p);
    });
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
    // Only hide non-holder posts once we have a complete, authoritative holder
    // set. While the holder query is still loading, or after a partial/failed
    // fetch, the map may be missing real holder authors — fall back to all posts
    // so the feed isn't empty and genuine holder posts aren't hidden.
    if (holdersOnly && tokenSaleAddress && holdersComplete) {
      return holderPosts;
    }
    return allPosts;
  }, [holdersOnly, tokenSaleAddress, holdersComplete, holderPosts, allPosts]);

  // Only mount the first `visibleCount` posts to keep per-post requests bounded.
  const visiblePosts = useMemo(() => displayPosts.slice(0, visibleCount), [displayPosts, visibleCount]);
  const hasMorePosts = displayPosts.length > visibleCount;

  // Reset pagination whenever the source list or filter context changes so we
  // don't keep a large batch mounted after switching topics/filters.
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [topicName, tokenSaleAddress, holdersOnly]);

  // Auto-load the next batch when the sentinel near the bottom scrolls into view.
  // The observer is recreated whenever `visibleCount` changes so that, if the
  // sentinel is still within the root margin after a batch mounts (e.g. a tall
  // viewport), a fresh observe() re-fires and keeps filling until the sentinel
  // scrolls out of view or there are no more posts. A manual "Load more" button
  // (rendered below) is the fallback when IntersectionObserver is unavailable.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMorePosts) return undefined;
    const sentinel = loadMoreRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((c) => c + POSTS_PER_PAGE);
      }
    }, { rootMargin: '600px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePosts, visibleCount]);

  // If holders-only yields no posts but there are regular posts, automatically
  // switch to "all posts" and surface a small info banner.
  useEffect(() => {
    if (!holdersOnly || !tokenSaleAddress || autoSwitchedFromHolders) return;
    // Wait until holders have been fetched at least once so we don't
    // prematurely switch to "All posts" before we know if holders exist.
    if (isFetchingHolders) return;
    // Switch only once we can conclude there are no usable holder posts: either
    // the holder set is complete and authoritative, or the fetch failed outright
    // so we have no map to filter with. A partial (incomplete) set is excluded —
    // it could wrongly read as "no holders" while real holder posts still exist.
    if (!holdersComplete && !holdersFailed) return;
    if (allPosts.length > 0 && holderPosts.length === 0 && onAutoDisableHoldersOnly) {
      setAutoSwitchedFromHolders(true);
      onAutoDisableHoldersOnly();
    }
  }, [
    holdersOnly, tokenSaleAddress, allPosts, holderPosts, onAutoDisableHoldersOnly,
    autoSwitchedFromHolders, isFetchingHolders, holdersComplete, holdersFailed,
  ]);

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
        <div className="flex flex-col items-center text-center gap-0.5 mb-1 px-1 md:flex-row md:items-center md:justify-between md:text-left md:px-0">
          <h4 className="m-0 text-white/80 text-sm md:text-[15px] font-medium">
            {t('tokenTopicFeed.loadingPostsFor', { tag: displayTag || `#${baseName.toUpperCase()}` })}
          </h4>
          <div className="text-[11px] text-white/55 hidden md:block">
            {t('tokenTopicFeed.fetchingLatestPosts')}
          </div>
        </div>
        {['skeleton-1', 'skeleton-2'].map((key) => (
          <PostSkeleton key={key} />
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
          {t('tokenTopicFeed.failedToLoadPostsFor', { tag: lookup.toUpperCase() })}
          {' '}
          <AeButton size="small" variant="ghost" onClick={() => refetch()} className="inline-flex ml-2">{t('retry')}</AeButton>
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
            {t('tokenTopicFeed.postsFor', { tag: displayTag })}
          </h4>
          {postCount != null && (
            <div className="text-xs text-white/60">
              {t('tokenTopicFeed.totalCount', { count: postCount })}
            </div>
          )}
        </div>
      )}

      {/* Info banner when user explicitly selects "Holders only" but there are no holder posts.
          Only when the holder set is complete/authoritative — for a partial or failed fetch we
          fall back to showing all posts, so claiming "no holder posts" would contradict the feed. */}
      {holdersOnly && tokenSaleAddress && holdersComplete && allPosts.length > 0 && holderPosts.length === 0 && (
        <div className="mt-1.5 mb-1 mx-1 md:mx-0 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 md:px-4 py-2.5 text-xs text-emerald-100 flex items-start gap-2">
          <span className="text-[14px] pt-0.5" aria-hidden="true">🏅</span>
          <div className="text-left">
            <div className="font-semibold text-emerald-100">
              {t('tokenTopicFeed.noHolderPostsYet')}
            </div>
            <div className="mt-0.5 text-emerald-100/90 text-[11px] sm:text-xs leading-snug">
              {t('tokenTopicFeed.ifYouHoldCreatePostPrefix')}
              {' '}
              <span className="font-semibold text-emerald-100 underline decoration-emerald-300/60 decoration-dashed underline-offset-2">
                {displayTag}
              </span>
              {' '}
              {t('tokenTopicFeed.ifYouHoldCreatePostSuffix')}
            </div>
          </div>
        </div>
      )}

      {/* Info banner when holders-only had no matches and we auto-switched to all posts */}
      {autoSwitchedFromHolders && !holdersOnly && allPosts.length > 0 && holderPosts.length === 0 && (
        <div className="mt-1.5 mb-1 mx-1 md:mx-0 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 md:px-4 py-2.5 text-xs text-emerald-100 flex items-start gap-2">
          <span className="text-[14px] pt-0.5" aria-hidden="true">ℹ️</span>
          <div className="text-left">
            <div className="font-semibold text-emerald-100">
              {t('tokenTopicFeed.noHolderPostsYet')}
            </div>
            <div className="mt-0.5 text-emerald-100/90 text-[11px] sm:text-xs leading-snug">
              {t('tokenTopicFeed.showingAllPostsForPrefix')}
              {' '}
              <span className="font-semibold text-emerald-100">
                {displayTag}
              </span>
              {' '}
              {t('tokenTopicFeed.showingAllPostsForSuffix')}
            </div>
          </div>
        </div>
      )}

      {/* Empty state when there are no posts at all for this trend */}
      {showEmptyMessage && allPosts.length === 0 && displayPosts.length === 0 && (
        <div className="mt-1 liquid-glass rounded-xl px-4 py-5 text-center">
          <div className="text-2xl mb-1" aria-hidden="true">🗯️</div>
          <div className="font-semibold text-white/85 mb-1 text-sm md:text-[15px]">
            {t('tokenTopicFeed.noPostsFor', { tag: displayTag })}
          </div>
          <div className="text-xs text-white/60 max-w-md mx-auto">
            {t('tokenTopicFeed.beFirstPrefix')}
            {' '}
            <span className="font-medium text-white/80">{displayTag}</span>
            {' '}
            {t('tokenTopicFeed.beFirstSuffix')}
          </div>
        </div>
      )}
      {visiblePosts.map((item: any) => {
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
      {hasMorePosts && (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-2 py-3">
          <div className="w-full" aria-hidden="true">
            <PostSkeleton />
          </div>
          <AeButton
            onClick={() => setVisibleCount((c) => c + POSTS_PER_PAGE)}
            variant="ghost"
            size="medium"
            className="min-w-24"
          >
            Load more
          </AeButton>
        </div>
      )}
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
          {(isFetching || isFetchingOriginal || isFetchingReplies) ? t('loading') : t('tokenTopicFeed.refresh')}
        </AeButton>
      </div>
    </div>
  );
};

export default TokenTopicFeed;
