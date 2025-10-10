import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { memo, useCallback, useState } from 'react';
import { PostDto, PostsService } from '../../../api/generated';
import { AeButton } from '../../../components/ui/ae-button';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';
import { Badge } from '../../../components/ui/badge';
import { IconComment, IconLink } from '../../../icons';
import PostTipButton from './PostTipButton';
import BlockchainInfoPopover from './BlockchainInfoPopover';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';
import { linkify } from '../../../utils/linkify';
import { relativeTime, fullTimestamp } from '../../../utils/time';
import CommentForm from './CommentForm';
/* navigation removed for inline nested replies */
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
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const authorAddress = comment.sender_address;
  const chainName = chainNames?.[authorAddress];
  const hasReplies = comment.total_comments > 0;
  const canReply = depth < maxDepth;
  const { status } = useTransactionStatus(comment.tx_hash, { enabled: !!comment.tx_hash, refetchInterval: 8000 });

  // Query for comment replies - only fetch when showReplies is true
  const {
    data: fetchedReplies = [],
    isLoading: repliesLoading,
    error: repliesError,
    refetch: refetchReplies
  } = useQuery({
    queryKey: ['comment-replies', comment.id],
    queryFn: async () => {
      const normalizedId = String(comment.id).endsWith('_v3') ? String(comment.id) : `${String(comment.id)}_v3`;
      const result = await PostsService.getComments({
        id: normalizedId,
        limit: 100
      }) as any;
      return result?.items || [];
    },
    enabled: showReplies,
    refetchInterval: 120 * 1000,
  });

  const handleReplyClick = useCallback(() => {
    setShowReplyForm(!showReplyForm);
  }, [showReplyForm]);

  const handleCommentAdded = useCallback(() => {
    setShowReplyForm(false);
    // Ensure replies are shown and refresh list after posting a reply
    setShowReplies(true);
    refetchReplies();
    if (onCommentAdded) {
      onCommentAdded();
    }
  }, [onCommentAdded, refetchReplies]);

  const toggleReplies = useCallback(() => {
    setShowReplies((prev) => !prev);
  }, []);

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
                {comment.created_at && comment.tx_hash ? (
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                    <BlockchainInfoPopover
                      txHash={comment.tx_hash}
                      createdAt={comment.created_at}
                      sender={comment.sender_address}
                      contract={(comment as any).contract_address}
                      postId={String(comment.id)}
                      triggerContent={
                        <span className="text-xs text-muted-foreground whitespace-nowrap underline-offset-2 hover:underline" title={fullTimestamp(comment.created_at)}>
                          {relativeTime(new Date(comment.created_at))}
                        </span>
                      }
                    />
                  </div>
                ) : comment.created_at ? (
                  <span className="hidden sm:inline text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap" title={fullTimestamp(comment.created_at)}>
                    {relativeTime(new Date(comment.created_at))}
                  </span>
                ) : null}
                {/* Mobile-only timestamp inside the line; desktop remains inline in header */}
                <div className="w-full border-l border-white ml-[20px] pl-[32px] -mt-5 md:hidden">
                  {comment.created_at && comment.tx_hash ? (
                    <BlockchainInfoPopover
                      txHash={comment.tx_hash}
                      createdAt={comment.created_at}
                      sender={comment.sender_address}
                      contract={(comment as any).contract_address}
                      postId={String(comment.id)}
                      triggerContent={
                        <span className="text-[11px] leading-none text-muted-foreground underline-offset-2 hover:underline" title={fullTimestamp(comment.created_at)}>
                          {relativeTime(new Date(comment.created_at))}
                        </span>
                      }
                    />
                  ) : comment.created_at ? (
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 leading-none md:hidden" title={fullTimestamp(comment.created_at)}>
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

                   <div className="flex items-center gap-4 md:gap-2 mt-2">
                     {hasReplies && (
                       <Badge
                         variant="outline"
                         className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 bg-transparent border-white/10 hover:border-white/20 md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25 cursor-pointer transition-colors"
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

                      <PostTipButton toAddress={authorAddress} postId={String(comment.id)} />

                      {comment.tx_hash && (
                        <BlockchainInfoPopover
                          txHash={comment.tx_hash}
                          createdAt={comment.created_at}
                          sender={comment.sender_address}
                          contract={(comment as any).contract_address}
                          postId={String(comment.id)}
                          className=""
                        />
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
      {showReplies && (
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
          {!repliesLoading && !repliesError && fetchedReplies.length === 0 && (
            <div className="ml-11 text-sm text-muted-foreground">No replies yet.</div>
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

      {/* Single vertical line handled by parent wrappers; remove duplicate */}
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
export type { CommentItemProps };
