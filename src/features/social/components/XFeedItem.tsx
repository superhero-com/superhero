import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { PostDto, PostsService } from "../../../api/generated";
import { IconComment } from "../../../icons";
import { linkify } from "../../../utils/linkify";
import { useWallet } from "../../../hooks";
import { relativeTime, compactTime } from "../../../utils/time";
import { CONFIG } from "../../../config";

interface XFeedItemProps {
  item: PostDto;
  onOpenPost: (postId: string) => void;
  commentCount?: number;
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
const XFeedItem = memo(({ item, onOpenPost, commentCount = 0 }: XFeedItemProps) => {
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames } = useWallet();
  const displayName = chainNames?.[authorAddress] || "Legend";

  const parentId = useParentId(item);
  const [parent, setParent] = useState<PostDto | null>(null);
  const [parentError, setParentError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!parentId) return;
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
  }, [parentId]);

  const handleOpen = useCallback(() => onOpenPost(postId), [onOpenPost, postId]);

  const media = Array.isArray(item.media)
    ? item.media.filter((m) => (typeof m === "string" ? !m.startsWith("comment:") : true))
    : [];

  return (
    <article
      className="relative w-full p-4 md:p-5 bg-transparent md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:rounded-2xl md:backdrop-blur-xl transition-colors hover:border-white/25 hover:shadow-none"
      onClick={handleOpen}
      role="button"
      aria-label="Open post"
    >
      {/* Main row: avatar next to name/time like X */}
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 pt-0.5">
          <AddressAvatarWithChainNameFeed address={authorAddress} size={40} overlaySize={20} showAddressAndChainName={false} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name · time */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate">{displayName}</div>
              <span className="text-white/50 shrink-0">·</span>
              <div className="text-[12px] text-white/70 whitespace-nowrap shrink-0">{compactTime(item.created_at as unknown as string)}</div>
            </div>
            {/* On-chain link removed */}
          </div>
          <div className="mt-1 text-[11px] text-white/65 font-mono leading-[0.9] truncate">{authorAddress}</div>

          {/* Parent context header placed under author row, before reply text */}
          {parentId && (
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
                  {parent?.created_at ? compactTime(parent.created_at as unknown as string) : "—"}
                </div>
              </div>
              <div className="text-[12px] text-white line-clamp-2">
                {parentError || !parent
                  ? "Parent unavailable/not visible"
                  : linkify(parent.content, { knownChainNames: new Set(Object.values(chainNames || {}).map((n) => n?.toLowerCase())) })}
              </div>
              <div className="mt-1 text-[11px] text-white/70">Show full thread</div>
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
            <div className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10">
              <IconComment className="w-[14px] h-[14px]" />
              {commentCount}
            </div>
            {/* Single 'Show full thread' link kept in the parent header only */}
          </div>
        </div>
      </div>
    </article>
  );
});

XFeedItem.displayName = "XFeedItem";

export default XFeedItem;


