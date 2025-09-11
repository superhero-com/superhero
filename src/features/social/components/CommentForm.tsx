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
  placeholder = "Write a comment..."
}) => {
  return (
    <PostForm
      isPost={false}
      postId={postId}
      onCommentAdded={onCommentAdded}
      placeholder={placeholder}
      showMediaFeatures={true}
      showEmojiPicker={true}
      showGifInput={true}
      characterLimit={280}
      minHeight="60px"
      className="mt-4"
    />
  );
};

export default CommentForm;
export type { CommentFormProps };
