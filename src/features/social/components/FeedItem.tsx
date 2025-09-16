import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { cn } from '@/lib/utils';
import { memo, useCallback } from 'react';
import { PostDto } from '../../../api/generated';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';
import { Badge } from '../../../components/ui/badge';
import { useChainName } from '../../../hooks/useChainName';
import { IconComment } from '../../../icons';
import { linkify } from '../../../utils/linkify';
import { relativeTime } from '../../../utils/time';

interface FeedItemProps {
  item: PostDto;
  commentCount: number;
  onItemClick: (postId: string) => void;
}

// Component: Individual Feed Item
const FeedItem = memo(({
  item,
  commentCount,
  onItemClick
}: FeedItemProps) => {
  const { chainName } = useChainName(item.sender_address);
  const postId = item.id;
  const authorAddress = item.sender_address;

  const handleItemClick = useCallback(() => {
    onItemClick(postId);
  }, [onItemClick, postId]);

  return (
    <AeCard
      variant="glass"
      className="transition-all duration-300 hover:-translate-y-2 hover:shadow-glow cursor-pointer border-glass-border"
      onClick={handleItemClick}
      style={{
        background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.06), transparent 40%), rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
      }}
    >
      <AeCardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <AddressAvatarWithChainName
                  address={authorAddress}
                  size={48}
                  overlaySize={24}
                />
              </div>
              {item.created_at && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {relativeTime(new Date(item.created_at))}
                </span>
              )}
            </div>
            <div className='ml-3' style={{ paddingLeft: '48px' }}>

              <div className="text-sm text-foreground leading-relaxed">
                {linkify(item.content)}
              </div>

              {item.media && Array.isArray(item.media) && item.media.length > 0 && (
                <div className={cn(
                  "grid gap-2 rounded-lg overflow-hidden",
                  item.media.length === 1 && "grid-cols-1",
                  item.media.length === 2 && "grid-cols-2",
                  item.media.length >= 3 && "grid-cols-2"
                )}>
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

              <div className="flex items-center justify-between pt-2 border-t border-muted/50">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-xs bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <IconComment className="w-3 h-3" />
                  {commentCount}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </AeCardContent>
    </AeCard>
  );
});

// Memoized FeedItem with performance optimizations
const MemoizedFeedItem = memo(FeedItem, (prevProps, nextProps) => {
  // Deep comparison for optimal re-rendering
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.chainName === nextProps.chainName &&
    prevProps.item.created_at === nextProps.item.created_at &&
    JSON.stringify(prevProps.item.media) === JSON.stringify(nextProps.item.media)
  );
});

FeedItem.displayName = 'FeedItem';
MemoizedFeedItem.displayName = 'MemoizedFeedItem';

export default MemoizedFeedItem;
