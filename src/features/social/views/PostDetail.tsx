import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Backend } from '../../../api/backend';
import { PostsService } from '../../../api/generated';
import Shell from '../../../components/layout/Shell';
import LeftRail from '../../../components/layout/LeftRail';
import RightRail from '../../../components/layout/RightRail';
import UserBadge from '../../../components/UserBadge';
import AeButton from '../../../components/AeButton';
import { relativeTime } from '../../../utils/time';
import { useWallet } from '../../../hooks';
import PostAvatar from '../components/PostAvatar';
import PostContent from '../components/PostContent';
import CommentForm from '../components/CommentForm';
import PostCommentsList from '../components/PostCommentsList';
import { PostDto } from '../../../api/generated';

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { chainNames } = useWallet();

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

  const isLoading = isPostLoading;
  const error = postError;



  // Dynamic meta tags similar to Vue metaInfo()
  useEffect(() => {
    if (!postData) return;
    const title = `Tip ${String(postId).split('_')[0]}`;
    const description = postData.content;
    const author = postData.sender_address;
    const image = (postData.media && postData.media[0]) || undefined;
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
  }, [postId, postData]);

  // Helper function to get author info
  const getAuthorInfo = (item: any) => {
    const authorAddress = item?.address || item?.author || item?.sender;
    const chainName = chainNames?.[authorAddress];
    return { authorAddress, chainName };
  };

  // Handle comment added callback
  const handleCommentAdded = useCallback(() => {
    refetchPost();
  }, [refetchPost]);

  // Render helpers
  const renderLoadingState = () => (
    <div className="text-center py-8 text-light-font-color">Loading…</div>
  );

  const renderErrorState = () => (
    <div className="text-center py-8 text-light-font-color">
      Error loading post.
      <AeButton variant="ghost" size="sm" onClick={() => {
        refetchPost();
      }}>
        Retry
      </AeButton>
    </div>
  );

  const renderPostHeader = (displayPost: any) => {
    const { authorAddress, chainName } = getAuthorInfo(displayPost);

    return (
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {authorAddress && (
            <div className="flex items-center gap-4">
              <PostAvatar authorAddress={authorAddress} chainName={chainName} size={40} overlaySize={22} />
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {displayPost?.timestamp && (
            <div className="text-light-font-color text-xs font-medium">
              {relativeTime(new Date(displayPost.timestamp))}
            </div>
          )}
        </div>
      </header>
    );
  };

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="max-w-[680px] mx-auto py-2 px-4 mobile:px-3 mobile-small:px-2">
        <div className="mb-4">
          <AeButton onClick={() => navigate(-1)} variant="ghost" size="sm">
            ← Back
          </AeButton>
        </div>

        {isLoading && renderLoadingState()}
        {error && renderErrorState()}

        {post && (
          <article className="grid gap-4">
            {renderPostHeader(post)}

            <PostContent post={post} />

            {/* Comment form */}
            {postId && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <CommentForm
                  postId={postId}
                  onCommentAdded={handleCommentAdded}
                  placeholder="Share your thoughts..."
                />
              </div>
            )}

            {/* Comments section */}
            {postData && postData.total_comments > 0 && (
              <PostCommentsList
                id={postId!}
                onCommentAdded={handleCommentAdded}
              />
            )}
          </article>
        )}
      </div>
    </Shell>
  );
}
