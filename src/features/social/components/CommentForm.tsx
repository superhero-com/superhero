import React, { useCallback, useState } from 'react';
import AeButton from '../../../components/AeButton';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useAccount } from '../../../hooks/useAccount';
import TIPPING_V3_ACI from 'tipping-contract/generated/Tipping_v3.aci.json';
import { CONFIG } from '../../../config';
import { useQueryClient } from '@tanstack/react-query';

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  onCommentAdded,
  placeholder = "Write a comment..."
}) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sdk } = useAeSdk();
  const { activeAccount } = useAccount();
  const queryClient = useQueryClient();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim() || !activeAccount || !sdk) return;

    setIsSubmitting(true);

    try {
      // Get the contract instance
      const contract = await sdk.initializeContract({
        aci: TIPPING_V3_ACI as any,
        address: CONFIG.CONTRACT_V3_ADDRESS
      });

      // Call the contract with comment content and post reference
      const trimmed = comment.trim();
      const postMedia = [`comment:${postId}`];

      const { decodedResult } = await contract.post_without_tip(trimmed, postMedia);

      console.log('Comment posted successfully:', decodedResult);

      // Clear the form
      setComment('');

      // Invalidate the post comments query
      queryClient.refetchQueries({ queryKey: ['post-comments', postId] });

      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded();
      }

    } catch (error) {
      console.error('Error posting comment:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  }, [comment, activeAccount, sdk, postId, onCommentAdded]);

  if (!activeAccount) {
    return (
      <div className="comment-form-container">
        <div className="comment-form-message">
          Please connect your wallet to comment
        </div>
      </div>
    );
  }

  return (
    <div className="comment-form-container">
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-wrapper">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={placeholder}
            className="comment-input"
            rows={3}
            disabled={isSubmitting}
          />
        </div>
        <div className="comment-form-actions">
          <AeButton
            type="submit"
            disabled={!comment.trim() || isSubmitting}
            loading={isSubmitting}
            size="sm"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </AeButton>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
export type { CommentFormProps };
