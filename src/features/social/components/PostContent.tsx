import React, { memo } from 'react';
import { Backend } from '../../../api/backend';
import { cn } from '@/lib/utils';
import { linkify, formatUrl, truncateEnd } from '../../../utils/linkify';
import { useWallet } from '../../../hooks';

interface PostContentProps {
  post: any; // Using any for now since the old Backend API structure is different from PostDto
}

// Component: Post Content Display
const PostContent = memo(({ post }: PostContentProps) => {
  const { chainNames } = useWallet();
  const known = new Set(Object.values(chainNames || {}).map(n => n?.toLowerCase()));
  return (
  <div className="space-y-3">
    {post.title && (
      <div className="text-[15px] text-foreground leading-snug">
        {linkify(post.title, { knownChainNames: known })}
      </div>
    )}
    
    {post.url && (
      <a 
        href={post.url} 
        target="_blank" 
        rel="noreferrer" 
        className="inline-flex items-center text-sm text-accent hover:text-accent/80 transition-colors underline decoration-accent/30 hover:decoration-accent/60 underline-offset-2"
        title={post.url}
      >
        {truncateEnd(formatUrl(post.url), 60)}
      </a>
    )}
    
    {post.linkPreview && (post.linkPreview.title || post.linkPreview.description) && (
      <a 
        href={post.url} 
        target="_blank" 
        rel="noreferrer" 
        className="block bg-muted/20 border border-muted/50 rounded-xl p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex gap-3">
          {post.linkPreview.image && (
            <img
              src={Backend.getTipPreviewUrl(post.linkPreview.image)}
              alt="preview"
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            {post.linkPreview.title && (
              <div className="font-semibold text-sm text-foreground mb-1 line-clamp-2">
                {post.linkPreview.title}
              </div>
            )}
            {post.linkPreview.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {post.linkPreview.description}
              </div>
            )}
          </div>
        </div>
      </a>
    )}
    
    {post.media && Array.isArray(post.media) && post.media.length > 0 && (
      <div className={cn(
        "grid gap-2 rounded-xl overflow-hidden",
        post.media.length === 1 && "grid-cols-1",
        post.media.length === 2 && "grid-cols-2",
        post.media.length >= 3 && "grid-cols-2"
      )}>
        {post.media.slice(0, 4).map((m: string, index: number) => (
          <img 
            key={m} 
            src={m} 
            alt="media" 
            className={cn(
              "w-full object-cover rounded-lg transition-transform hover:scale-105",
              post.media.length === 1 ? "h-64" : "h-32"
            )}
            loading="lazy"
          />
        ))}
      </div>
    )}
  </div>
)});

PostContent.displayName = 'PostContent';

export default PostContent;
export type { PostContentProps };
