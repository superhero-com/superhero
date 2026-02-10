import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { cn } from '@/lib/utils';
import {
  memo, useCallback, useEffect, useMemo, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { AspectMedia } from '@/components/AspectMedia';
import { PostDto, PostsService } from '../../../api/generated';
import { linkify } from '../../../utils/linkify';
import { formatAddress } from '../../../utils/address';
import { BlockchainInfoPopover } from './BlockchainInfoPopover';
import SharePopover from './SharePopover';
import PostTipButton from './PostTipButton';
import { useWallet } from '../../../hooks';
import { compactTime, fullTimestamp } from '../../../utils/time';

interface ReplyToFeedItemProps {
  item: PostDto;
  onOpenPost: (postId: string) => void;
  commentCount?: number;
  hideParentContext?: boolean; // when true, do not render parent context header
  allowInlineRepliesToggle?: boolean; // when false, clicking replies just opens post
  isActive?: boolean; // when true, visually highlight as the focused post
  /**
   * Optional label used on Trend token pages to indicate that the author
   * is a holder of the current token, including their balance, e.g.:
   * "123.45 TOKEN".
   */
  tokenHolderLabel?: string;
}

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
    if (Array.isArray((item as any)?.topics)) {
      const found = (item as any).topics.map((t: unknown) => extract(t)).find(Boolean);
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
  tokenHolderLabel,
}: ReplyToFeedItemProps) => {
  const { t } = useTranslation(['common', 'social']);
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames, profileDisplayNames } = useWallet();
  const displayName = profileDisplayNames?.[authorAddress] ?? chainNames?.[authorAddress] ?? t('common:defaultDisplayName');

  const parentId = useParentId(item);
  const [parent, setParent] = useState<PostDto | null>(null);
  const [parentError, setParentError] = useState<Error | null>(null);

  // Nested replies state for this item
  const [showReplies, setShowReplies] = useState(false);
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
    refetchInterval: 120 * 1000,
  });

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
    // Always enable for this post so counts can update from 0 → N over time.
    enabled: !!postId,
    // Periodically refresh to keep counts from going stale.
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const normalize = (id: string) => (String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`);
      const root = normalize(String(postId));
      const requestBudgetRef = { value: 150 }; // safety cap per item

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
        const childIds = items
          .filter((child) => (child.total_comments ?? 0) > 0)
          .map((child) => normalize(String(child.id)));
        return processQueue(rest.concat(childIds), total + items.length);
      };

      return processQueue([root]);
    },
  });

  const isContextMuted = !isActive && allowInlineRepliesToggle === false;

  return (
    <article
      className={cn(
        'relative w-full px-3 md:px-4 py-4 md:py-5 border-b border-white/10 bg-transparent transition-colors',
        !isActive && 'cursor-pointer hover:bg-white/[0.04]',
        isActive && 'bg-white/[0.06] border-white/25',
        isContextMuted && 'bg-white/[0.02] border-white/10',
      )}
      onClick={isActive ? undefined : handleOpen}
      onKeyDown={isActive ? undefined : (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      role={isActive ? undefined : 'button'}
      tabIndex={isActive ? undefined : 0}
      aria-label={isActive ? undefined : 'Open post'}
    >
      {/* Top-right on-chain button */}
      {item.tx_hash && (
        <div className="absolute top-4 right-2 md:top-5 md:right-5 z-10">
          <BlockchainInfoPopover
            txHash={item.tx_hash}
            createdAt={item.created_at as unknown as string}
            sender={item.sender_address}
            contract={(item as any).contract_address}
            postId={String(item.id)}
            className="px-2"
            showLabel
          />
        </div>
      )}
      {/* Main row: avatar left, content right */}
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 pt-0.5">
          <div className="md:hidden">
            <AddressAvatarWithChainName address={authorAddress} size={36} showAddressAndChainName={false} variant="feed" />
          </div>
          <div className="hidden md:block">
            <AddressAvatarWithChainName address={authorAddress} size={40} showAddressAndChainName={false} variant="feed" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name · handle (wide desktop) · time */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[15px] font-semibold text-white truncate">{displayName}</div>
            <span className="hidden 2xl:inline text-[13px] text-white/60 font-mono truncate">
              @
              {authorAddress}
            </span>
            <span className="text-white/50 shrink-0">·</span>
            {item.tx_hash ? (
              <BlockchainInfoPopover
                txHash={(item as any).tx_hash}
                createdAt={item.created_at as unknown as string}
                sender={(item as any).sender_address}
                contract={(item as any).contract_address}
                postId={String(item.id)}
                triggerContent={(
                  <span className="text-[12px] text-white/70 whitespace-nowrap shrink-0" title={fullTimestamp(item.created_at as unknown as string)}>
                    {compactTime(item.created_at as unknown as string)}
                  </span>
                )}
              />
            ) : (
              <div className="text-[12px] text-white/70 whitespace-nowrap shrink-0" title={fullTimestamp(item.created_at as unknown as string)}>{compactTime(item.created_at as unknown as string)}</div>
            )}
          </div>

          <div className="mt-1 text-[12px] text-white/60 font-mono leading-[1.2] truncate 2xl:hidden">
            {formatAddress(authorAddress, 4, true)}
          </div>

          {/* Trend token holder pill (when viewing a token feed and author holds the token) */}
          {tokenHolderLabel && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-100 font-medium">
              <span className="text-[13px]" aria-hidden="true">🏅</span>
              <span className="uppercase tracking-wide">Holder</span>
              <span className="text-emerald-100/80">
                ·
                {tokenHolderLabel}
              </span>
            </div>
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
              className="mt-3 mb-2 block w-full text-left bg-white/[0.04] border border-white/15 rounded-xl p-3 transition-none shadow-none hover:bg-white/[0.04] hover:border-white/40 hover:shadow-none"
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
                    {parent ? (profileDisplayNames?.[parent.sender_address] ?? chainNames?.[parent.sender_address] ?? t('common:defaultDisplayName')) : t('parent')}
                  </div>
                </div>
                <span className="mx-2 text-[11px] text-white/50 shrink-0">·</span>
                <div className="text-[11px] text-white/60 whitespace-nowrap shrink-0">
                  {parent?.created_at ? (
                    <span title={fullTimestamp(parent.created_at as unknown as string)}>
                      {compactTime(parent.created_at as unknown as string)}
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
                    trendMentions: (parent as any)?.trend_mentions,
                  })}
              </div>
              <div className="mt-1 text-[11px] text-white/70">{t('showPost')}</div>
            </button>
          )}

          {/* Body */}
          <div className="mt-2 text-[15px] text-foreground leading-snug">
            {linkify(item.content, {
              knownChainNames: new Set(
                Object.values(chainNames || {}).map((n) => n?.toLowerCase()),
              ),
              hashtagVariant: 'post-inline',
              trendMentions: (item as any)?.trend_mentions,
            })}
          </div>

          {/* Media */}
          {media.length > 0 && (
            <div
              className={cn(
                'mt-3 grid gap-2 rounded-xl overflow-hidden',
                media.length === 1 && 'grid-cols-1',
                media.length === 2 && 'grid-cols-2',
                media.length >= 3 && 'grid-cols-2',
              )}
            >
              {media.slice(0, 4).map((m: string) => (
                media.length === 1 ? (
                  <AspectMedia key={`${postId}-${m}`} src={m} alt="media" />
                ) : (
                  <AspectMedia key={`${postId}-${m}`} src={m} alt="media" maxHeight={200} />
                )
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-5 text-[13px] text-white/70">
              <button
                type="button"
                onClick={(e) => {
                  if (allowInlineRepliesToggle) {
                    e.stopPropagation();
                    toggleReplies();
                    if (!showReplies) setTimeout(() => refetchChildReplies(), 0);
                  } else {
                    e.stopPropagation();
                    handleOpen();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-0 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 hover:text-white"
                aria-expanded={allowInlineRepliesToggle ? showReplies : undefined}
                aria-controls={`replies-${postId}`}
              >
                <MessageCircle className="w-[15px] h-[15px]" strokeWidth={2} />
                {typeof descendantCount === 'number' ? descendantCount : commentCount}
              </button>
              <PostTipButton toAddress={authorAddress} postId={String(postId)} />
            </div>
            <SharePopover postId={item.id} postSlug={(item as any)?.slug} />
          </div>

          {/* Nested replies for this item */}
          {showReplies && (
            <div id={`replies-${postId}`} className="mt-3 grid gap-2 pl-3 md:pl-5 border-l border-white/10">
              {childLoading && (
                <div className="text-[13px] text-white/70">{t('loadingReplies')}</div>
              )}
              {childError && (
                <div className="text-[13px] text-white/70">
                  Error loading replies.
                  {' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={(e) => { e.stopPropagation(); refetchChildReplies(); }}
                  >
                    Retry
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
                  allowInlineRepliesToggle={false}
                  onOpenPost={() => onOpenPost((reply as any)?.slug || String(reply.id).replace(/_v3$/, ''))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

ReplyToFeedItem.displayName = 'ReplyToFeedItem';

export default ReplyToFeedItem;
