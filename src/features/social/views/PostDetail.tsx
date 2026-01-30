import { useQuery, useQueryClient } from '@tanstack/react-query';
import Head from '../../../seo/Head';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PostDto } from '../../../api/generated';
import AeButton from '../../../components/AeButton';
import LeftRail from '../../../components/layout/LeftRail';
import RightRail from '../../../components/layout/RightRail';
import Shell from '../../../components/layout/Shell';
import { extractParentId } from '../utils/postParent';
import ReplyToFeedItem from '../components/ReplyToFeedItem';
// PostTipButton is intentionally not imported here as it's not used on detail page
import DirectReplies from '../components/DirectReplies';
import CommentForm from '../components/CommentForm';
import { useActiveChain } from '@/hooks/useActiveChain';
import { useChainAdapter } from '@/chains/useChainAdapter';
import { Decimal } from '@/libs/decimal';
import { usePostTipSummary } from '../hooks/usePostTipSummary';
import { usePostTips } from '../hooks/usePostTips';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useWallet } from '@/hooks';
import { Link } from 'react-router-dom';
import { formatAddress } from '@/utils/address';

export default function PostDetail({ standalone = true }: { standalone?: boolean } = {}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeNetwork } = useAeSdk();
  const { selectedChain } = useActiveChain();
  const chainAdapter = useChainAdapter();

  // Query for post data using new PostsService
  const {
    data: postData,
    isLoading: isPostLoading,
    error: postError,
    refetch: refetchPost
  } = useQuery({
    queryKey: ['post', selectedChain, slug],
    queryFn: async () => {
      const key = String(slug || '');
      if (!key) throw new Error('Missing post identifier');
      return chainAdapter.getPostByKey(key);
    },
    enabled: !!slug,
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
  const parentId = postData ? extractParentId(postData as any, selectedChain) : null;
  const { data: ancestors = [] } = useQuery<PostDto[]>({
    queryKey: ['post-ancestors', selectedChain, (postData as any)?.id, parentId],
    enabled: !!postData,
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const chain: PostDto[] = [];
      const seen = new Set<string>();
      let currentId: string | null = parentId || null;
      let safety = 0;
      while (currentId && !seen.has(currentId) && safety < 100) {
        seen.add(currentId);
        const p = (await chainAdapter.getPostById(currentId)) as unknown as PostDto;
        // unshift so the oldest ancestor is first
        chain.unshift(p);
        currentId = extractParentId(p as any, selectedChain);
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
  // Use postData.id in cache key for consistency (same post regardless of slug/ID navigation)
  const { data: descendantCount } = useQuery<number>({
    queryKey: ['post-desc-count', selectedChain, postData?.id],
    enabled: !!postData?.id,
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const normalize = (id: string) => {
        if (selectedChain === 'solana') return String(id);
        return String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`;
      };
      const postIdForQuery = postData!.id;
      const queue: string[] = [normalize(String(postIdForQuery))];
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
          const res: any = await chainAdapter.listPostComments({ id: current, orderDirection: 'ASC', page, limit: 50 });
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
  // Extract currentPostId to avoid recreating callback when postData changes (only id matters)
  const currentPostId = postData?.id;
  const handleCommentAdded = useCallback(() => {
    refetchPost();
    // Refresh replies list keys used by DirectReplies and any legacy comment queries
    if (currentPostId) {
      queryClient.refetchQueries({ queryKey: ['post-comments', selectedChain, currentPostId, 'infinite'] });
      queryClient.refetchQueries({ queryKey: ['post-comments', selectedChain, currentPostId] });
    }
  }, [refetchPost, queryClient, currentPostId, selectedChain]);

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
          <ReplyToFeedItem hideParentContext allowInlineRepliesToggle={false} item={postData as any} commentCount={(descendantCount ?? (postData as any).total_comments ?? 0) as number} onOpenPost={(idOrSlug) => navigate(`/post/${idOrSlug}`)} isActive />
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
            <h3 className="text-white/90 font-semibold mb-2">Tips</h3>
            <PostTipOverview post={postData as any} explorerUrl={activeNetwork?.explorerUrl} />
          </section>

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

function PostTipOverview({ post, explorerUrl }: { post: any; explorerUrl?: string }) {
  const { chainNames } = useWallet();
  const postId = String(post?.id || '');
  const receiver = String(post?.sender_address || post?.senderAddress || '');

  const { data: summary } = usePostTipSummary(postId);
  const total = summary?.totalTips != null ? Number(summary.totalTips) : 0;
  const totalAe = Number.isFinite(total) ? total : 0;

  const { data: tips = [], isLoading } = usePostTips(postId, receiver);
  const top = tips.slice(0, 10);
  const explorerBase = (explorerUrl || '').replace(/\/$/, '');

  return (
    <div className="border border-white/10 rounded-2xl p-3 sm:p-4 bg-white/[0.05] backdrop-blur-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white/70">
          Total tipped: <span className="text-white font-semibold">{Decimal.from(String(totalAe)).prettify()}</span> AE
        </div>
        <div className="text-xs text-white/50">{tips.length ? `${tips.length} tips` : ''}</div>
      </div>

      {isLoading && <div className="text-sm text-white/60">Loading tips…</div>}
      {!isLoading && tips.length === 0 && (
        <div className="text-sm text-white/60">No tips yet.</div>
      )}

      {!isLoading && tips.length > 0 && (
        <div className="grid gap-2">
          {top.map((t) => (
            <div key={t.hash} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/users/${t.sender}`}
                  className="text-sm text-white truncate hover:underline"
                  title={t.sender}
                >
                  {chainNames?.[t.sender] || formatAddress(t.sender, 3, true)}
                </Link>
                <div className="text-xs text-white/50 truncate">{t.date}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-sm text-white font-semibold">
                  {Decimal.from(t.amountAe).prettify()} AE
                </div>
                {explorerBase && (
                  <a
                    className="text-xs text-[#4ecdc4] hover:text-[#3ab3aa]"
                    href={`${explorerBase}/transactions/${t.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
          {tips.length > top.length && (
            <div className="text-xs text-white/50 pt-1">Showing latest {top.length} tips.</div>
          )}
        </div>
      )}
    </div>
  );
}
