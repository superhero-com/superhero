import React, { useCallback, useState } from 'react';
import { AeButton } from '../../../components/ui/ae-button';
import { Textarea } from '../../../components/ui/textarea';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useAccount } from '../../../hooks/useAccount';
import TIPPING_V3_ACI from 'tipping-contract/generated/Tipping_v3.aci.json';
import { CONFIG } from '../../../config';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
      <AeCard 
        variant="glass" 
        className="mt-4 border-glass-border"
        style={{
          background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.04), transparent 40%), rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
        }}
      >
        <AeCardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Please connect your wallet to comment
          </p>
        </AeCardContent>
      </AeCard>
    );
  }

  return (
    <AeCard 
      variant="glass" 
      className="mt-4 border-glass-border"
      style={{
        background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.04), transparent 40%), rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
      }}
    >
      <AeCardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={placeholder}
            rows={3}
            disabled={isSubmitting}
            className="resize-none bg-muted/20 border-muted/50 focus:border-accent focus:ring-accent/20"
          />
          <div className="flex justify-end">
            <AeButton
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              loading={isSubmitting}
              size="sm"
              className="px-6"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </AeButton>
          </div>
        </form>
      </AeCardContent>
    </AeCard>
  );
};

export default CommentForm;
export type { CommentFormProps };
