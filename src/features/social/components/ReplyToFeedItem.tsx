import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { CONFIG } from "../../../config";

interface ReplyToFeedItemProps {
  item: PostDto;
  onOpenPost: (postId: string) => void;
  commentCount?: number;
  hideParentContext?: boolean; // when true, do not render parent context header
  allowInlineRepliesToggle?: boolean; // when false, clicking replies just opens post
  isActive?: boolean; // when true, visually highlight as the focused post
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
const ReplyToFeedItem = memo(({ item, onOpenPost, commentCount = 0, hideParentContext = false, allowInlineRepliesToggle = true, isActive = false }: ReplyToFeedItemProps) => {
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames } = useWallet();
  const displayName = chainNames?.[authorAddress] || "Legend";

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
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const normalizedId = String(postId).endsWith("_v3") ? String(postId) : `${String(postId)}_v3`;
      const result = await PostsService.getComments({ id: normalizedId, orderDirection: "ASC", limit: 50 }) as any;
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

  const handleOpen = useCallback(() => onOpenPost(postId), [onOpenPost, postId]);
  const toggleReplies = useCallback(() => setShowReplies((s) => !s), []);

  const media = Array.isArray(item.media)
    ? item.media.filter((m) => (typeof m === "string" ? !m.startsWith("comment:") : true))
    : [];

  // Inline mined badge helper
  function MinedBadge({ txHash }: { txHash: string }) {
    const { status } = useTransactionStatus(txHash, { enabled: !!txHash, refetchInterval: 8000 });
    if (!status) return null;
    if (status.confirmed) {
      return <Badge className="border-green-500/30 bg-green-500/20 text-green-300">Mined</Badge>;
    }
    return <Badge variant="secondary" className="border-amber-400/30 bg-amber-400/15 text-amber-300">Pending</Badge>;
  }

  const isContextMuted = !isActive && allowInlineRepliesToggle === false;

  return (
    <article
      className={cn(
        "relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-2 pt-4 pb-5 md:w-full md:mx-0 md:p-5 bg-transparent md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:rounded-2xl md:backdrop-blur-xl transition-colors hover:border-white/25 hover:shadow-none",
        isActive && "bg-white/[0.06] md:bg-white/[0.08] md:border-white/40",
        isContextMuted && "md:bg-white/[0.03] md:border-white/10"
      )}
      onClick={handleOpen}
      role="button"
      aria-label="Open post"
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
      {/* Main row: avatar next to name/time like X */}
      <div className="flex gap-2 md:gap-3 items-start">
        <div className="flex-shrink-0 pt-0.5">
          <div className="md:hidden">
            <AddressAvatarWithChainNameFeed address={authorAddress} size={34} overlaySize={16} showAddressAndChainName={false} />
          </div>
          <div className="hidden md:block">
            <AddressAvatarWithChainNameFeed address={authorAddress} size={40} overlaySize={20} showAddressAndChainName={false} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name · time */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate">{displayName}</div>
              <span className="text-white/50 shrink-0">·</span>
              {item.tx_hash ? (
                <BlockchainInfoPopover
                  txHash={(item as any).tx_hash}
                  createdAt={item.created_at as unknown as string}
                  sender={(item as any).sender_address}
                  contract={(item as any).contract_address}
                  postId={String(item.id)}
                  triggerContent={
                    <span className="text-[12px] text-white/70 whitespace-nowrap shrink-0" title={fullTimestamp(item.created_at as unknown as string)}>
                      {compactTime(item.created_at as unknown as string)}
                    </span>
                  }
                />
              ) : (
                <div className="text-[12px] text-white/70 whitespace-nowrap shrink-0" title={fullTimestamp(item.created_at as unknown as string)}>{compactTime(item.created_at as unknown as string)}</div>
              )}
            </div>
          </div>
          <div className="mt-1 text-[9px] md:text-[10px] text-white/65 font-mono leading-[1.2] truncate">{authorAddress}</div>

          {/* Parent context header placed under author row, before reply text */}
          {parentId && !hideParentContext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPost(parentId);
              }}
              className="mt-3 mb-2 block w-full text-left bg-white/[0.04] border border-white/15 rounded-xl p-3 transition-none shadow-none hover:bg-white/[0.04] hover:border-white/40 hover:shadow-none"
              title="Open parent"
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
          <div className="mt-3 text-[15px] text-foreground leading-snug">
            {linkify(item.content, { knownChainNames: new Set(Object.values(chainNames || {}).map((n) => n?.toLowerCase())) })}
          </div>

          {/* Media */}
          {media.length > 0 && (
            <div
              className={cn(
                "mt-3 grid gap-2 rounded-xl overflow-hidden",
                media.length === 1 && "grid-cols-1",
                media.length === 2 && "grid-cols-2",
                media.length >= 3 && "grid-cols-2"
              )}
            >
              {media.slice(0, 4).map((m: string, index: number) => (
                <img
                  key={`${postId}-${index}`}
                  src={m}
                  alt="media"
                  className={cn("w-full object-cover rounded transition-transform hover:scale-[1.02]", media.length === 1 ? "h-60" : "h-36")}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-4 md:gap-2">
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
              className="inline-flex items-center gap-1.5 text-[13px] px-0 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:px-2.5 md:py-1 md:h-[28px] md:min-h-[28px] md:bg-white/[0.04] md:border md:border-white/10 md:hover:border-white/20 md:!border md:!border-white/15 md:hover:!border-white/30 transition-colors"
              aria-expanded={allowInlineRepliesToggle ? showReplies : undefined}
              aria-controls={`replies-${postId}`}
            >
              <MessageCircle className="w-[14px] h-[14px]" strokeWidth={2.25} />
              {commentCount}
            </button>
              <PostTipButton toAddress={authorAddress} postId={String(postId)} />
            </div>
            <SharePopover postId={item.id} />
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
                  onOpenPost={(id) => onOpenPost(String(id).replace(/_v3$/,''))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Full-bleed divider on mobile */}
      <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc(50%-50dvw)] w-[100dvw] h-px bg-white/10" />
    </article>
  );
});

ReplyToFeedItem.displayName = "ReplyToFeedItem";

export default ReplyToFeedItem;


