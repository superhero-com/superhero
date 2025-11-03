import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { PostDto } from "../../../api/generated";
import { PostsService } from "../../../api/generated";
// Using shared glass card styles via `genz-card` to match wallet/AE price cards
import { Badge } from "../../../components/ui/badge";
import { IconComment, IconLink } from "../../../icons";
import AddressFormatted from "../../../components/AddressFormatted";
import { linkify } from "../../../utils/linkify";
import { useWallet } from "../../../hooks";
import { relativeTime, compactTime, fullTimestamp } from "../../../utils/time";
import { CONFIG } from "../../../config";
import BlockchainInfoPopover from "./BlockchainInfoPopover";
import AspectMedia from "@/components/AspectMedia";

interface FeedItemProps {
  item: PostDto;
  commentCount: number;
  onItemClick: (postId: string) => void;
  isFirst?: boolean;
}

// Component: Individual Feed Item
const FeedItem = memo(({ item, commentCount, onItemClick, isFirst = false }: FeedItemProps) => {
  const { t } = useTranslation('social');
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames } = useWallet();
  const displayName = chainNames?.[authorAddress] || 'Legend';

  // Parse parentId from media/topics/tx_args tags such as "comment:<parentId>"
  const parentId: string | null = useMemo(() => {
    const extract = (value: unknown): string | null => {
      if (!value) return null;
      const asString = String(value);
      const m = asString.match(/comment[:/](?<id>[^\s,;]+)/i);
      const id = (m?.groups as any)?.id || (asString.startsWith('comment:') ? asString.split(':')[1] : null);
      if (!id) return null;
      return id.endsWith('_v3') ? id : `${id}_v3`;
    };

    // 1) media array
    if (Array.isArray((item as any)?.media)) {
      for (const m of (item as any).media) {
        const got = extract(m);
        if (got) return got;
      }
    }
    // 2) topics array
    if (Array.isArray((item as any)?.topics)) {
      for (const t of (item as any).topics) {
        const got = extract(t);
        if (got) return got;
      }
    }
    // 3) tx_args (nested arrays/objects possible)
    const scan = (node: any): string | null => {
      if (node == null) return null;
      if (typeof node === 'string') return extract(node);
      if (Array.isArray(node)) {
        for (const x of node) {
          const got = scan(x);
          if (got) return got;
        }
      } else if (typeof node === 'object') {
        for (const v of Object.values(node)) {
          const got = scan(v);
          if (got) return got;
        }
      }
      return null;
    };
    const fromArgs = scan((item as any)?.tx_args);
    if (fromArgs) return fromArgs;
    return null;
  }, [item]);

  // Fetch immediate parent for context header; best‑effort only
  const [parent, setParent] = useState<PostDto | null>(null);
  const [parentError, setParentError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadParent() {
      if (!parentId) return;
      try {
        const res = await PostsService.getById({ id: parentId });
        if (!cancelled) setParent(res as unknown as PostDto);
      } catch (e: any) {
        if (!cancelled) setParentError(e as Error);
      }
    }
    loadParent();
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  const handleItemClick = useCallback(() => {
    onItemClick(postId);
  }, [onItemClick, postId]);

  return (
    <div
      className="relative cursor-pointer w-screen -mx-[calc((100vw-100%)/2)] md:w-full md:mx-0 p-0 md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:backdrop-blur-[20px] md:rounded-[20px] md:transition-all md:duration-300 md:ease-out md:overflow-hidden md:hover:-translate-y-1"
      onClick={handleItemClick}
      role="button"
      aria-label="Open post"
    >
      <div className={cn("p-4 md:p-5", isFirst && "pt-1")}> 
        <div className="flex gap-3 items-start">
          {/* Left column: avatar only, aligned to top */}
          <div className="flex-shrink-0">
            <div className="md:hidden">
              <AddressAvatarWithChainNameFeed
                address={authorAddress}
                size={36}
                overlaySize={16}
                showAddressAndChainName={false}
              />
            </div>
            <div className="hidden md:block">
              <AddressAvatarWithChainNameFeed
                address={authorAddress}
                size={40}
                overlaySize={20}
                showAddressAndChainName={false}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2 md:space-y-3">
            {/* Context header for replies: immediate parent only */}
            {parentId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(parentId);
                }}
                className="w-full text-left bg-white/[0.04] border border-white/10 rounded-xl p-2.5 md:p-3 -mb-1 hover:bg-white/[0.06] transition-colors"
                title="Show full thread"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    <AddressAvatarWithChainNameFeed
                      address={parent?.sender_address || authorAddress}
                      size={20}
                      overlaySize={12}
                      showAddressAndChainName={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-[12px] font-semibold text-white/90 truncate">
                        {parent ? (chainNames?.[parent.sender_address] || 'Legend') : 'Parent post'}
                      </div>
                      <span className="text-[11px] text-white/50">·</span>
                      <div className="text-[11px] text-white/60 whitespace-nowrap">
                        {parent?.created_at ? compactTime(parent.created_at as unknown as string) : '—'}
                      </div>
                    </div>
                    <div className="text-[12px] text-white/80 line-clamp-2">
                      {parentError || !parent
                        ? 'Parent unavailable/not visible'
                        : linkify(parent.content, { knownChainNames: new Set(Object.values(chainNames || {}).map(n => n?.toLowerCase())) })}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-white/70">Show full thread</div>
              </button>
            )}
            {/* Primary header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-[14px] md:text-[15px] font-bold text-white truncate">
                    {displayName}
                  </div>
                  <span className="text-white/50">·</span>
                  {item.tx_hash ? (
                    <BlockchainInfoPopover
                      txHash={(item as any).tx_hash}
                      createdAt={item.created_at as unknown as string}
                      sender={(item as any).sender_address}
                      contract={(item as any).contract_address}
                      postId={String(item.id)}
                      triggerContent={
                        <span className="text-[12px] md:text-[13px] text-white/70 whitespace-nowrap" title={fullTimestamp(item.created_at as unknown as string)}>
                          {compactTime(item.created_at as unknown as string)}
                        </span>
                      }
                      triggerClassName=""
                    />
                  ) : (
                    <div className="text-[12px] md:text-[13px] text-white/70 whitespace-nowrap" title={fullTimestamp(item.created_at as unknown as string)}>
                      {compactTime(item.created_at as unknown as string)}
                    </div>
                  )}
                </div>
                <div className="text-[12px] text-foreground/90 font-mono leading-[0.9]">
                  <AddressFormatted address={authorAddress} truncate={false} />
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-3 whitespace-nowrap">
                {item.created_at ? (
                  <div className="text-xs text-white/60 leading-none" title={fullTimestamp(item.created_at as unknown as string)}>
                    {relativeTime(new Date(item.created_at))}
                  </div>
                ) : null}
                {item.tx_hash && CONFIG.EXPLORER_URL && (
                  <a
                    href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${item.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs leading-none text-white/60 no-gradient-text"
                    title={item.tx_hash}
                  >
                    <span>on-chain</span>
                    <IconLink className="w-2 h-2" />
                  </a>
                )}
              </div>
            </div>
            {/* Right-side block above handles on-chain link; remove duplicate area */}
            <div className="ml-0 md:ml-0 md:pl-0 md:mt-2 relative">
              <div className="text-[14px] md:text-[15px] text-foreground leading-snug">
              {linkify(item.content, { knownChainNames: new Set(Object.values(chainNames || {}).map(n => n?.toLowerCase())) })}
            </div>

{(() => {
              const filteredMedia = item.media && Array.isArray(item.media) 
                ? item.media.filter((m) => typeof m === 'string' ? !m.startsWith('comment:') : true)
                : [];
              
              if (filteredMedia.length === 0) return null;
              
              // For single media, try to parse intrinsic width/height embedded in URL hash (w,h)
              // Example: https://...gif#w=480&h=270
              const renderSingle = (url: string) => (
                <AspectMedia src={url} alt="media" />
              );

              return (
                <div
                  className={cn(
                    "grid gap-2 rounded-lg overflow-hidden",
                    filteredMedia.length === 1 && "grid-cols-1",
                    filteredMedia.length === 2 && "grid-cols-2",
                    filteredMedia.length >= 3 && "grid-cols-2"
                  )}
                >
                  {filteredMedia.slice(0, 4).map((m: string, index: number) => (
                    filteredMedia.length === 1 ? (
                      <div key={`${postId}-${index}`}>{renderSingle(m)}</div>
                    ) : (
                      <AspectMedia key={`${postId}-${index}`} src={m} alt="media" maxHeight={200} />
                    )
                  ))}
                </div>
              );
            })()}

              <div className="flex items-center justify-between mt-3 pt-2">
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 bg-transparent border-white/10 hover:border-white/20 transition-colors"
                  aria-label={t('commentsCount')}
                >
                  <IconComment className="w-[14px] h-[14px]" />
                  {commentCount}
                </Badge>
                {parentId && (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-white/80 hover:text-white transition-colors underline underline-offset-2"
                    onClick={(e) => { e.stopPropagation(); onItemClick(parentId); }}
                  >
                    {t('showFullThread')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Full-bleed divider on mobile */}
      <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc((100vw-100%-16px)/-2)] w-screen h-px bg-white/10" />
    </div>
  );
});

// Simple memo to avoid heavy comparator parsing issues
FeedItem.displayName = "FeedItem";

export default memo(FeedItem);
