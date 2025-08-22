import React, { useEffect, useMemo, useState, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { RootState, AppDispatch } from '../store/store';
import { loadCommentCountsForPosts } from '../store/slices/backendSlice';
import { fetchPosts } from '../api/backend';
import AeButton from '../components/AeButton';
import './FeedList.scss';
import { linkify } from '../utils/linkify';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import { open } from '../store/slices/modalsSlice';
import UserBadge from '../components/UserBadge';
import { IconComment } from '../icons';
import Identicon from '../components/Identicon';
import { relativeTime } from '../utils/time';
import CreatePost from '../components/CreatePost';
import { PostDto, PostsService } from '../api/generated';

// Types
interface PostApiResponse {
  items: PostDto[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

interface FeedItemProps {
  item: PostDto;
  commentCount: number;
  isCommentLoading: boolean;
  chainName?: string;
  onItemClick: (postId: string) => void;
  onMenuClick: (postId: string, url: string, author: string) => void;
}

interface PostAvatarProps {
  authorAddress: string;
  chainName?: string;
}

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

interface EmptyStateProps {
  type: 'error' | 'empty' | 'loading';
  error?: Error | null;
  hasSearch?: boolean;
  onRetry?: () => void;
}

// Custom hook
function useUrlQuery() { return new URLSearchParams(useLocation().search); }

// Component: Post Avatar with chain name support
const PostAvatar = memo(({ authorAddress, chainName }: PostAvatarProps) => (
  <div className="avatar-container">
    <div className="avatar-stack">
      {chainName && (
        <div className="chain-avatar">
          <Identicon address={authorAddress} size={48} name={chainName} />
        </div>
      )}
      {(!chainName || chainName === 'Legend') && (
        <div className="address-avatar">
          <Identicon address={authorAddress} size={48} />
        </div>
      )}
      {chainName && chainName !== 'Legend' && (
        <div className="address-avatar-overlay">
          <Identicon address={authorAddress} size={24} />
        </div>
      )}
    </div>
  </div>
));

// Component: Sort Controls
const SortControls = memo(({ sortBy, onSortChange }: SortControlsProps) => (
  <div className="actions">
    <div className="row">
      <AeButton 
        onClick={() => onSortChange('latest')}
        className={sortBy === 'latest' ? 'active' : ''}
      >
        Latest
      </AeButton>
      <AeButton 
        onClick={() => onSortChange('hot')}
        className={sortBy === 'hot' ? 'active' : ''}
      >
        Most Popular
      </AeButton>
      <AeButton 
        onClick={() => onSortChange('highest')}
        className={sortBy === 'highest' ? 'active' : ''}
      >
        Highest Rated
      </AeButton>
    </div>
  </div>
));

// Component: Empty State
const EmptyState = memo(({ type, error, hasSearch, onRetry }: EmptyStateProps) => {
  const getContent = () => {
    switch (type) {
      case 'error':
        return {
          title: 'Failed to load posts',
          subtitle: error instanceof Error ? error.message : 'An error occurred while fetching posts',
          showRetry: true
        };
      case 'empty':
        return {
          title: hasSearch ? 'No posts found matching your search.' : 'No posts found.',
          subtitle: hasSearch ? 'Try adjusting your search terms or filters.' : undefined,
          showRetry: false
        };
      case 'loading':
        return {
          title: 'Loading posts...',
          subtitle: undefined,
          showRetry: false
        };
      default:
        return { title: '', subtitle: undefined, showRetry: false };
    }
  };

  const { title, subtitle, showRetry } = getContent();

  return (
    <div className="feed-item empty-state" key={type}>
      <div className="avatar" />
      <div className="content">
        <div className="title">{title}</div>
        {subtitle && <div className="subtitle">{subtitle}</div>}
        {showRetry && onRetry && <AeButton onClick={onRetry}>Retry</AeButton>}
      </div>
    </div>
  );
});

// Component: Individual Feed Item
const FeedItem = memo(({ 
  item, 
  commentCount, 
  isCommentLoading, 
  chainName, 
  onItemClick, 
  onMenuClick 
}: FeedItemProps) => {
  const postId = item.id;
  const authorAddress = item.sender_address;

  const handleItemClick = () => {
    onItemClick(postId);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuClick(postId, '', authorAddress); // URL not available in PostDto
  };

  return (
    <div className="feed-item" key={postId}>
      {authorAddress && (
        <PostAvatar authorAddress={authorAddress} chainName={chainName} />
      )}
      
      <div className="content" onClick={handleItemClick} style={{ cursor: 'pointer' }}>
        <div className="header">
          <div className="author-section">
            {authorAddress && (
              <UserBadge address={authorAddress} showAvatar={false} chainName={chainName} />
            )}
          </div>
          {item.created_at && (
            <span className="timestamp">{relativeTime(new Date(item.created_at))}</span>
          )}
        </div>
        
        <div className="title">{linkify(item.content)}</div>
        
        {item.media && Array.isArray(item.media) && item.media.length > 0 && (
          <div className="media-grid">
            {item.media.slice(0, 4).map((m: string) => (
              <img key={m} src={m} alt="media" className="media-item" />
            ))}
          </div>
        )}
        
        <div className="footer">
          <div className="footer-left">
            <span className="comment-count">
              <IconComment /> {isCommentLoading ? '...' : commentCount}
            </span>
          </div>
          <div className="footer-right">
            <AeButton variant="ghost" size="sm" onClick={handleMenuClick}>
              •••
            </AeButton>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function FeedList() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const urlQuery = useUrlQuery();
  const chainNames = useSelector((s: RootState) => s.root.chainNames) as any;
  const commentCounts = useSelector((s: RootState) => s.backend.commentCounts);
  const commentCountsLoading = useSelector((s: RootState) => s.backend.commentCountsLoading);

  // URL parameters
  const sortBy = urlQuery.get('sortBy') || 'latest';
  const search = urlQuery.get('search') || '';
  const filterBy = urlQuery.get('filterBy') || 'all';

  const [localSearch, setLocalSearch] = useState(search);

  // Infinite query for posts
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['posts', { limit: 5, sortBy, search, filterBy }],
    queryFn: ({ pageParam = 1 }) => PostsService.listAll({ 
      limit: 5, 
      page: pageParam,
      orderBy: sortBy === 'latest' ? 'created_at' : sortBy === 'hot' ? 'total_comments' : 'created_at',
      orderDirection: 'DESC',
      search: localSearch,
    }) as unknown as Promise<PostApiResponse>,
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.currentPage && lastPage?.meta?.totalPages && 
          lastPage.meta.currentPage < lastPage.meta.totalPages) {
        return lastPage.meta.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Derived state
  const list: PostDto[] = useMemo(() => 
    data?.pages?.flatMap(page => page?.items ?? []) ?? [], 
    [data]
  );

  // Load comment counts for posts
  useEffect(() => {
    if (list.length > 0) {
      const postIds = list
        .map(item => item.id)
        .filter(Boolean)
        .filter(postId => !commentCounts[postId] && !commentCountsLoading[postId]);
      
      if (postIds.length > 0) {
        dispatch(loadCommentCountsForPosts(postIds));
      }
    }
  }, [list, dispatch, commentCounts, commentCountsLoading]);

  // Memoized filtered list
  const filteredAndSortedList = useMemo(() => {
    let filtered = [...list];
    
    if (localSearch.trim()) {
      const searchTerm = localSearch.toLowerCase();
      filtered = filtered.filter(item => 
        (item.content && item.content.toLowerCase().includes(searchTerm)) ||
        (item.topics && item.topics.some(topic => topic.toLowerCase().includes(searchTerm))) ||
        (item.sender_address && item.sender_address.toLowerCase().includes(searchTerm)) ||
        (chainNames?.[item.sender_address] && chainNames[item.sender_address].toLowerCase().includes(searchTerm))
      );
    }
    
    if (filterBy === 'withMedia') {
      filtered = filtered.filter(item => item.media && Array.isArray(item.media) && item.media.length > 0);
    } else if (filterBy === 'withComments') {
      filtered = filtered.filter(item => {
        return (commentCounts[item.id] ?? 0) > 0;
      });
    }
    
    return filtered;
  }, [list, localSearch, filterBy, chainNames, commentCounts]);

  // Event handlers
  const handleSortChange = (newSortBy: string) => {
    navigate(`/?sortBy=${newSortBy}`);
  };

  const handleItemClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const handleMenuClick = (postId: string, url: string, author: string) => {
    dispatch(open({ 
      name: 'feed-item-menu', 
      props: { postId, url, author } 
    }));
  };

  // Render helpers
  const renderEmptyState = () => {
    if (error) {
      return <EmptyState type="error" error={error} onRetry={refetch} />;
    }
    if (!error && filteredAndSortedList.length === 0 && !isLoading) {
      return <EmptyState type="empty" hasSearch={!!localSearch} />;
    }
    if (isLoading && filteredAndSortedList.length === 0) {
      return <EmptyState type="loading" />;
    }
    return null;
  };

  const renderFeedItems = () => {
    return filteredAndSortedList.map((item) => {
      const postId = item.id;
      const authorAddress = item.sender_address;
      const commentCount = commentCounts[postId] ?? 0;
      const isCommentLoading = commentCountsLoading[postId] ?? false;
      const chainName = chainNames?.[authorAddress];

      return (
        <FeedItem
          key={postId}
          item={item}
          commentCount={commentCount}
          isCommentLoading={isCommentLoading}
          chainName={chainName}
          onItemClick={handleItemClick}
          onMenuClick={handleMenuClick}
        />
      );
    });
  };

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="tips-list">
        <CreatePost onSuccess={refetch} />
        
        <SortControls sortBy={sortBy} onSortChange={handleSortChange} />

        <div className="feed">
          {renderEmptyState()}
          {renderFeedItems()}
        </div>

        {hasNextPage && filteredAndSortedList.length > 0 && (
          <div className="load-more">
            <AeButton 
              loading={isFetchingNextPage} 
              onClick={() => fetchNextPage()}
            >
              Load more
            </AeButton>
          </div>
        )}
      </div>
    </Shell>
  );
}


