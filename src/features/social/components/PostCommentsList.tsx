import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostsService } from '../../../api/generated';
import { PostDto } from '../../../api/generated';
import { AeButton } from '../../../components/ui/ae-button';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';
import { cn } from '@/lib/utils';
import CommentItem from './CommentItem';
import { useWallet } from '../../../hooks';

interface PostCommentsListProps {
  id: string;
  onCommentAdded?: () => void;
}

export default function PostCommentsList({ id, onCommentAdded }: PostCommentsListProps) {
  const { chainNames } = useWallet();

  // Query for post comments
  const {
    data: comments = [],
    isLoading,
    error,
    refetch: refetchComments
  } = useQuery({
    queryKey: ['post-comments', id],
    queryFn: async () => {
      const result = await PostsService.getComments({
        id: `${String(id).replace(/_v3$/,'')}_v3`,
        limit: 100
      }) as any;
      return result?.items || [];
    },
    enabled: !!id,
    refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
  });



  // Handle comment added callback
  const handleCommentAdded = () => {
    refetchComments();
    onCommentAdded?.();
  };

  if (isLoading) {
    return (
      <AeCard variant="glass" className="mt-6">
        <AeCardContent className="p-6 text-center">
          <div className="text-lg">⏳</div>
          <p className="text-sm text-muted-foreground mt-2">Loading comments...</p>
        </AeCardContent>
      </AeCard>
    );
  }

  if (error) {
    return (
      <AeCard variant="glass" className="mt-6">
        <AeCardContent className="p-6 text-center space-y-4">
          <div className="text-lg">⚠️</div>
          <p className="text-sm text-muted-foreground">Error loading comments.</p>
          <AeButton 
            onClick={() => refetchComments()} 
            variant="outline" 
            size="sm"
          >
            Retry
          </AeButton>
        </AeCardContent>
      </AeCard>
    );
  }

  return (
    <div className="space-y-6">
      {comments.length === 0 ? (
        <AeCard >
          <AeCardContent className="p-8 text-center">
            <div className="text-2xl opacity-60 mb-2">💬</div>
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          </AeCardContent>
        </AeCard>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              chainNames={chainNames}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
