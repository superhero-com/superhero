import React from 'react';
import PostForm from './PostForm';

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  onCommentAdded,
  placeholder = 'Write a reply...',
}) => (
  <PostForm
    isPost={false}
    postId={postId}
    onCommentAdded={onCommentAdded}
    placeholder={placeholder}
    showMediaFeatures
    showEmojiPicker
    showGifInput
    characterLimit={280}
    minHeight="60px"
    className="mt-4"
  />
);

export default CommentForm;
export type { CommentFormProps };
