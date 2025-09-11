import React from 'react';
import PostForm from './PostForm';

interface CreatePostProps {
  onClose?: () => void;
  onSuccess?: () => void;
  className?: string;
  onTextChange?: (text: string) => void;
}

export default function CreatePost({ onClose, onSuccess, className = '', onTextChange }: CreatePostProps) {
  return (
    <PostForm
      isPost={true}
      onClose={onClose}
      onSuccess={onSuccess}
      className={className}
      onTextChange={onTextChange}
      showMediaFeatures={true}
      showEmojiPicker={true}
      showGifInput={true}
      characterLimit={280}
      minHeight="80px"
    />
  );
}
