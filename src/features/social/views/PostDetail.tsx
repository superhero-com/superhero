import { useQuery, useQueryClient } from '@tanstack/react-query';
import Head from '../../../seo/Head';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PostsService, PostDto } from '../../../api/generated';
import AeButton from '../../../components/AeButton';
import LeftRail from '../../../components/layout/LeftRail';
import RightRail from '../../../components/layout/RightRail';
import Shell from '../../../components/layout/Shell';
import { extractParentId } from '../utils/postParent';
import ReplyToFeedItem from '../components/ReplyToFeedItem';
// PostTipButton is intentionally not imported here as it's not used on detail page
import DirectReplies from '../components/DirectReplies';
import CommentForm from '../components/CommentForm';
import { resolvePostByKey } from '../utils/resolvePost';

export default function PostDetail({ standalone = true }: { standalone?: boolean } = {}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query for post data using new PostsService
  // Posts are immutable on-chain, but can be hidden by moderators for legal reasons
  // Check periodically (every 10 minutes) and when user returns to tab
  const {
    data: postData,
    isLoading: isPostLoading,
    error: postError,
    refetch: refetchPost
  } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const key = String(slug || '');
      if (!key) throw new Error('Missing post identifier');
      return resolvePostByKey(key);
    },
    enabled: !!slug,
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes for hidden status
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent excessive requests
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Full ancestor chain (oldest -> ... -> direct parent)

  const isLoading = isPostLoading;
  const error = postError;
  // Ensure detail page scrolls to top when opened (initial), we'll center the current post after data loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  // Resolve full ancestors iteratively
  // Ancestors can also be hidden, so check periodically but less frequently
  const parentId = postData ? extractParentId(postData as any) : null;
  const { data: ancestors = [] } = useQuery<PostDto[]>({
    queryKey: ['post-ancestors', (postData as any)?.id, parentId],
    enabled: !!postData,
    refetchInterval: 15 * 60 * 1000, // Check every 15 minutes for hidden status (less frequent than main post)
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent excessive requests
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    queryFn: async () => {
      const chain: PostDto[] = [];
      const seen = new Set<string>();
      let currentId: string | null = parentId || null;
      let safety = 0;
      while (currentId && !seen.has(currentId) && safety < 100) {
        seen.add(currentId);
        // Use queryClient.fetchQuery to leverage React Query caching and deduplication
        const p = await queryClient.fetchQuery({
          queryKey: ['post', currentId],
          queryFn: async () => {
            return await PostsService.getById({ id: currentId }) as unknown as PostDto;
          },
          staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        });
        // unshift so the oldest ancestor is first
        chain.unshift(p);
        currentId = extractParentId(p as any);
        safety += 1;
      }
      return chain;
    },
  });

  // Center the current post in the viewport once it's rendered
  const currentPostRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!postData) return;
    // Defer to the end of the frame to ensure layout is ready
    const id = window.requestAnimationFrame(() => {
      currentPostRef.current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [postData, ancestors.length]);

  // Use total_comments from postData instead of recursively counting
  // This avoids making hundreds of API requests and significantly improves performance
  // The backend already provides total_comments which includes all descendant comments
  const descendantCount = (postData as any)?.total_comments ?? 0;

  // No need for author helpers; cards handle display

  // Handle reply added callback
  // Extract currentPostId to avoid recreating callback when postData changes (only id matters)
  const currentPostId = postData?.id;
  const handleCommentAdded = useCallback(() => {
    refetchPost();
    // Refresh replies list keys used by DirectReplies and any legacy comment queries
    if (currentPostId) {
      queryClient.refetchQueries({ queryKey: ['post-comments', currentPostId, 'infinite'] });
      queryClient.refetchQueries({ queryKey: ['post-comments', currentPostId] });
    }
  }, [refetchPost, queryClient, currentPostId]);

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

  const renderStack = () => (
    <div className="grid gap-0 md:gap-2">
      {ancestors.map((anc) => (
        <ReplyToFeedItem
          key={anc.id}
          hideParentContext
          allowInlineRepliesToggle={false}
          item={anc as any}
          commentCount={(anc as any).total_comments ?? 0}
          onOpenPost={(idOrSlug) => navigate(`/post/${idOrSlug}`)}
          isActive={false}
        />
      ))}
      {postData && (
        <div ref={currentPostRef}>
          <ReplyToFeedItem hideParentContext allowInlineRepliesToggle={false} item={postData as any} commentCount={descendantCount as number} onOpenPost={(idOrSlug) => navigate(`/post/${idOrSlug}`)} isActive />
        </div>
      )}
    </div>
  );

  const content = (
    <div className="w-full p-0">
      {postData ? (
        <Head
          title={`Post on Superhero.com: "${(postData as any)?.content?.slice(0, 100) || 'Post'}"`}
          description={(postData as any)?.content?.slice(0, 160) || 'View post on Superhero, the crypto social network.'}
          canonicalPath={`/post/${(postData as any)?.slug || String((postData as any)?.id || slug).replace(/_v3$/,'')}`}
          ogImage={(Array.isArray((postData as any)?.media) && (postData as any).media[0]) || undefined}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'SocialMediaPosting',
            headline: (postData as any)?.content?.slice(0, 120) || 'Post',
            datePublished: (postData as any)?.created_at,
            dateModified: (postData as any)?.updated_at || (postData as any)?.created_at,
            author: {
              '@type': 'Person',
              name: (postData as any)?.sender_address,
              identifier: (postData as any)?.sender_address,
            },
            image: Array.isArray((postData as any)?.media) ? (postData as any).media : undefined,
            interactionStatistic: [
              {
                '@type': 'InteractionCounter',
                interactionType: 'CommentAction',
                userInteractionCount: (postData as any)?.total_comments || 0,
              },
            ],
          }}
        />
      ) : null}
      <div className="mb-4">
        <AeButton onClick={() => { navigate('/'); }} variant="ghost" size="sm" outlined className="!border !border-solid !border-white/15 hover:!border-white/35">
          ← Back
        </AeButton>
      </div>

      {isLoading && renderLoadingState()}
      {error && renderErrorState()}

      {postData && (
        <article className="grid gap-4">
          {renderStack()}

          <section className="mt-2">
            <h3 className="text-white/90 font-semibold mb-2">Replies</h3>
            <DirectReplies id={String((postData as any)?.id)} onOpenPost={(idOrSlug) => navigate(`/post/${idOrSlug}`)} />
            <div className="mt-6">
              <CommentForm postId={String((postData as any)?.id)} onCommentAdded={handleCommentAdded} placeholder="Write a reply..." />
            </div>
          </section>
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
