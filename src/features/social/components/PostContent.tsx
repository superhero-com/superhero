import React, { memo } from 'react';
import { Backend } from '../../../api/backend';

interface PostContentProps {
  post: any; // Using any for now since the old Backend API structure is different from PostDto
}

// Component: Post Content Display
const PostContent = memo(({ post }: PostContentProps) => (
  <>
    <div>
      <div className="post-title">{post.title}</div>
    </div>
    {post.url && (
      <a href={post.url} target="_blank" rel="noreferrer" className="post-url">
        {post.url}
      </a>
    )}
    {post.linkPreview && (post.linkPreview.title || post.linkPreview.description) && (
      <a href={post.url} target="_blank" rel="noreferrer" className="link-preview">
        <div className="preview-content">
          {post.linkPreview.image && (
            <img
              src={Backend.getTipPreviewUrl(post.linkPreview.image)}
              alt="preview"
              className="preview-image"
            />
          )}
          <div className="preview-text">
            <div className="preview-title">{post.linkPreview.title}</div>
            <div className="preview-description">{post.linkPreview.description}</div>
          </div>
        </div>
      </a>
    )}
    {post.media && Array.isArray(post.media) && post.media.length > 0 && (
      <div className="media-grid">
        {post.media.map((m: string) => (
          <img key={m} src={m} alt="media" className="media-item" />
        ))}
      </div>
    )}
    {/* {post.text && (
      <div className="post-text">{post.text}</div>
    )} */}
  </>
));

PostContent.displayName = 'PostContent';

export default PostContent;
export type { PostContentProps };
