import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { PostDto, PostsService } from "../../../api/generated";
import { IconComment } from "../../../icons";
import { linkify } from "../../../utils/linkify";
import BlockchainInfoPopover from "./BlockchainInfoPopover";
import { Badge } from "@/components/ui/badge";
import { useTransactionStatus } from "@/hooks/useTransactionStatus";
import SharePopover from "./SharePopover";
import PostTipButton from "./PostTipButton";
import { MessageCircle } from "lucide-react";
import { useWallet } from "../../../hooks";
import { relativeTime, compactTime, fullTimestamp } from "../../../utils/time";
import AspectMedia from "@/components/AspectMedia";
import { GlassSurface } from "@/components/ui/GlassSurface";

interface ReplyToFeedItemProps {
  item: PostDto;
  onOpenPost: (postId: string) => void;
  commentCount?: number;
  hideParentContext?: boolean; // when true, do not render parent context header
  allowInlineRepliesToggle?: boolean; // when false, clicking replies just opens post
  isActive?: boolean; // when true, visually highlight as the focused post
  compact?: boolean; // when true, use smaller spacing and fonts for widget display
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
      const id = m?.[1] || (asString.startsWith("comment:") ? asString.split(":")[1] : null);
      if (!id) return null;
      return id.endsWith("_v3") ? id : `${id}_v3`;
    };

    if (Array.isArray((item as any)?.media)) {
      for (const m of (item as any).media) {
        const got = extract(m);
        if (got) return got;
      }
    }
    if (Array.isArray((item as any)?.topics)) {
      for (const t of (item as any).topics) {
        const got = extract(t);
        if (got) return got;
      }
    }
    const scan = (node: any): string | null => {
      if (node == null) return null;
      if (typeof node === "string") return extract(node);
      if (Array.isArray(node)) {
        for (const x of node) {
          const got = scan(x);
          if (got) return got;
        }
      } else if (typeof node === "object") {
        for (const v of Object.values(node)) {
          const got = scan(v);
          if (got) return got;
        }
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
  compact = false,
  tokenHolderLabel,
}: ReplyToFeedItemProps) => {
  const { t } = useTranslation('social');
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames } = useWallet();
  const displayName = chainNames?.[authorAddress] || "Legend";

  const parentId = useParentId(item);
  
  // Use React Query for parent post to enable caching and request deduplication
  const {
    data: parent,
    error: parentError,
  } = useQuery({
    queryKey: ["post", parentId],
    queryFn: async () => {
      if (!parentId) return null;
      return await PostsService.getById({ id: parentId }) as unknown as PostDto;
    },
    enabled: !!parentId && !hideParentContext,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent excessive requests
  });

  // Nested replies state for this item
  const [showReplies, setShowReplies] = useState(false);
  const {
    data: childReplies = [],
    isLoading: childLoading,
    error: childError,
    refetch: refetchChildReplies,
  } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const normalizedId = String(postId).endsWith("_v3") ? String(postId) : `${String(postId)}_v3`;
      const result = await PostsService.getComments({ id: normalizedId, orderDirection: "ASC", limit: 50 }) as any;
      return result?.items || [];
    },
    enabled: showReplies,
    refetchInterval: 300 * 1000, // Reduced from 2 minutes to 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent excessive requests
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });

  const handleOpen = useCallback(() => {
    const slugOrId = (item as any)?.slug || String(postId).replace(/_v3$/, "");
    onOpenPost(slugOrId);
  }, [onOpenPost, postId, item]);
  const toggleReplies = useCallback(() => setShowReplies((s) => !s), []);

  const media = Array.isArray(item.media)
    ? item.media.filter((m) => (typeof m === "string" ? !m.startsWith("comment:") : true))
    : [];

  // Use backend-provided total_comments instead of fetching descendant count
  // The backend already provides total_comments which includes all descendant comments
  // This eliminates hundreds of unnecessary API requests per post
  const descendantCount = (item.total_comments ?? commentCount ?? 0);

  // Inline mined badge helper
  function MinedBadge({ txHash }: { txHash: string }) {
    const { status } = useTransactionStatus(txHash, { enabled: !!txHash, refetchInterval: 30000 }); // Reduced from 8s to 30s
    if (!status) return null;
    if (status.confirmed) {
      return <Badge className="border-green-500/30 bg-green-500/20 text-green-300">Mined</Badge>;
    }
    return <Badge variant="secondary" className="border-amber-400/30 bg-amber-400/15 text-amber-300">Pending</Badge>;
  }

  const isContextMuted = !isActive && allowInlineRepliesToggle === false;

  return (
    <GlassSurface
      className={cn(
        "relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-2 pt-4 pb-5 md:w-full md:mx-0 transition-colors",
        compact ? "md:p-3" : "md:p-5",
        isActive && "bg-white/[0.08] border-white/40",
        isContextMuted && "md:bg-white/[0.03] md:border-white/10"
      )}
      interactive={!isActive}
      onClick={isActive ? undefined : handleOpen}
      role={isActive ? undefined : "button"}
      aria-label={isActive ? undefined : "Open post"}
    >
      {/* Top-right on-chain button - positioned at top-right corner */}
      {item.tx_hash && (
        <div className="absolute top-0 right-0 z-30 translate-x-0 translate-y-0">
          <BlockchainInfoPopover
            txHash={item.tx_hash}
            createdAt={item.created_at as unknown as string}
            sender={item.sender_address}
            contract={(item as any).contract_address}
            postId={String(item.id)}
            className={compact ? "px-1" : "px-2"}
            showLabel
            compact={compact}
          />
        </div>
      )}
      {/* Main row: avatar next to name/time like X */}
      <div className={cn("flex items-start", compact ? "gap-1.5 md:gap-2" : "gap-2 md:gap-3")}>
        <div className="flex-shrink-0 pt-0.5">
          <div className="md:hidden">
            <AddressAvatarWithChainNameFeed address={authorAddress} size={compact ? 28 : 34} overlaySize={compact ? 12 : 16} showAddressAndChainName={false} />
          </div>
          <div className="hidden md:block">
            <AddressAvatarWithChainNameFeed address={authorAddress} size={compact ? 32 : 40} overlaySize={compact ? 14 : 20} showAddressAndChainName={false} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name · time */}
          <div className="flex items-center justify-between gap-2.5">
            <div className={cn("flex items-baseline min-w-0", compact ? "gap-1.5" : "gap-2.5")}>
              <div className={cn("font-semibold text-white truncate", compact ? "text-[13px]" : "text-[15px]")}>{displayName}</div>
              <span className="text-white/50 shrink-0">·</span>
              {item.tx_hash ? (
                <BlockchainInfoPopover
                  txHash={(item as any).tx_hash}
                  createdAt={item.created_at as unknown as string}
                  sender={(item as any).sender_address}
                  contract={(item as any).contract_address}
                  postId={String(item.id)}
                  triggerContent={
                    <span className={cn("text-white/70 whitespace-nowrap shrink-0", compact ? "text-[10px]" : "text-[12px]")} title={fullTimestamp(item.created_at as unknown as string)}>
                      {compactTime(item.created_at as unknown as string)}
                    </span>
                  }
                />
              ) : (
                <div className={cn("text-white/70 whitespace-nowrap shrink-0", compact ? "text-[10px]" : "text-[12px]")} title={fullTimestamp(item.created_at as unknown as string)}>{compactTime(item.created_at as unknown as string)}</div>
              )}
            </div>
          </div>
          <div className={cn("mt-0.5 text-white/65 font-mono leading-[1.2] truncate", compact ? "text-[8px] md:text-[9px]" : "text-[9px] md:text-[10px]")}>{authorAddress}</div>

          {/* Trend token holder pill (when viewing a token feed and author holds the token) */}
          {tokenHolderLabel && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-100 font-medium">
              <span className="text-[13px]" aria-hidden="true">🏅</span>
              <span className="uppercase tracking-wide">Holder</span>
              <span className="text-emerald-100/80">· {tokenHolderLabel}</span>
            </div>
          )}

          {/* Parent context header placed under author row, before reply text */}
          {parentId && !hideParentContext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const slugOrId = (parent as any)?.slug || String(parentId).replace(/_v3$/, "");
                onOpenPost(slugOrId);
              }}
              className={cn(
                "block w-full text-left bg-white/[0.04] border border-white/15 rounded-xl transition-none shadow-none hover:bg-white/[0.04] hover:border-white/40 hover:shadow-none",
                compact ? "mt-2 mb-1.5 p-2" : "mt-3 mb-2 p-3"
              )}
              title={t('openParent')}
            >
              <div className="flex items-end mb-1 min-w-0">
                <span className="text-[11px] text-white/65 shrink-0 mr-1">Replying to</span>
                <div className="flex items-center gap-0.5 min-w-0 h-[18px]">
                  <div className="translate-y-[2px]">
                    <AddressAvatarWithChainNameFeed
                      address={parent?.sender_address || authorAddress}
                      size={16}
                      overlaySize={12}
                      showAddressAndChainName={false}
                    />
                  </div>
                  <div className="text-[12px] font-semibold text-white/90 truncate whitespace-nowrap">
                    {parent ? chainNames?.[parent.sender_address] || "Legend" : "Parent"}
                  </div>
                </div>
                <span className="mx-2 text-[11px] text-white/50 shrink-0">·</span>
                <div className="text-[11px] text-white/60 whitespace-nowrap shrink-0">
                  {parent?.created_at ? (
                    <span title={fullTimestamp(parent.created_at as unknown as string)}>{compactTime(parent.created_at as unknown as string)}</span>
                  ) : "—"}
                </div>
              </div>
              <div className="text-[12px] text-white line-clamp-2">
                {parentError || !parent
                  ? "Parent unavailable/not visible"
                  : linkify(parent.content, { knownChainNames: new Set(Object.values(chainNames || {}).map((n) => n?.toLowerCase())) })}
              </div>
              <div className="mt-1 text-[11px] text-white/70">Show post</div>
            </button>
          )}

          {/* Body */}
          <div className={cn("mt-3 text-foreground leading-snug", compact ? "text-[13px]" : "text-[15px]")}>
            {linkify(item.content, { knownChainNames: new Set(Object.values(chainNames || {}).map((n) => n?.toLowerCase())) })}
          </div>

          {/* Media */}
          {media.length > 0 && (
            <div
              className={cn(
                "grid rounded-xl overflow-hidden",
                compact ? "mt-2 gap-1.5" : "mt-3 gap-2",
                media.length === 1 && "grid-cols-1",
                media.length === 2 && "grid-cols-2",
                media.length >= 3 && "grid-cols-2"
              )}
            >
              {media.slice(0, 4).map((m: string, index: number) => (
                media.length === 1 ? (
                  <AspectMedia key={`${postId}-${index}`} src={m} alt="media" maxHeight={compact ? 120 : undefined} />
                ) : (
                  <AspectMedia key={`${postId}-${index}`} src={m} alt="media" maxHeight={compact ? 120 : 200} />
                )
              ))}
            </div>
          )}

          {/* Actions */}
          <div className={cn("flex items-center justify-between", compact ? "mt-2" : "mt-4")}>
            <div className={cn("inline-flex items-center", compact ? "gap-2 md:gap-1.5" : "gap-4 md:gap-2")}>
              <PostTipButton toAddress={authorAddress} postId={String(postId)} compact={compact} />
              <button
                type="button"
                onClick={(e) => {
                  if (allowInlineRepliesToggle) {
                    e.stopPropagation();
                    toggleReplies();
                    if (!showReplies) setTimeout(() => refetchChildReplies(), 0);
                  } else {
                    // On post pages: do not toggle, just open the post
                    e.stopPropagation();
                    handleOpen();
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:transition-colors",
                  compact 
                    ? "text-[11px] px-0 py-0 md:px-1.5 md:py-0.5 md:h-[22px] md:min-h-[22px] md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25"
                    : "text-[13px] px-0 py-0 md:px-2.5 md:py-1 md:h-[28px] md:min-h-[28px] md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25"
                )}
                aria-expanded={allowInlineRepliesToggle ? showReplies : undefined}
                aria-controls={`replies-${postId}`}
              >
                <MessageCircle className={cn(compact ? "w-[12px] h-[12px]" : "w-[14px] h-[14px]")} strokeWidth={2.25} />
                {descendantCount}
              </button>
            </div>
            <SharePopover postId={item.id} postSlug={(item as any)?.slug} compact={compact} />
          </div>

          {/* Nested replies for this item */}
          {showReplies && (
            <div id={`replies-${postId}`} className="mt-3 grid gap-2 pl-3 md:pl-5 border-l border-white/10">
              {childLoading && (
                <div className="text-[13px] text-white/70">Loading replies…</div>
              )}
              {childError && (
                <div className="text-[13px] text-white/70">
                  Error loading replies. <button className="underline" onClick={(e) => { e.stopPropagation(); refetchChildReplies(); }}>Retry</button>
                </div>
              )}
              {!childLoading && !childError && childReplies.length === 0 && (
                <div className="text-[13px] text-white/60">No replies yet.</div>
              )}
              {childReplies.map((reply: PostDto) => (
                <ReplyToFeedItem
                  key={reply.id}
                  item={reply}
                  commentCount={reply.total_comments ?? 0}
                  hideParentContext
                  allowInlineRepliesToggle={false}
                  onOpenPost={(_id) => onOpenPost((reply as any)?.slug || String(reply.id).replace(/_v3$/,''))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Full-bleed divider on mobile */}
      <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc(50%-50dvw)] w-[100dvw] h-px bg-white/10" />
    </GlassSurface>
  );
});

ReplyToFeedItem.displayName = "ReplyToFeedItem";

export default ReplyToFeedItem;


