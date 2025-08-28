import React, { memo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import UserBadge from '../../../components/UserBadge';
import AeButton from '../../../components/AeButton';
import { IconComment } from '../../../icons';
import { relativeTime } from '../../../utils/time';
import { linkify } from '../../../utils/linkify';
import { PostDto, PostsService } from '../../../api/generated';
import PostAvatar from './PostAvatar';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: PostDto;
  chainNames: Record<string, string>;
  onCommentAdded?: () => void;
  depth?: number;
  maxDepth?: number;
}

// Component: Individual Comment Item (which is actually a nested post)
const CommentItem = memo(({ 
  comment, 
  chainNames, 
  onCommentAdded,
  depth = 0,
  maxDepth = 3
}: CommentItemProps) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  
  const authorAddress = comment.sender_address;
  const chainName = chainNames?.[authorAddress];
  const hasReplies = comment.total_comments > 0;
  const canReply = depth < maxDepth;

  // Query for comment replies - only fetch when showReplies is true
  const {
    data: fetchedReplies = [],
    isLoading: repliesLoading,
    error: repliesError,
    refetch: refetchReplies
  } = useQuery({
    queryKey: ['comment-replies', comment.id],
    queryFn: async () => {
      const result = await PostsService.getComments({
        id: comment.id,
        limit: 100
      }) as any;
      return result?.items || [];
    },
    enabled: showReplies && hasReplies,
    refetchInterval: 120 * 1000,
  });

  const handleReplyClick = useCallback(() => {
    setShowReplyForm(!showReplyForm);
  }, [showReplyForm]);

  const handleCommentAdded = useCallback(() => {
    setShowReplyForm(false);
    // Refetch this comment's replies if they're currently shown
    if (showReplies && hasReplies) {
      refetchReplies();
    }
    if (onCommentAdded) {
      onCommentAdded();
    }
  }, [onCommentAdded, showReplies, hasReplies, refetchReplies]);

  const toggleReplies = useCallback(() => {
    setShowReplies(!showReplies);
  }, [showReplies]);

  return (
    <div className={`comment-item depth-${depth}`}>
      <div className="comment-avatar">
        <PostAvatar 
          authorAddress={authorAddress} 
          chainName={chainName} 
          size={Math.max(32, 40 - depth * 4)} 
          overlaySize={Math.max(16, 20 - depth * 2)} 
        />
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <UserBadge 
            address={authorAddress} 
            showAvatar={false}
            chainName={chainName}
          />
          {comment.created_at && (
            <span className="comment-timestamp">
              {relativeTime(new Date(comment.created_at))}
            </span>
          )}
        </div>
        
        <div className="comment-text">{linkify(comment.content)}</div>
        
        {/* Media display for comments */}
        {comment.media && Array.isArray(comment.media) && comment.media.length > 0 && (
          <div className="comment-media-grid">
            {comment.media.slice(0, 2).map((m: string, index: number) => (
              <img 
                key={`${comment.id}-${index}`} 
                src={m} 
                alt="media" 
                className="comment-media-item"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}
        
        <div className="comment-actions">
          <div className="comment-stats">
            {hasReplies && (
              <button 
                className="replies-toggle"
                onClick={toggleReplies}
              >
                <IconComment /> 
                {comment.total_comments} {comment.total_comments === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
          
          {canReply && (
            <div className="comment-reply-actions">
              <AeButton
                variant="ghost"
                size="sm"
                onClick={handleReplyClick}
              >
                Reply
              </AeButton>
            </div>
          )}
        </div>
        
        {/* Reply form */}
        {showReplyForm && canReply && (
          <div className="reply-form-container">
            <CommentForm 
              postId={comment.id} 
              onCommentAdded={handleCommentAdded}
              placeholder="Write a reply..."
            />
          </div>
        )}
        
        {/* Nested replies */}
        {hasReplies && showReplies && (
          <div className="comment-replies">
            {repliesLoading && (
              <div className="replies-loading">Loading replies...</div>
            )}
            {repliesError && (
              <div className="replies-error">Error loading replies</div>
            )}
            {fetchedReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                chainNames={chainNames}
                onCommentAdded={handleCommentAdded}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
export type { CommentItemProps };
