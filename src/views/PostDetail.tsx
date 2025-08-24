import React, { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Backend } from '../api/backend';
import { PostDto, PostsService } from '../api/generated';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import UserBadge from '../components/UserBadge';
import AeButton from '../components/AeButton';
import { relativeTime } from '../utils/time';
import Identicon from '../components/Identicon';
import './PostDetail.scss';

import { useWallet, useModal } from '../../hooks';
// Types
interface Comment {
  id: string;
  text: string;
  timestamp: string;
  author?: string;
  address?: string;
  sender?: string;
  parentId?: string;
}

interface PostAvatarProps {
  authorAddress: string;
  chainName?: string;
  size?: number;
  overlaySize?: number;
}

interface CommentItemProps {
  comment: Comment;
  chainNames: Record<string, string>;
}

interface PostContentProps {
  post: any; // Using any for now since the old Backend API structure is different from PostDto
}

// Component: Reusable Post Avatar
const PostAvatar = memo(({ 
  authorAddress, 
  chainName, 
  size = 56, 
  overlaySize = 28 
}: PostAvatarProps) => (
  <div className="avatar-container">
    <div className="avatar-stack">
      {chainName && chainName !== 'Legend' && (
        <div className="chain-avatar">
          <Identicon address={authorAddress} size={size} name={chainName} />
        </div>
      )}
      {(!chainName || chainName === 'Legend') && (
        <div className="address-avatar">
          <Identicon address={authorAddress} size={size} />
        </div>
      )}
      {chainName && chainName !== 'Legend' && (
        <div className="address-avatar-overlay">
          <Identicon address={authorAddress} size={overlaySize} />
        </div>
      )}
    </div>
  </div>
));

// Component: Individual Comment Item
const CommentItem = memo(({ comment, chainNames }: CommentItemProps) => {
  const authorAddress = comment.address || comment.author || comment.sender;
  const chainName = chainNames?.[authorAddress];

  return (
    <div className="comment-item">
      <div className="comment-avatar">
        <PostAvatar 
          authorAddress={authorAddress} 
          chainName={chainName} 
          size={40} 
          overlaySize={20} 
        />
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <UserBadge 
            address={authorAddress} 
            showAvatar={false}
            chainName={chainName}
          />
          {comment.timestamp && (
            <span className="comment-timestamp">
              {relativeTime(new Date(comment.timestamp))}
            </span>
          )}
        </div>
        <div className="comment-text">{comment.text}</div>
      </div>
    </div>
  );
});

