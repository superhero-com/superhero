import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { cn } from '@/lib/utils';
import {
  memo, useCallback, useEffect, useMemo, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, MessageCircle } from 'lucide-react';
import { AspectMedia } from '@/components/AspectMedia';
import { PostDto, PostsService } from '../../../api/generated';
import { linkify } from '../../../utils/linkify';
import { formatAddress } from '../../../utils/address';
import SharePopover from './SharePopover';
import PostTipButton from './PostTipButton';
import { useWallet } from '../../../hooks';
import { useHashtagAllowedChars } from '../../../hooks/useCommunityFactory';
import { useStorePostSenderChainNames } from '../../../hooks/useChainName';
import { compactTime, fullTimestamp } from '../../../utils/time';
import { useCompactFeedItemLayout } from './useCompactFeedItemLayout';
import { useLinkDetection } from '../hooks/useLinkDetection';
import { DetectedLinkPreview } from './DetectedLinkPreview';
import { extractParentId } from '../utils/postParent';
import { appendToThread, pendingReplies } from '../utils/pendingPosts';
import { shouldOfferTranslation, translateUrl } from '../utils/translate';
import PostAuthorHeader from './PostAuthorHeader';
import PostContent from './PostContent';
import './FeedPost.css';

// Small component so the hook is always called unconditionally
const PostLinkPreview = memo(({ content }: { content: string }) => {
  const link = useLinkDetection(content);
  return <DetectedLinkPreview link={link} className="mt-3" />;
});

PostLinkPreview.displayName = 'PostLinkPreview';

interface ReplyToFeedItemProps {
  item: PostDto;
  onOpenPost: (postId: string) => void;
  commentCount?: number;
  hideParentContext?: boolean; // when true, do not render parent context header
  allowInlineRepliesToggle?: boolean; // when false, clicking replies just opens post
  onReply?: () => void;
  presentation?: 'feed' | 'detail';
  isActive?: boolean; // when true, visually highlight as the focused post
  /**
   * Optional label used on Trend token pages to indicate that the author
   * is a holder of the current token, including their balance, e.g.:
   * "123.45 TOKEN".
   */
  tokenHolderLabel?: string;
  /**
   * When set, replies are shown as a thread: replies that have their own replies
   * open nested under them (indented), down to MAX_THREAD_DEPTH levels.
   */
  threadDepth?: number;
}

const MAX_THREAD_DEPTH = 3;

function useParentId(item: PostDto): string | null {
  return useMemo(() => {
    const extract = (value: unknown): string | null => {
      if (!value) return null;
      const asString = String(value);
      // Match comment:<id> or comment/<id> anywhere in the string
      const m = asString.match(/comment[:/]([^\s,;]+)/i);
      const id = m?.[1] || (asString.startsWith('comment:') ? asString.split(':')[1] : null);
      if (!id) return null;
      return id.endsWith('_v3') ? id : `${id}_v3`;
    };

    if (Array.isArray((item as any)?.media)) {
      const found = (item as any).media.map((m: unknown) => extract(m)).find(Boolean);
      if (found) return found;
    }
    const scan = (node: any): string | null => {
      if (node == null) return null;
      if (typeof node === 'string') return extract(node);
      if (Array.isArray(node)) {
        const found = node.map((x) => scan(x)).find(Boolean);
        return found || null;
      }
      if (typeof node === 'object') {
        const found = Object.values(node).map((v) => scan(v)).find(Boolean);
        return found || null;
      }
      return null;
    };
    return scan((item as any)?.tx_args);
  }, [item]);
}

