import { memo, useCallback } from 'react';
import { PostDto } from '../../../api/generated';
import UserBadge from '../../../components/UserBadge';
import { useChainName } from '../../../hooks/useChainName';
import { IconComment } from '../../../icons';
import { linkify } from '../../../utils/linkify';
import { relativeTime } from '../../../utils/time';
import PostAvatar from './PostAvatar';

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
    <div className="feed-item" key={postId}>
      {authorAddress && (
        <PostAvatar authorAddress={authorAddress} chainName={chainName} />
      )}

      <div className="content" onClick={handleItemClick} style={{ cursor: 'pointer' }}>
        <div className="header">
          <div className="author-section">
            {authorAddress && (
              <UserBadge address={authorAddress} showAvatar={false} chainName={chainName} />
            )}
          </div>
          {item.created_at && (
            <span className="timestamp">{relativeTime(new Date(item.created_at))}</span>
          )}
        </div>

        <div className="title">{linkify(item.content)}</div>

        {item.media && Array.isArray(item.media) && item.media.length > 0 && (
          <div className="media-grid">
            {item.media.slice(0, 4).map((m: string, index: number) => (
              <img
                key={`${postId}-${index}`}
                src={m}
                alt="media"
                className="media-item"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}

        <div className="post-footer">
          <span className="comment-count">
            <IconComment /> {commentCount}
          </span>
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
    prevProps.chainName === nextProps.chainName &&
    prevProps.item.created_at === nextProps.item.created_at &&
    JSON.stringify(prevProps.item.media) === JSON.stringify(nextProps.item.media)
  );
});

FeedItem.displayName = 'FeedItem';
MemoizedFeedItem.displayName = 'MemoizedFeedItem';

export default MemoizedFeedItem;
