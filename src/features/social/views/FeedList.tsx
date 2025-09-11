import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostsService } from '../../../api/generated';
import AeButton from '../../../components/AeButton';
import Shell from '../../../components/layout/Shell';
import LeftRail from '../../../components/layout/LeftRail';
import RightRail from '../../../components/layout/RightRail';
import { useWallet } from '../../../hooks';
import CreatePost from '../components/CreatePost';
import SortControls from '../components/SortControls';
import EmptyState from '../components/EmptyState';
import FeedItem from '../components/FeedItem';
import { PostApiResponse } from '../types';

// Custom hook
function useUrlQuery() { return new URLSearchParams(useLocation().search); }

export default function FeedList() {
  const navigate = useNavigate();
  const urlQuery = useUrlQuery();
  const { chainNames } = useWallet();

  // Comment counts are now provided directly by the API in post.total_comments

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
    queryKey: ['posts', { limit: 10, sortBy, search, filterBy }],
    queryFn: ({ pageParam = 1 }) => PostsService.listAll({
      limit: 10,
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
  const list = useMemo(() =>
    data?.pages?.flatMap(page => page?.items ?? []) ?? [],
    [data]
  );

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
        return (item.total_comments ?? 0) > 0;
      });
    }

    return filtered;
  }, [list, localSearch, filterBy, chainNames]);

  // Memoized event handlers for better performance
  const handleSortChange = useCallback((newSortBy: string) => {
    navigate(`/?sortBy=${newSortBy}`);
  }, [navigate]);

  const handleItemClick = useCallback((postId: string) => {
    navigate(`/post/${postId}`);
  }, [navigate]);

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

  // Memoized render function for better performance
  const renderFeedItems = useMemo(() => {
    return filteredAndSortedList.map((item) => {
      const postId = item.id;
      const authorAddress = item.sender_address;
      const commentCount = item.total_comments ?? 0;
      const chainName = chainNames?.[authorAddress];

      return (
        <FeedItem
          key={postId}
          item={item}
          commentCount={commentCount}
          onItemClick={handleItemClick}
        />
      );
    });
  }, [filteredAndSortedList, chainNames, handleItemClick]);

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="max-w-[680px] mx-auto">
        <CreatePost onSuccess={refetch} />

        <SortControls sortBy={sortBy} onSortChange={handleSortChange} />

        <div className="py-2 max-w-[680px] mx-auto mobile:pt-4 mobile:px-3 mobile-small:px-2">
          {renderEmptyState()}
          {renderFeedItems}
        </div>

        {hasNextPage && filteredAndSortedList.length > 0 && (
          <div className="p-6 text-center mobile:p-4">
            <AeButton
              loading={isFetchingNextPage}
              onClick={() => fetchNextPage()}
              className="bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-cubic-bezier hover:from-white/15 hover:to-white/10 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            >
              Load more
            </AeButton>
          </div>
        )}
      </div>
    </Shell>
  );
}
