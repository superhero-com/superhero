import React, { memo } from 'react';
import UserBadge from '../../../components/UserBadge';
import { relativeTime } from '../../../utils/time';
import PostAvatar from './PostAvatar';

interface Comment {
  id: string;
  text: string;
  timestamp: string;
  author?: string;
  address?: string;
  sender?: string;
  parentId?: string;
}

interface CommentItemProps {
  comment: Comment;
  chainNames: Record<string, string>;
}

// Component: Individual Comment Item
const CommentItem = memo(({ comment, chainNames }: CommentItemProps) => {
  const authorAddress = comment.address || comment.author || comment.sender;
  const chainName = chainNames?.[authorAddress];

  return (
    <div className="comment-item">
      <div className="comment-avatar">
        <PostAvatar 
          authorAddress={authorAddress} 
          chainName={chainName} 
          size={40} 
          overlaySize={20} 
        />
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <UserBadge 
            address={authorAddress} 
            showAvatar={false}
            chainName={chainName}
          />
          {comment.timestamp && (
            <span className="comment-timestamp">
              {relativeTime(new Date(comment.timestamp))}
            </span>
          )}
        </div>
        <div className="comment-text">{comment.text}</div>
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
export type { Comment, CommentItemProps };
