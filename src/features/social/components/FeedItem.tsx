import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import { cn } from "@/lib/utils";
import { memo, useCallback } from "react";
import { PostDto } from "../../../api/generated";
// Using shared glass card styles via `genz-card` to match wallet/AE price cards
import { Badge } from "../../../components/ui/badge";
import { IconComment, IconLink } from "../../../icons";
import { linkify } from "../../../utils/linkify";
import { useWallet } from "../../../hooks";
import { relativeTime } from "../../../utils/time";
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

  const handleItemClick = useCallback(() => {
    onItemClick(postId);
  }, [onItemClick, postId]);

  return (
    <div className="glass-card cursor-pointer w-full" onClick={handleItemClick}>
      <div className="flex gap-3">
        <div className="flex-1 min-w-0 space-y-2 md:space-y-1">
            <div className="flex flex-col gap-0 md:flex-row md:items-start md:justify-between md:gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: smaller avatar */}
              <div className="md:hidden">
                <AddressAvatarWithChainName
                  address={authorAddress}
                  size={32}
                  overlaySize={16}
                  contentClassName="translate-y-[2px]"
                  secondary={(
                    item.tx_hash && CONFIG.EXPLORER_URL ? (
                      <a
                        href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${item.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="md:hidden inline-flex items-center gap-0.5 text-[11px] leading-none text-light-font-color no-gradient-text group min-h-0 min-w-0 p-0 h-auto mt-1"
                        title={item.tx_hash}
                      >
                        <span className="underline-offset-2 group-hover:underline">
                          {`Posted on-chain${item.created_at ? ` ${relativeTime(new Date(item.created_at))}` : ''}`}
                        </span>
                        <IconLink className="w-2 h-2" />
                      </a>
                    ) : null
                  )}
                />
              </div>
              {/* Desktop/tablet: original avatar size */}
              <div className="hidden md:block">
                <AddressAvatarWithChainName
                  address={authorAddress}
                  size={40}
                  overlaySize={20}
                  contentClassName="translate-y-[2px]"
                  secondary={(
                    item.tx_hash && CONFIG.EXPLORER_URL ? (
                      <a
                        href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${item.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="md:hidden inline-flex items-center gap-0.5 text-[11px] leading-none text-light-font-color no-gradient-text group min-h-0 min-w-0 p-0 h-auto mt-1"
                        title={item.tx_hash}
                      >
                        <span className="underline-offset-2 group-hover:underline">
                          {`Posted on-chain${item.created_at ? ` ${relativeTime(new Date(item.created_at))}` : ''}`}
                        </span>
                        <IconLink className="w-2 h-2" />
                      </a>
                    ) : null
                  )}
                />
              </div>
            </div>
            {item.tx_hash && CONFIG.EXPLORER_URL && (
              <div className="hidden md:flex md:items-center md:gap-2 md:flex-shrink-0">
                <a
                  href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${item.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 md:gap-1 text-[11px] md:text-xs leading-none md:leading-normal text-light-font-color hover:text-light-font-color no-gradient-text md:self-start group min-h-0 min-w-0 p-0 h-auto"
                  title={item.tx_hash}
                >
                  <span className="underline-offset-2 group-hover:underline">
                    {`Posted on-chain${item.created_at ? ` ${relativeTime(new Date(item.created_at))}` : ''}`}
                  </span>
                  <IconLink className="w-2 h-2 md:w-2.5 md:h-2.5" />
                </a>
              </div>
            )}
          </div>
          <div className="ml-0 md:ml-3 md:pl-10 md:-mt-1 relative">
            <div className="text-[15px] text-foreground leading-snug">
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
  );
});

// Memoized FeedItem with performance optimizations
const MemoizedFeedItem = memo(FeedItem, (prevProps, nextProps) => {
  // Deep comparison for optimal re-rendering
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.item.created_at === nextProps.item.created_at &&
    JSON.stringify(prevProps.item.media) ===
      JSON.stringify(nextProps.item.media)
  );
});

FeedItem.displayName = "FeedItem";
MemoizedFeedItem.displayName = "MemoizedFeedItem";

export default MemoizedFeedItem;