// Component: Post Content Display
const PostContent = memo(({ post }: PostContentProps) => (
  <>
    <h2 className="post-title">{post.title}</h2>
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

export default function PostDetail() {
  const { postId, id } = useParams();
  const navigate = useNavigate();
  const { address, chainNames } = useWallet();
  const { openModal } = useModal();

  // Query for post data using new PostsService
  const { 
    data: postData, 
    isLoading: isPostLoading, 
    error: postError,
    refetch: refetchPost
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostsService.getById({ id: postId! }),
    enabled: !!postId,
    refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
  });

  // Query for post comments using legacy Backend API
  const { 
    data: comments = [], 
    isLoading: isCommentsLoading, 
    error: commentsError,
    refetch: refetchComments
  } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const result = await Backend.getPostChildren(postId!);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!postId,
    refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
  });

  // Query for selected comment if id is present
  const { 
    data: selectedComment, 
    isLoading: isSelectedCommentLoading,
    error: selectedCommentError
  } = useQuery({
    queryKey: ['comment', id],
    queryFn: () => Backend.getCommentById(id!),
    enabled: !!id,
    refetchInterval: 120 * 1000,
  });

  // For backward compatibility, create a post object that matches the old structure
  const post = useMemo(() => {
    if (!postData) return null;
    
    // Convert PostDto to legacy format for existing components
    return {
      id: postData.id,
      title: postData.content, // Use content as title since PostDto doesn't have title
      text: postData.content,
      author: postData.sender_address,
      address: postData.sender_address,
      timestamp: postData.created_at,
      media: postData.media,
      url: null, // PostDto doesn't have URL field
      linkPreview: null, // PostDto doesn't have linkPreview
    };
  }, [postData]);

  const isLoading = isPostLoading || isCommentsLoading || isSelectedCommentLoading;
  const error = postError || commentsError || selectedCommentError;

  // Compute list to render depending on focus (tip vs single comment)
  const topLevelReplies = useMemo(() => {
    if (!comments) return [] as Comment[];
    if (id) return comments.filter((c: Comment) => String(c.parentId) === String(id));
    return comments.filter((c: Comment) => !c.parentId);
  }, [comments, id]);

  // Dynamic meta tags similar to Vue metaInfo()
  useEffect(() => {
    const record = id ? selectedComment : post;
    if (!record) return;
    const title = id ? 'Comment' : `Tip ${String(postId).split('_')[0]}`;
    const description = id ? record.title || record.text : record.text;
    const author = id ? (record.sender || record.address || record.author) : record.author;
    const image = (record.media && record.media[0]) || (author ? Backend.getProfileImageUrl(author) : undefined);
    document.title = title;
    function setMeta(attr: 'name' | 'property', key: string, value: string) {
      if (!value) return;
      let el = document.querySelector(`meta[${attr}='${key}']`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', value);
    }
    const url = window.location.href.split('?')[0];
    if (image) setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:title', `Superhero ${title}`);
    if (description) setMeta('property', 'og:description', description);
    setMeta('property', 'og:site_name', 'Superhero');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:site', '@superhero_chain');
    setMeta('name', 'twitter:creator', '@superhero_chain');
    setMeta('name', 'twitter:image:alt', 'Superhero post');
  }, [id, postId, post, selectedComment]);

  // Helper function to get author info
  const getAuthorInfo = (item: any) => {
    const authorAddress = item?.address || item?.author || item?.sender;
    const chainName = chainNames?.[authorAddress];
    return { authorAddress, chainName };
  };

  // Render helpers
  const renderLoadingState = () => (
    <div className="loading-state">Loading…</div>
  );

  const renderErrorState = () => (
    <div className="error-state">
      Error loading post. 
      <AeButton variant="ghost" size="sm" onClick={() => {
        refetchPost();
        refetchComments();
      }}>
        Retry
      </AeButton>
    </div>
  );

  const renderPostHeader = (displayPost: any) => {
    const { authorAddress, chainName } = getAuthorInfo(displayPost);
    
    return (
      <header className="post-header">
        <div className="author-section">
          {authorAddress && (
            <div className="author-display">
              <PostAvatar authorAddress={authorAddress} chainName={chainName} />
              <UserBadge 
                address={authorAddress} 
                showAvatar={false}
                chainName={chainName}
                linkTo="profile" 
                shortAddress 
              />
            </div>
          )}
        </div>
        <div className="post-actions">
          {!id && displayPost?.timestamp && (
            <div className="timestamp">
              {relativeTime(new Date(displayPost.timestamp))}
            </div>
          )}
          {/* Temporarily disabled - menu functionality 
          {!id && (
            <AeButton 
              variant="ghost" 
              size="sm"
              onClick={() => openModal({ 
                name: 'feed-item-menu', 
                props: { 
                  postId, 
                  url: displayPost.url || '', 
                  author: displayPost.author || displayPost.address
                } 
              }))}
            >
              •••
            </AeButton>
          )}
          */}
        </div>
      </header>
    );
  };

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="post-detail-container">
        <div className="back-button-container">
          <AeButton onClick={() => navigate(-1)} variant="ghost" size="sm">
            ← Back
          </AeButton>
        </div>
        
        {isLoading && renderLoadingState()}
        {error && renderErrorState()}
        
        {(id ? selectedComment : post) && (
          <article className="post-detail">
            {renderPostHeader(id ? selectedComment : post)}
            
            {!id && post && <PostContent post={post} />}
            
            {/* Comments section */}
            <div className="comments-section">
              <h3 className="comments-title">Comments ({topLevelReplies.length})</h3>
              {topLevelReplies.map((comment: Comment) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  chainNames={chainNames} 
                />
              ))}
            </div>
          </article>
        )}
      </div>
    </Shell>
  );
}


