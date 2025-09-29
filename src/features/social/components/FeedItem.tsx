import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { cn } from "@/lib/utils";
import { memo, useCallback } from "react";
import { PostDto } from "../../../api/generated";
// Using shared glass card styles via `genz-card` to match wallet/AE price cards
import { Badge } from "../../../components/ui/badge";
import { IconComment, IconLink } from "../../../icons";
import AddressFormatted from "../../../components/AddressFormatted";
import { linkify } from "../../../utils/linkify";
import { useWallet } from "../../../hooks";
import { relativeTime, compactTime } from "../../../utils/time";
import { CONFIG } from "../../../config";

interface FeedItemProps {
  item: PostDto;
  commentCount: number;
  onItemClick: (postId: string) => void;
}

// Component: Individual Feed Item
const FeedItem = memo(({ item, commentCount, onItemClick }: FeedItemProps) => {
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames } = useWallet();
  const displayName = chainNames?.[authorAddress] || 'Legend';

  const handleItemClick = useCallback(() => {
    onItemClick(postId);
  }, [onItemClick, postId]);

  return (
    <div
      className="relative cursor-pointer w-screen -mx-[calc((100vw-100%)/2)] md:w-full md:mx-0 p-0 md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:backdrop-blur-[20px] md:rounded-[20px] md:transition-all md:duration-300 md:ease-out md:overflow-hidden md:hover:-translate-y-1"
      onClick={handleItemClick}
    >
      <div className="p-4 md:p-5">
        <div className="flex gap-2 items-start">
          {/* Left column: avatar only, aligned to top */}
          <div className="flex-shrink-0">
            <div className="md:hidden">
              <AddressAvatarWithChainNameFeed
                address={authorAddress}
                size={32}
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
            <div className="flex flex-col gap-0 md:flex-row md:items-start md:justify-between md:gap-2">
              <div className="flex-1 min-w-0">
                {/* Name + address (always visible) */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] md:text-[15px] font-bold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent">
                      {displayName}
                    </div>
                    <div className="md:hidden text-[13px] leading-none text-white/70 ml-2 transition-none">
                      {compactTime(item.created_at as unknown as string)}
                    </div>
                  </div>
                  <div className="text-xs text-foreground/90 font-mono leading-[0.9]">
                    <AddressFormatted address={authorAddress} truncate={false} />
                  </div>
                  {/* Mobile on-chain link removed intentionally */}
                </div>
              </div>
              {/* Desktop timestamp + on-chain link (stacked) */}
              <div className="hidden md:flex md:flex-col md:items-end md:gap-1 ml-3">
                <div className="text-xs text-white/60 leading-none whitespace-nowrap">
                  {item.created_at ? relativeTime(new Date(item.created_at)) : ''}
                </div>
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

            {item.media &&
              Array.isArray(item.media) &&
              item.media.length > 0 && (
                <div
                  className={cn(
                    "grid gap-2 rounded-lg overflow-hidden",
                    item.media.length === 1 && "grid-cols-1",
                    item.media.length === 2 && "grid-cols-2",
                    item.media.length >= 3 && "grid-cols-2"
                  )}
                >
                  {item.media.slice(0, 4).map((m: string, index: number) => (
                    <img
                      key={`${postId}-${index}`}
                      src={m}
                      alt="media"
                      className={cn(
                        "w-full object-cover rounded transition-transform hover:scale-105",
                        item.media.length === 1 ? "h-48" : "h-24"
                      )}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 bg-transparent border-white/10 hover:border-white/20 transition-colors"
              >
                <IconComment className="w-[14px] h-[14px]" />
                {commentCount}
              </Badge>
              {/* On-chain link moved to header (top-left) */}
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
