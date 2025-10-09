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
    navigate(`/post/${String(comment.id).replace(/_v3$/,'')}`);
    // setShowReplies(!showReplies);
  }, [showReplies]);

  return (
    <div className={cn("relative",)}>
      <AeCard
        variant="default"
        hover={false}
        className="border-0 bg-transparent shadow-none"
      >
         <AeCardContent className="py-4 px-0 relative">
          <div className="flex gap-3">
            <div className="flex-1 min-w-0 space-y-0 md:space-y-2">
              <div className="flex flex-col gap-0 sm:grid sm:grid-cols-[1fr_auto] sm:items-start sm:gap-2 w-full">
              <div className="flex-1 min-w-0 relative z-20">
                  <AddressAvatarWithChainName
                    address={authorAddress}
                    avatarBackground={true}
                    size={40}
                    overlaySize={20}
                  />
                </div>
                {/* Desktop: show time inline on the right */}
                {comment.tx_hash && CONFIG.EXPLORER_URL ? (
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                    <a
                      href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${comment.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-light-font-color hover:text-light-font-color no-gradient-text group"
                      title={comment.tx_hash}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="underline-offset-2 group-hover:underline">
                        {`Posted on-chain${comment.created_at ? ` ${relativeTime(new Date(comment.created_at))}` : ''}`}
                      </span>
                      <IconLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ) : comment.created_at ? (
                  <span className="hidden sm:inline text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    {relativeTime(new Date(comment.created_at))}
                  </span>
                ) : null}
                {/* Mobile-only timestamp inside the line; desktop remains inline in header */}
                <div className="w-full border-l border-white ml-[20px] pl-[32px] -mt-5 md:hidden">
                  {comment.tx_hash && CONFIG.EXPLORER_URL ? (
                    <a
                      href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${comment.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] leading-none text-light-font-color hover:text-light-font-color no-gradient-text md:hidden group -mt-2"
                      title={comment.tx_hash}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="underline-offset-2 group-hover:underline">
                        {`Posted on-chain${comment.created_at ? ` ${relativeTime(new Date(comment.created_at))}` : ''}`}
                      </span>
                      <IconLink className="w-2 h-2" />
                    </a>
                  ) : comment.created_at ? (
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 leading-none md:hidden">
                      {relativeTime(new Date(comment.created_at))}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className='w-full border-l border-white ml-[20px] pl-[32px] pr-4 md:pr-6 -mt-[1px] md:border-none md:ml-0 md:pl-[52px] relative z-10'>
                <div className="text-[14px] md:text-[15px] text-foreground leading-snug">
                  {linkify(comment.content, { knownChainNames: new Set(Object.values(chainNames || {}).map(n => n?.toLowerCase())) })}
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

                   <div className="flex items-center gap-3 mt-2">
                     {hasReplies && (
                       <Badge
                         variant="outline"
                         className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 bg-transparent border-white/10 hover:border-white/20 cursor-pointer transition-colors"
                         onClick={toggleReplies}
                       >
                         <IconComment className="w-[14px] h-[14px]" />
                         {comment.total_comments} {comment.total_comments === 1 ? 'reply' : 'replies'}
                       </Badge>
                     )}

                     {canReply && (
                       <AeButton
                         variant="link"
                         size="sm"
                         onClick={handleReplyClick}
                         className="px-0 h-auto text-xs -ml-1 md:ml-0 text-muted-foreground hover:text-foreground no-underline shadow-none hover:shadow-none"
                       >
                         Reply
                       </AeButton>
                     )}
                   </div>
               </div>
            </div>
          </div>
          {/* Desktop-only full-height left line to visually connect avatar and content */}
          <div className="hidden md:block absolute left-[20px] top-0 bottom-0 w-[1px] bg-white/90 z-0 pointer-events-none" />
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

      {/* Single vertical line handled by parent wrappers; remove duplicate */}
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
export type { CommentItemProps };
