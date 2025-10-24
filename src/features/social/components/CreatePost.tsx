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
        if (!isMobileViewport) {
          // Desktop: avoid centering; place near top and let focus keep it there
          try { containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
          setTimeout(() => postFormRef.current?.focus({ immediate: true, preventScroll: true, scroll: 'none' }), 100);
          return;
        }
        // Mobile: allow focus to scroll (to trigger keyboard reliably), then adjust minimal scroll only if needed
        try { postFormRef.current?.focus({ immediate: true, preventScroll: false, scroll: 'none' }); } catch {}
        // Small nudge to ensure visibility without recentering
        try { containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
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
