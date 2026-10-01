import React from 'react';
import { useTranslation } from 'react-i18next';
import PostForm from './PostForm';

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
  appearance?: 'default' | 'integrated';
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  onCommentAdded,
  placeholder,
  appearance,
}) => {
  const { t } = useTranslation('forms');
  return (
    <PostForm
      isPost={false}
      appearance={appearance}
      postId={postId}
      onCommentAdded={onCommentAdded}
      placeholder={placeholder ?? t('writeReply')}
      showMediaFeatures
      showEmojiPicker
      showGifInput
      characterLimit={280}
      className={appearance === 'integrated' ? '' : 'mt-4'}
    />
  );
};

export default CommentForm;
export type { CommentFormProps };
