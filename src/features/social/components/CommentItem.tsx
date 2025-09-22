import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { memo, useCallback, useState } from 'react';
import { PostDto, PostsService } from '../../../api/generated';
import { AeButton } from '../../../components/ui/ae-button';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';
import { Badge } from '../../../components/ui/badge';
import { IconComment, IconLink } from '../../../icons';
import { linkify } from '../../../utils/linkify';
import { relativeTime } from '../../../utils/time';
import CommentForm from './CommentForm';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../../../config';

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
  const navigate = useNavigate();
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
    navigate(`/post/${comment.id}`);
    // setShowReplies(!showReplies);
  }, [showReplies]);

  return (
    <div className={cn("relative",)}>
      <AeCard
        variant="gradient"
        className="transition-all duration-300 hover:-translate-y-1 hover:shadow-glow border-glass-border"
        style={{
          // background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.04), transparent 40%), rgba(255, 255, 255, 0.02)",
          // backdropFilter: "blur(10px)",
          // WebkitBackdropFilter: "blur(10px)",
          // boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
        }}
      >
        <AeCardContent className="py-4 px-0 ">
          <div className="flex gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <AddressAvatarWithChainName
                    address={authorAddress}
                    avatarBackground={true}
                    size={48}
                    overlaySize={24}
                  />
                </div>
                {comment.tx_hash && CONFIG.EXPLORER_URL ? (
                  <a
                    href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${comment.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-light-font-color hover:text-light-font-color no-gradient-text"
                    title={comment.tx_hash}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {`On-chain${comment.created_at ? ` ${relativeTime(new Date(comment.created_at))}` : ''}`}
                    <IconLink className="w-2.5 h-2.5" />
                  </a>
                ) : comment.created_at ? (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {relativeTime(new Date(comment.created_at))}
                  </span>
                ) : null}
              </div>

              <div className='ml-3' style={{ paddingLeft: '48px' }}>
                <div className="text-sm text-foreground leading-relaxed">
                  {linkify(comment.content)}
                </div>

                {/* Media display for comments */}
                {comment.media && Array.isArray(comment.media) && comment.media.length > 0 && (
                  <div className="flex gap-2">
                    {comment.media.slice(0, 2).map((m: string, index: number) => (
                      <img
                        key={`${comment.id}-${index}`}
                        src={m}
                        alt="media"
                        className="w-20 h-20 object-cover rounded-lg transition-transform hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-muted/50">
                  <div className="flex items-center gap-2">
                    {hasReplies && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={toggleReplies}
                      >
                        <IconComment className="w-3 h-3" />
                        {comment.total_comments} {comment.total_comments === 1 ? 'reply' : 'replies'}
                      </Badge>
                    )}
                  </div>

                  {canReply && (
                    <AeButton
                      variant="ghost"
                      size="sm"
                      onClick={handleReplyClick}
                      className="h-8 px-3 text-xs"
                    >
                      Reply
                    </AeButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AeCardContent>
      </AeCard>

      {/* Reply form */}
      {showReplyForm && canReply && (
        <div className="mt-3">
          <CommentForm
            postId={comment.id}
            onCommentAdded={handleCommentAdded}
            placeholder="Write a reply..."
          />
        </div>
      )}

      {/* Nested replies */}
      {/* {hasReplies && showReplies && (
        <div className="mt-3 space-y-3">
          {repliesLoading && (
            <div className="ml-11 text-sm text-muted-foreground">
              Loading replies...
            </div>
          )}
          {repliesError && (
            <div className="ml-11 text-sm text-destructive">
              Error loading replies
            </div>
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
      )} */}

      <div className="h-full w-[1px] bg-white absolute left-[23px] top-0 -z-10" />
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
export type { CommentItemProps };
