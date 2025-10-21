import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import PostForm from './PostForm';

interface CreatePostProps {
  onClose?: () => void;
  onSuccess?: () => void;
  className?: string;
  onTextChange?: (text: string) => void;
  autoFocus?: boolean;
}

export interface CreatePostRef {
  focus: () => void;
}

const CreatePost = forwardRef<CreatePostRef, CreatePostProps>(
  ({ onClose, onSuccess, className = '', onTextChange, autoFocus }, ref) => {
    const postFormRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        postFormRef.current?.focus();
      },
    }));

    return (
      <PostForm
        ref={postFormRef}
        isPost={true}
        onClose={onClose}
        onSuccess={onSuccess}
        className={className}
        onTextChange={onTextChange}
        showMediaFeatures={true}
        showEmojiPicker={true}
        showGifInput={true}
        characterLimit={280}
        minHeight="60px"
        autoFocus={autoFocus}
      />
    );
  }
);

CreatePost.displayName = 'CreatePost';

export default CreatePost;
