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
    const containerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        try {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {}
        // Defer focus slightly so scrolling can begin smoothly
        setTimeout(() => postFormRef.current?.focus(), 100);
      },
    }));

    return (
      <div ref={containerRef}>
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
      </div>
    );
  }
);

CreatePost.displayName = 'CreatePost';

export default CreatePost;
