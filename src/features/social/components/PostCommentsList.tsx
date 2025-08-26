import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostsService } from '../../../api/generated';
import { PostDto } from '../../../api/generated';
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
        id: id,
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
    return <div className="comments-loading">Loading comments...</div>;
  }

  if (error) {
    return (
      <div className="comments-error">
        Error loading comments.
        <button onClick={() => refetchComments()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="comments-section">
      <h3 className="comments-title">Comments ({comments.length})</h3>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          chainNames={chainNames}
          onCommentAdded={handleCommentAdded}
        />
      ))}
    </div>
  );
}
