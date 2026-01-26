import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import PostForm from './PostForm';
import { useIsMobile } from '@/hooks';

interface CreatePostProps {
  onClose?: () => void;
  onSuccess?: () => void;
  className?: string;
  onTextChange?: (text: string) => void;
  autoFocus?: boolean;
  onPostCreated?: () => void; // Callback when a new post is created (for tab switching, etc.)
}

export interface CreatePostRef {
  focus: (opts?: { immediate?: boolean; preventScroll?: boolean; scroll?: 'none' | 'start' | 'center' }) => void;
}

const CreatePost = forwardRef<CreatePostRef, CreatePostProps>(
  ({ onClose, onSuccess, className = '', onTextChange, autoFocus, onPostCreated }, ref) => {
    const postFormRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isMobileViewport = useIsMobile();

    useImperativeHandle(ref, () => ({
      focus: () => {
        const el = containerRef.current;
        if (!el) {
          try { postFormRef.current?.focus({ immediate: true, preventScroll: false, scroll: 'none' }); } catch {}
          return;
        }
        // Compute a target Y so composer lands just below top bar; avoid over-scrolling
        const rect = el.getBoundingClientRect();
        const currentY = window.scrollY || window.pageYOffset || 0;
        const headerOffset = isMobileViewport ? 74 : 80; // tuned: mobile less scroll, desktop a bit further
        const targetY = Math.max(0, currentY + rect.top - headerOffset);
        try { window.scrollTo({ top: targetY, behavior: 'smooth' }); } catch {}

        if (!isMobileViewport) {
          // Desktop: don't let focus scroll again; keep position stable
          setTimeout(() => postFormRef.current?.focus({ immediate: true, preventScroll: true, scroll: 'none' }), 100);
        } else {
          // Mobile: focus immediately so the keyboard opens, after initial scroll request
          try { postFormRef.current?.focus({ immediate: true, preventScroll: false, scroll: 'none' }); } catch {}
        }
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
          onPostCreated={onPostCreated}
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
