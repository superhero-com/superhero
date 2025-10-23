import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function PostDetail({ standalone = true }: { standalone?: boolean } = {}) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Full ancestor chain (oldest -> ... -> direct parent)

  const isLoading = isPostLoading;
  const error = postError;
  // Ensure detail page scrolls to top when opened (initial), we'll center the current post after data loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  // Resolve full ancestors iteratively
  const parentId = postData ? extractParentId(postData as any) : null;
  const { data: ancestors = [] } = useQuery<PostDto[]>({
    queryKey: ['post-ancestors', postId, parentId],
    enabled: !!postData,
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const chain: PostDto[] = [];
      const seen = new Set<string>();
      let currentId: string | null = parentId || null;
      let safety = 0;
      while (currentId && !seen.has(currentId) && safety < 100) {
        seen.add(currentId);
        const p = (await PostsService.getById({ id: currentId })) as unknown as PostDto;
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

  // Compute total descendant comments (all levels) for current post
  const { data: descendantCount } = useQuery<number>({
    queryKey: ['post-desc-count', postId],
    enabled: !!postId,
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const normalize = (id: string) => (String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`);
      const queue: string[] = [normalize(String(postId))];
      let total = 0;
      let requestBudget = 200; // safety cap
      while (queue.length > 0 && requestBudget > 0) {
        const current = queue.shift()!;
        // paginate through comments for this id
        let page = 1;
        // loop pages
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (requestBudget <= 0) break;
          requestBudget -= 1;
          const res: any = await PostsService.getComments({ id: current, orderDirection: 'ASC', page, limit: 50 });
          const items: PostDto[] = res?.items || [];
          total += items.length;
          // enqueue children that have further replies
          for (const child of items) {
            if ((child.total_comments ?? 0) > 0) {
              queue.push(normalize(String(child.id)));
            }
          }
          const meta = res?.meta;
          if (!meta?.currentPage || !meta?.totalPages || meta.currentPage >= meta.totalPages) break;
          page = meta.currentPage + 1;
        }
      }
      // Do not count the root itself, only descendants counted in total
      return total;
    },
  });

  // No need for author helpers; cards handle display

  // Handle reply added callback
  const handleCommentAdded = useCallback(() => {
    refetchPost();
    // Refresh replies list keys used by DirectReplies and any legacy comment queries
    if (postId) {
      queryClient.refetchQueries({ queryKey: ['post-comments', postId, 'infinite'] });
      queryClient.refetchQueries({ queryKey: ['post-comments', postId] });
    }
  }, [refetchPost, queryClient, postId]);

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
          onOpenPost={(id) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)}
          isActive={false}
        />
      ))}
      {postData && (
        <div ref={currentPostRef}>
          <ReplyToFeedItem hideParentContext allowInlineRepliesToggle={false} item={postData as any} commentCount={(descendantCount ?? (postData as any).total_comments ?? 0) as number} onOpenPost={(id) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)} isActive />
        </div>
      )}
    </div>
  );

  const content = (
    <div className="w-full p-0">
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
              <CommentForm postId={postId!} onCommentAdded={handleCommentAdded} placeholder="Write a reply..." />
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
