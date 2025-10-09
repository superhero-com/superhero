import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PostsService, PostDto } from '../../../api/generated';
import AeButton from '../../../components/AeButton';
import LeftRail from '../../../components/layout/LeftRail';
import RightRail from '../../../components/layout/RightRail';
import Shell from '../../../components/layout/Shell';
import { extractParentId } from '../utils/postParent';
import ReplyToFeedItem from '../components/ReplyToFeedItem';
import DirectReplies from '../components/DirectReplies';
import CommentForm from '../components/CommentForm';

export default function PostDetail({ standalone = true }: { standalone?: boolean } = {}) {
  const { postId } = useParams();
  const navigate = useNavigate();

  // Query for post data using new PostsService
  const {
    data: postData,
    isLoading: isPostLoading,
    error: postError,
    refetch: refetchPost
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostsService.getById({ id: `${String(postId).replace(/_v3$/,'')}_v3` }),
    enabled: !!postId,
    refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
  });





  // Ancestors (max 2 levels): grandparent -> parent -> current
  const { grandParent, parent } = useMemo(() => ({ grandParent: null as PostDto | null, parent: null as PostDto | null }), []);

  const isLoading = isPostLoading;
  const error = postError;
  // Ensure detail page scrolls to top when opened
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  // Resolve parent/grandparent sequentially
  const parentId = postData ? extractParentId(postData as any) : null;
  const { data: parentData } = useQuery({
    queryKey: ['post-parent', parentId],
    queryFn: () => (parentId ? PostsService.getById({ id: parentId }) : Promise.resolve(null as any)),
    enabled: !!parentId,
  });
  const grandId = parentData ? extractParentId(parentData as any) : null;
  const { data: grandData } = useQuery({
    queryKey: ['post-grand', grandId],
    queryFn: () => (grandId ? PostsService.getById({ id: grandId }) : Promise.resolve(null as any)),
    enabled: !!grandId,
  });

  // No need for author helpers; cards handle display

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

  const renderStack = () => (
    <div className="grid gap-3">
      {grandData && (
        <ReplyToFeedItem hideParentContext item={grandData as any} commentCount={(grandData as any).total_comments ?? 0} onOpenPost={(id) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)} />
      )}
      {parentData && (
        <ReplyToFeedItem hideParentContext item={parentData as any} commentCount={(parentData as any).total_comments ?? 0} onOpenPost={(id) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)} />
      )}
      {postData && (
        <ReplyToFeedItem hideParentContext item={postData as any} commentCount={(postData as any).total_comments ?? 0} onOpenPost={(id) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)} />
      )}
    </div>
  );

  const content = (
    <div className="w-full py-2 px-2 sm:px-3 md:px-4">
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
            <DirectReplies id={postId!} onOpenPost={(id) => navigate(`/post/${id}`)} />
            <div className="mt-6">
              <CommentForm postId={postId!} onCommentAdded={() => {}} placeholder="Write a reply..." />
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
