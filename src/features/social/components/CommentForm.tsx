import React from 'react';
import { useTranslation } from 'react-i18next';
import PostForm from './PostForm';

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  onCommentAdded,
  placeholder,
}) => {
  const { t } = useTranslation('forms');
  return (
    <PostForm
      isPost={false}
      postId={postId}
      onCommentAdded={onCommentAdded}
      placeholder={placeholder ?? t('writeReply')}
      showMediaFeatures
      showEmojiPicker
      showGifInput
      characterLimit={280}
      minHeight="60px"
      className="mt-4"
    />
  );
};

export default CommentForm;
export type { CommentFormProps };