// X-like post item with optional parent context header
const ReplyToFeedItem = memo(({
  item,
  onOpenPost,
  commentCount = 0,
  hideParentContext = false,
  allowInlineRepliesToggle = true,
  isActive = false,
  onReply,
  presentation = 'feed',
  tokenHolderLabel,
  threadDepth,
}: ReplyToFeedItemProps) => {
  const { t, i18n } = useTranslation('social');
  const postId = item.id;
  const replyControls = allowInlineRepliesToggle ? `replies-${postId}` : undefined;
  const authorAddress = item.sender_address;
  const { chainNames, profileDisplayNames } = useWallet();
  const displayName = (profileDisplayNames?.[authorAddress] ?? chainNames?.[authorAddress] ?? '').trim();
  const { containerRef, isCompact } = useCompactFeedItemLayout(item.tx_hash ? 700 : 620);

  // Token collections (WORDS/Chinese/Arabic/Russian/...) drive which characters a hashtag's
  // token name may contain. New collections the backend adds are picked up automatically.
  const hashtagAllowedChars = useHashtagAllowedChars();

  const parentId = useParentId(item);
  const [parent, setParent] = useState<PostDto | null>(null);
  const [parentError, setParentError] = useState<Error | null>(null);

  // Nested replies state for this item
  const isThreaded = threadDepth !== undefined;
  // In a thread only the top-level reply polls: its descendant walk (below)
  // already fetches every nested reply's replies and hands them down.
  const isThreadRoot = threadDepth === 0;
  const isNestedReply = isThreaded && !isThreadRoot;
  // Outside a thread, keep the app's default: an explicit 0 (or undefined)
  // would refetch on every focus and remount.
  const nestedStaleTime = isNestedReply ? { staleTime: Infinity } : {};
  const queryClient = useQueryClient();
  const [showReplies, setShowReplies] = useState(
    isThreaded && threadDepth < MAX_THREAD_DEPTH && (item.total_comments ?? 0) > 0,
  );
  const {
    data: childReplies = [],
    isLoading: childLoading,
    error: childError,
    refetch: refetchChildReplies,
  } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const normalizedId = String(postId).endsWith('_v3') ? String(postId) : `${String(postId)}_v3`;
      const result = await PostsService.getComments({ id: normalizedId, orderDirection: 'ASC', limit: 50 }) as any;
      return result?.items || [];
    },
    enabled: showReplies,
    refetchInterval: isNestedReply ? false : 120 * 1000,
    ...nestedStaleTime,
  });
  // A reply to a reply: also show the post that started the thread, so the
  // original post stays visible however deep the conversation goes.
  const grandparentId = useMemo(() => (parent ? extractParentId(parent) : null), [parent]);
  const { data: rootPost = null } = useQuery<PostDto | null>({
    queryKey: ['post-thread-root', grandparentId],
    enabled: !!grandparentId && !hideParentContext,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const walkUp = async (id: string, seen: Set<string>): Promise<PostDto> => {
        seen.add(id);
        const post = (await PostsService.getById({ id })) as unknown as PostDto;
        const nextId = extractParentId(post);
        if (!nextId || seen.has(nextId) || seen.size >= 20) return post;
        return walkUp(nextId, seen);
      };
      return walkUp(grandparentId as string, new Set<string>());
    },
  });
  const postsWithSenderNames = useMemo(
    () => [item, parent, rootPost, ...childReplies],
    [item, parent, rootPost, childReplies],
  );
  useStorePostSenderChainNames(postsWithSenderNames);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!parentId || hideParentContext) return;
      try {
        const res = await PostsService.getById({ id: parentId });
        if (!cancelled) setParent(res as unknown as PostDto);
      } catch (e: any) {
        if (!cancelled) setParentError(e as Error);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [parentId, hideParentContext]);

  const handleOpen = useCallback(() => {
    const slugOrId = (item as any)?.slug || String(postId).replace(/_v3$/, '');
    onOpenPost(slugOrId);
  }, [onOpenPost, postId, item]);
  const toggleReplies = useCallback(() => setShowReplies((s) => !s), []);

  const media = Array.isArray(item.media)
    ? item.media.filter((m) => (typeof m === 'string' ? !m.startsWith('comment:') : true))
    : [];
  // Compute total descendant comments (all levels) for this item
  const { data: descendantCount } = useQuery<number>({
    queryKey: ['post-desc-count', postId],
    // Always enable for this post so counts can update from 0 → N over time,
    // except a nested reply without replies: its parent's list carries that.
    enabled: !!postId && (!isNestedReply || (item.total_comments ?? 0) > 0),
    // Periodically refresh to keep counts from going stale.
    refetchInterval: isNestedReply ? false : 120 * 1000,
    ...nestedStaleTime,
    queryFn: async () => {
      const normalize = (id: string) => (String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`);
      const root = normalize(String(postId));
      const requestBudgetRef = { value: 150 }; // safety cap per item
      const walked = new Map<string, PostDto[]>();

      const fetchAllPages = async (
        current: string,
        page = 1,
        acc: PostDto[] = [],
      ): Promise<PostDto[]> => {
        if (requestBudgetRef.value <= 0) return acc;
        requestBudgetRef.value -= 1;
        const res: any = await PostsService.getComments({
          id: current, orderDirection: 'ASC', page, limit: 50,
        });
        const items: PostDto[] = res?.items || [];
        const nextAcc = acc.concat(items);
        const meta = res?.meta;
        if (!meta?.currentPage || !meta?.totalPages || meta.currentPage >= meta.totalPages) {
          return nextAcc;
        }
        return fetchAllPages(current, meta.currentPage + 1, nextAcc);
      };

      const processQueue = async (queue: string[], total = 0): Promise<number> => {
        if (queue.length === 0 || requestBudgetRef.value <= 0) return total;
        const [current, ...rest] = queue;
        const items = await fetchAllPages(current);
        walked.set(current, items);
        const childIds = items
          .filter((child) => (child.total_comments ?? 0) > 0)
          .map((child) => normalize(String(child.id)));
        return processQueue(rest.concat(childIds), total + items.length);
      };

      const total = await processQueue([root]);
      // Only a walk that finished within budget has every nested list complete.
      if (isThreadRoot && requestBudgetRef.value > 0) {
        const countOf = (id: string): number => (walked.get(id) ?? [])
          .reduce((sum, child) => sum + 1 + countOf(normalize(String(child.id))), 0);
        walked.forEach((children) => children.forEach((child) => {
          const replies = walked.get(normalize(String(child.id)));
          if (!replies) return;
          // The same first page the nested reply's own query would fetch.
          const key = ['post-comments', child.id];
          queryClient.setQueryData(key, replies.slice(0, 50));
          // The pending-posts watcher skips manual writes: put back what the
          // backend doesn't have yet, as the nested reply's own fetch did.
          pendingReplies(String(child.id))
            .forEach((reply) => appendToThread(queryClient, key, reply));
          queryClient.setQueryData(['post-desc-count', child.id], countOf(normalize(String(child.id))));
        }));
      }
      return total;
    },
  });

  const isContextMuted = !isActive && (allowInlineRepliesToggle === false || isThreaded);

  return (
    <article
      id={`post-${postId}`}
      ref={containerRef}
      className={cn(
        'feed-post',
        presentation === 'detail' && 'feed-post--detail',
        isCompact && 'feed-post--compact',
        !isActive && 'feed-post--clickable',
        isActive && 'feed-post--active',
        isContextMuted && 'feed-post--context',
      )}
      onClick={isActive ? undefined : (event) => {
        // A nested reply opens itself. Not stopPropagation: document click
        // listeners (hover cards, the composer's emoji picker) must still fire.
        const card = (event.target as Element).closest('.feed-post');
        if (card && card !== event.currentTarget && event.currentTarget.contains(card)) return;
        handleOpen();
      }}
      onKeyDown={isActive ? undefined : (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      role={isActive ? undefined : 'button'}
      tabIndex={isActive ? undefined : 0}
      aria-label={isActive ? undefined : t('common:aria.openPost')}
    >
      <PostAuthorHeader item={item} displayName={displayName} compact={isCompact} />
      <div className="feed-post__content">
        {/* Trend token holder pill (when viewing a token feed and author holds the token) */}
        {tokenHolderLabel && (
        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-100 font-medium">
          <span className="text-[13px]" aria-hidden="true">🏅</span>
          <span className="uppercase tracking-wide">{t('social:holder')}</span>
          <span className="text-emerald-100/80">
            ·
            {tokenHolderLabel}
          </span>
        </div>
        )}

        {rootPost && parentId && !hideParentContext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPost((rootPost as any)?.slug || String(rootPost.id).replace(/_v3$/, ''));
          }}
          className="mt-3 block w-full text-left bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 transition-none shadow-none hover:bg-white/[0.02] hover:border-white/40 hover:shadow-none"
          title={t('openParent')}
        >
          <div className="flex items-center mb-0.5 min-w-0 text-[11px] text-white/65">
            <span className="shrink-0 mr-1">{t('originalPost')}</span>
            <span className="font-semibold text-white/90 truncate whitespace-nowrap">
              {(profileDisplayNames?.[rootPost.sender_address] ?? chainNames?.[rootPost.sender_address] ?? '').trim() || formatAddress(rootPost.sender_address, 6, true)}
            </span>
            <span className="mx-2 text-white/50 shrink-0">·</span>
            <span className="text-white/60 whitespace-nowrap shrink-0" title={fullTimestamp(rootPost.created_at)}>
              {compactTime(rootPost.created_at, i18n.resolvedLanguage)}
            </span>
          </div>
          <div className="text-[12px] text-white/90 line-clamp-2">
            {linkify(rootPost.content, {
              knownChainNames: new Set(
                Object.values(chainNames || {}).map((n) => n?.toLowerCase()),
              ),
              hashtagVariant: 'post-inline',
              tokenTagInline: true,
              trendMentions: (rootPost as any)?.trend_mentions,
              hashtagAllowedChars,
            })}
          </div>
        </button>
        )}

        {/* Parent context header placed under author row, before reply text */}
        {parentId && !hideParentContext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const slugOrId = (parent as any)?.slug || String(parentId).replace(/_v3$/, '');
            onOpenPost(slugOrId);
          }}
          className={cn(rootPost ? 'mt-2' : 'mt-3', 'mb-2 block w-full text-left bg-white/[0.04] border border-white/15 rounded-xl p-3 transition-none shadow-none hover:bg-white/[0.04] hover:border-white/40 hover:shadow-none')}
          title={t('openParent')}
        >
          <div className="flex items-end mb-1 min-w-0">
            <span className="text-[11px] text-white/65 shrink-0 mr-1">{t('replyingTo')}</span>
            <div className="flex items-center gap-0.5 min-w-0 h-[18px]">
              <div className="translate-y-[2px]">
                <AddressAvatarWithChainName
                  address={parent?.sender_address || authorAddress}
                  size={16}
                  showAddressAndChainName={false}
                  variant="feed"
                />
              </div>
              <div className="text-[12px] font-semibold text-white/90 truncate whitespace-nowrap">
                {parent ? ((profileDisplayNames?.[parent.sender_address] ?? chainNames?.[parent.sender_address] ?? '').trim() || formatAddress(parent.sender_address, 6, true)) : t('parent')}
              </div>
            </div>
            <span className="mx-2 text-[11px] text-white/50 shrink-0">·</span>
            <div className="text-[11px] text-white/60 whitespace-nowrap shrink-0">
              {parent?.created_at ? (
                <span title={fullTimestamp(parent.created_at as unknown as string)}>
                  {compactTime(parent.created_at as unknown as string, i18n.resolvedLanguage)}
                </span>
              ) : '—'}
            </div>
          </div>
          <div className="text-[12px] text-white line-clamp-2">
            {parentError || !parent
              ? t('parentUnavailable')
              : linkify(parent.content, {
                knownChainNames: new Set(
                  Object.values(chainNames || {}).map((n) => n?.toLowerCase()),
                ),
                hashtagVariant: 'post-inline',
                // Clamped preview inside a <button>: inline pill only, never the block row.
                tokenTagInline: true,
                trendMentions: (parent as any)?.trend_mentions,
                hashtagAllowedChars,
              })}
          </div>
          <div className="mt-1 text-[11px] text-white/70">{t('showPost')}</div>
        </button>
        )}

        <PostContent
          content={item.content}
          options={{
            knownChainNames: new Set(
              Object.values(chainNames || {}).map((n) => n?.toLowerCase()),
            ),
            hashtagVariant: 'post-inline',
            trendMentions: item.trend_mentions,
            hashtagAllowedChars,
          }}
        />

        {item.content && shouldOfferTranslation((item as any)?.language, i18n.resolvedLanguage) && (
          <a
            href={translateUrl(item.content, i18n.resolvedLanguage || 'en')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[12px] text-white/60 no-underline hover:text-white hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Languages className="w-3.5 h-3.5" aria-hidden="true" />
            {t('translatePost')}
          </a>
        )}

        {/* Link preview (YouTube embed or OG card) */}
        <PostLinkPreview content={item.content || ''} />

        {/* Media */}
        {media.length > 0 && (
        <div
          className={cn(
            'feed-post__media mt-3 grid gap-2 rounded-xl overflow-hidden',
            media.length === 1 && 'grid-cols-1',
            media.length === 2 && 'grid-cols-2',
            media.length >= 3 && 'grid-cols-2',
          )}
        >
          {media.slice(0, 4).map((m: string) => (
            media.length === 1 ? (
              <AspectMedia key={`${postId}-${m}`} src={m} alt={t('common:aria.media')} maxHeight={presentation === 'detail' ? 320 : '50vh'} />
            ) : (
              <AspectMedia key={`${postId}-${m}`} src={m} alt={t('common:aria.media')} maxHeight={200} />
            )
          ))}
        </div>
        )}

        {presentation === 'detail' && (
          <time className="feed-post__published" dateTime={item.created_at}>
            {new Date(item.created_at).toLocaleString(i18n.resolvedLanguage, {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </time>
        )}

        {/* Actions */}
        <div className="feed-post__actions">
          <div className="feed-post__engagement">
            <button
              type="button"
              onClick={(e) => {
                if (onReply) {
                  e.stopPropagation();
                  onReply();
                } else if (allowInlineRepliesToggle) {
                  e.stopPropagation();
                  toggleReplies();
                  if (!showReplies) setTimeout(() => refetchChildReplies(), 0);
                } else {
                  e.stopPropagation();
                  handleOpen();
                }
              }}
              className="feed-post__reply"
              aria-label={onReply ? t('social:postLayout.reply') : t('social:postLayout.replies', { count: typeof descendantCount === 'number' ? descendantCount : commentCount })}
              aria-expanded={allowInlineRepliesToggle ? showReplies : undefined}
              aria-controls={onReply ? 'post-reply-composer' : replyControls}
            >
              <MessageCircle className="w-[15px] h-[15px]" strokeWidth={2} />
              <span>{typeof descendantCount === 'number' ? descendantCount : commentCount}</span>
              <span>{t('social:postLayout.reply')}</span>
            </button>
            <PostTipButton toAddress={authorAddress} postId={String(postId)} />
          </div>
          <SharePopover postId={item.id} postSlug={(item as any)?.slug} className="feed-post__share" />
        </div>

        {/* Nested replies for this item */}
        {showReplies && (
        <div id={`replies-${postId}`} className="mt-3 grid gap-2 pl-3 md:pl-5 border-l border-white/10">
          {childLoading && (
          <div className="text-[13px] text-white/70">{t('loadingReplies')}</div>
          )}
          {childError && (
          <div className="text-[13px] text-white/70">
            {t('social:errorLoadingReplies')}
            {' '}
            <button
              type="button"
              className="underline"
              onClick={(e) => { e.stopPropagation(); refetchChildReplies(); }}
            >
              {t('common:buttons.retry')}
            </button>
          </div>
          )}
          {!childLoading && !childError && childReplies.length === 0 && (
          <div className="text-[13px] text-white/60">{t('noRepliesYet')}</div>
          )}
          {childReplies.map((reply: PostDto) => (
            <ReplyToFeedItem
              key={reply.id}
              item={reply}
              commentCount={reply.total_comments ?? 0}
              hideParentContext
              allowInlineRepliesToggle={
                isThreaded
                && threadDepth + 1 < MAX_THREAD_DEPTH
                && (reply.total_comments ?? 0) > 0
              }
              threadDepth={isThreaded ? threadDepth + 1 : undefined}
              onOpenPost={onOpenPost}
            />
          ))}
        </div>
        )}
      </div>
    </article>
  );
});

ReplyToFeedItem.displayName = 'ReplyToFeedItem';

export default ReplyToFeedItem;
