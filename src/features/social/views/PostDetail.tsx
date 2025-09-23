import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PostsService } from '../../../api/generated';
import AeButton from '../../../components/AeButton';
import LeftRail from '../../../components/layout/LeftRail';
import RightRail from '../../../components/layout/RightRail';
import Shell from '../../../components/layout/Shell';
import { useWallet } from '../../../hooks';
import { relativeTime } from '../../../utils/time';
import { CONFIG } from '../../../config';
import { IconLink } from '../../../icons';
import CommentForm from '../components/CommentForm';
import PostCommentsList from '../components/PostCommentsList';
import PostContent from '../components/PostContent';

export default function PostDetail({ standalone = true }: { standalone?: boolean } = {}) {
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
  // Ensure detail page scrolls to top when opened
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



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
    const explorerUrl = postData?.tx_hash && CONFIG.EXPLORER_URL
      ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${postData.tx_hash}`
      : null;

    return (
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {authorAddress && (
            <AddressAvatarWithChainName address={authorAddress} size={48} overlaySize={24} />
          )}
        </div>
        {/* Desktop: show time inline on the right */}
        {postData?.tx_hash && CONFIG.EXPLORER_URL && (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <a
              href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${postData.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-light-font-color hover:text-light-font-color no-gradient-text"
              title={postData?.tx_hash}
            >
              {`Posted on-chain${post?.timestamp ? ` ${relativeTime(new Date(post.timestamp))}` : ''}`}
              <IconLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </header>
    );
  };

  const content = (
    <div className="w-full py-2 px-2 sm:px-3 md:px-4">
      <div className="mb-4">
        <AeButton onClick={() => { navigate('/'); }} variant="ghost" size="sm" outlined className="!border !border-solid !border-white/15 hover:!border-white/35">
          ← Back
        </AeButton>
      </div>

      {isLoading && renderLoadingState()}
      {error && renderErrorState()}

      {post && (
        <article className="grid">
          {renderPostHeader(post)}

          {/* Mobile: show time inside the left-line wrapper; desktop uses inline header */}
          <div className="relative">
            <div className="hidden md:block absolute left-[23px] top-0 bottom-0 w-[1px] bg-white -z-10" />
            <div className="border-l border-white ml-[23px] pl-[37px] md:border-none md:ml-0 md:pl-[48px]">
              {postData?.tx_hash && CONFIG.EXPLORER_URL && (
                <a
                  href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${postData.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 md:hidden text-[11px] leading-none text-light-font-color hover:text-light-font-color no-gradient-text"
                  title={postData?.tx_hash}
                >
                  {`Posted on-chain${post?.timestamp ? ` ${relativeTime(new Date(post.timestamp))}` : ''}`}
                  <IconLink className="w-2 h-2" />
                </a>
              )}
              <PostContent post={post} />
            </div>
          </div>

          {/* Comments section */}
          {postData && postData.total_comments > 0 && (
            <PostCommentsList
              id={postId!}
              onCommentAdded={handleCommentAdded}
            />
          )}

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
        </article>
      )}
    </div>
  );

  return standalone ? (
    <Shell left={<LeftRail />} right={<RightRail />} containerClassName="max-w-[1080px] mx-auto">
      {content}
    </Shell>
  ) : (
    content
  );
}
