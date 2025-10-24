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
        const isMobileViewport = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
        // On desktop: scroll the container near the top to avoid layout shifting, then focus with preventScroll and smooth center
        if (!isMobileViewport) {
          try {
            containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {}
          setTimeout(() => postFormRef.current?.focus({ immediate: true }), 120);
          return;
        }
        // On mobile: focus immediately within the click to open keyboard promptly, then smooth scroll
        try { postFormRef.current?.focus({ immediate: true }); } catch {}
        try { containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
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
