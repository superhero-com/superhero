import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import {
  useNavigate, useParams, Link, useLocation,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowUpRight, ChevronDown, MessageCircle,
} from 'lucide-react';
import { Decimal } from '@/libs/decimal';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useWallet } from '@/hooks';
import AddressAvatar from '@/components/AddressAvatar';
import { Head } from '../../../seo/Head';
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
import { usePostTipSummary } from '../hooks/usePostTipSummary';
import { usePostTips } from '../hooks/usePostTips';
import './PostDetail.css';

const PostTipOverview = ({ post, explorerUrl }: { post: any; explorerUrl?: string }) => {
  const { t } = useTranslation('social');
  const { chainNames } = useWallet();
  const postId = String(post?.id || '');
  const receiver = String(post?.sender_address || post?.senderAddress || '');

  const { data: summary } = usePostTipSummary(postId);
  const total = summary?.totalTips;
  const totalAe = total != null && Number.isFinite(Number(total))
    ? Decimal.from(total).prettify() : '—';

  const { data: tips = [] } = usePostTips(postId, receiver);
  const top = tips.slice(0, 10);
  const explorerBase = (explorerUrl || '').replace(/\/$/, '');

  if (!tips?.length) {
    return null;
  }
  return (
    <details className="post-detail__tips">
      <summary>
        <span>{t('tips')}</span>
        <span className="post-detail__tips-total" dir="ltr">
          {totalAe}
          {' '}
          AE
        </span>
        <span className="post-detail__muted">{t('tipsCount', { count: tips.length })}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="post-detail__tip-list">
        {top.map((tip) => (
          <div key={tip.hash} className="post-detail__tip">
            <AddressAvatar address={tip.sender} size={32} />
            <div className="post-detail__tip-identity">
              <Link to={`/users/${tip.sender}`}><bdi>{chainNames?.[tip.sender] || tip.sender}</bdi></Link>
              {chainNames?.[tip.sender] && <span dir="ltr">{tip.sender}</span>}
              <small>{tip.date}</small>
            </div>
            <strong dir="ltr">
              {Decimal.from(tip.amountAe).prettify()}
              {' '}
              AE
            </strong>
            {explorerBase && (
              <a
                href={`${explorerBase}/transactions/${tip.hash}`}
                target="_blank"
                rel="noreferrer"
                aria-label={t('viewTip')}
                title={t('viewTip')}
              >
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
        {tips.length > top.length && <p className="post-detail__muted">{t('showingLatestTips', { count: top.length })}</p>}
      </div>
    </details>
  );
};

const PostDetail = ({ standalone = true }: { standalone?: boolean } = {}) => {
  const { t } = useTranslation(['forms', 'social', 'common']);
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { activeNetwork } = useAeSdk();

  // Query for post data using new PostsService
  const {
    data: postData,
    isLoading: isPostLoading,
    error: postError,
    refetch: refetchPost,
  } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const key = String(slug || '');
      if (!key) throw new Error('Missing post identifier');
      return resolvePostByKey(key);
    },
    enabled: !!slug,
    refetchInterval: 120 * 1000, // Auto-refresh every 2 minutes
  });

  // Full ancestor chain (oldest -> ... -> direct parent)

  const isLoading = isPostLoading;
  const error = postError;
  // Ensure detail page scrolls to top when opened (initial),
  // we'll center the current post after data loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Resolve full ancestors iteratively
  const parentId = postData ? extractParentId(postData as any) : null;
  const { data: ancestors = [], isLoading: isAncestorsLoading } = useQuery<PostDto[]>({
    queryKey: ['post-ancestors', (postData as any)?.id, parentId],
    enabled: !!postData,
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const fetchChain = async (
        currentId: string | null,
        chain: PostDto[],
        seen: Set<string>,
        safety: number,
      ): Promise<PostDto[]> => {
        if (!currentId || seen.has(currentId) || safety >= 100) {
          return chain;
        }
        seen.add(currentId);
        const p = (await PostsService.getById({ id: currentId })) as unknown as PostDto;
        // unshift so the oldest ancestor is first
        const nextChain = [p, ...chain];
        const nextId = extractParentId(p as any);
        return fetchChain(nextId, nextChain, seen, safety + 1);
      };
      return fetchChain(parentId || null, [], new Set<string>(), 0);
    },
  });

  const currentPostRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const focusedPostId = useRef<string | null>(null);
  // Only position a newly opened thread. Background refresh must not move the reader.
  useEffect(() => {
    if (!postData?.id || isAncestorsLoading || focusedPostId.current === postData.id) {
      return () => {};
    }
    const id = window.requestAnimationFrame(() => {
      focusedPostId.current = postData.id;
      if (ancestors.length) currentPostRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      else window.scrollTo(0, 0);
    });
    return () => window.cancelAnimationFrame(id);
  }, [postData?.id, ancestors.length, isAncestorsLoading]);

  const focusReply = () => {
    composerRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    composerRef.current?.querySelector<HTMLElement>('textarea, button')?.focus({ preventScroll: true });
  };

  // Compute total descendant comments (all levels) for current post
  // Use postData.id in cache key for consistency (same post regardless of slug/ID navigation)
  const { data: descendantCount } = useQuery<number>({
    queryKey: ['post-desc-count', postData?.id],
    enabled: !!postData?.id,
    refetchInterval: 120 * 1000,
    queryFn: async () => {
      const normalize = (id: string) => (String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`);
      const postIdForQuery = postData!.id;
      const requestBudgetRef = { value: 200 };

      const fetchAllPages = async (
        current: string,
        page = 1,
        acc: PostDto[] = [],
      ): Promise<PostDto[]> => {
        if (requestBudgetRef.value <= 0) return acc;
        requestBudgetRef.value -= 1;
        const res: any = await PostsService.getComments({
          id: current, orderDirection: 'ASC', page, limit: 50,
        });
        const items: PostDto[] = res?.items || [];
        const nextAcc = acc.concat(items);
        const meta = res?.meta;
        if (!meta?.currentPage || !meta?.totalPages || meta.currentPage >= meta.totalPages) {
          return nextAcc;
        }
        return fetchAllPages(current, meta.currentPage + 1, nextAcc);
      };

      const processQueue = async (queue: string[], total = 0): Promise<number> => {
        if (queue.length === 0 || requestBudgetRef.value <= 0) return total;
        const [current, ...rest] = queue;
        const items = await fetchAllPages(current);
        const childIds = items
          .filter((child) => (child.total_comments ?? 0) > 0)
          .map((child) => normalize(String(child.id)));
        return processQueue(rest.concat(childIds), total + items.length);
      };

      return processQueue([normalize(String(postIdForQuery))]);
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
      queryClient.refetchQueries({ queryKey: ['post-comments', currentPostId, 'infinite'] });
      queryClient.refetchQueries({ queryKey: ['post-comments', currentPostId] });
    }
  }, [refetchPost, queryClient, currentPostId]);

  // Render helpers
  const renderLoadingState = () => (
    <div className="post-detail__state" role="status">{t('social:loading')}</div>
  );

  const renderErrorState = () => (
    <div className="post-detail__state" role="alert">
      {t('social:errorLoadingPost')}
      <AeButton
        variant="ghost"
        size="sm"
        onClick={() => {
          refetchPost();
        }}
      >
        {t('common:buttons.retry')}
      </AeButton>
    </div>
  );

  const renderStack = () => (
    <div className="post-detail__thread">
      {ancestors.length > 0 && <p className="post-detail__context-label">{t('social:postDetail.earlier')}</p>}
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
        <div ref={currentPostRef} className="post-detail__current">
          <ReplyToFeedItem hideParentContext allowInlineRepliesToggle={false} item={postData as any} commentCount={(descendantCount ?? (postData as any).total_comments ?? 0) as number} onOpenPost={(idOrSlug) => navigate(`/post/${idOrSlug}`)} onReply={focusReply} presentation="detail" isActive />
        </div>
      )}
    </div>
  );

  const content = (
    <div className="post-detail">
      {postData ? (
        <Head
          title={`Post on Superhero.com: "${(postData as any)?.content?.slice(0, 100) || 'Post'}"`}
          description={(postData as any)?.content?.slice(0, 160) || t('social:viewPostDefaultDescription')}
          canonicalPath={`/post/${(postData as any)?.slug || String((postData as any)?.id || slug).replace(/_v3$/, '')}`}
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
      <header className="post-detail__navigation">
        <button
          type="button"
          className="post-detail__back"
          onClick={() => {
            const fromFeedUrl = (location.state as { fromFeedUrl?: string })?.fromFeedUrl;
            navigate(fromFeedUrl || '/');
          }}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          {t('common:labels.back')}
        </button>
        <h1>{t('social:postDetail.title')}</h1>
        {postData && (
          <button type="button" className="post-detail__join" onClick={focusReply}>
            <MessageCircle size={16} aria-hidden="true" />
            {t('social:postLayout.reply')}
          </button>
        )}
      </header>

      {isLoading && renderLoadingState()}
      {error && renderErrorState()}

      {postData && (
        <div className="post-detail__body">
          {renderStack()}
          <PostTipOverview post={postData} explorerUrl={activeNetwork?.explorerUrl} />
          <section className="post-detail__conversation" aria-labelledby="post-conversation-heading">
            <div className="post-detail__section-heading">
              <h2 id="post-conversation-heading">{t('social:postDetail.conversation')}</h2>
              <span>{t('social:postLayout.replies', { count: descendantCount ?? postData.total_comments ?? 0 })}</span>
            </div>
            <div ref={composerRef} id="post-reply-composer" className="post-detail__composer">
              <CommentForm postId={String(postData.id)} onCommentAdded={handleCommentAdded} placeholder={t('forms:writeReply')} appearance="integrated" />
            </div>
            <DirectReplies id={String(postData.id)} onOpenPost={(idOrSlug) => navigate(`/post/${idOrSlug}`)} />
          </section>
        </div>
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
};

export default PostDetail;
