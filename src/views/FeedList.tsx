import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store/store';
import { markTipsNextLoading, markTipsReloading, reloadTips, loadNextPageOfTips, loadCommentCountsForPosts } from '../store/slices/backendSlice';
import AeButton from '../components/AeButton';
import './FeedList.scss';
import { linkify } from '../utils/linkify';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import { open } from '../store/slices/modalsSlice';
import UserBadge from '../components/UserBadge';
import { IconComment, IconSearch, IconFilter, IconSort } from '../icons';
import Identicon from '../components/Identicon';
import { relativeTime } from '../utils/time';
import CreatePost from '../components/CreatePost';

function useQuery() { return new URLSearchParams(useLocation().search); }

const EMPTY_LIST: any[] = [];

export default function FeedList() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const query = useQuery();
  const isHiddenContent = useSelector((s: RootState) => s.root.isHiddenContent);
  const chainNames = useSelector((s: RootState) => s.root.chainNames) as any;

  const feed = query.get('feed') || 'main';
  const sortBy = query.get('sortBy') || 'latest';
  const search = query.get('search') || '';
  const filterBy = query.get('filterBy') || 'all';

  const [localSearch, setLocalSearch] = useState(search);
  const [showFilters, setShowFilters] = useState(false);

  const args = useMemo(() => [sortBy, null, search, isHiddenContent, true, true] as any, [isHiddenContent, search, sortBy]);
  const key = JSON.stringify(args);
  const list = useSelector((s: RootState) => s.backend.tips[key] ?? EMPTY_LIST);
  const endReached = useSelector((s: RootState) => s.backend.tipsEndReached[key]);
  const loadingNext = useSelector((s: RootState) => s.backend.tipsNextPageLoading[key]);
  
  const commentCounts = useSelector((s: RootState) => s.backend.commentCounts);
  const commentCountsLoading = useSelector((s: RootState) => s.backend.commentCountsLoading);

  useEffect(() => {
    dispatch(markTipsReloading(key));
    dispatch(reloadTips(args));
  }, [dispatch, key]);

  useEffect(() => {
    if (list.length > 0) {
      const postIds = list
        .map(item => item.id || item._id)
        .filter(Boolean)
        .filter(postId => !commentCounts[postId] && !commentCountsLoading[postId]);
      
      if (postIds.length > 0) {
        dispatch(loadCommentCountsForPosts(postIds));
      }
    }
  }, [list, dispatch, commentCounts, commentCountsLoading]);

  const getCommentCount = (postId: string) => {
    return commentCounts[postId] ?? 0;
  };

  const filteredAndSortedList = useMemo(() => {
    let filtered = [...list];
    if (localSearch.trim()) {
      const searchTerm = localSearch.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title && item.title.toLowerCase().includes(searchTerm)) ||
        (item.url && item.url.toLowerCase().includes(searchTerm)) ||
        (item.address && item.address.toLowerCase().includes(searchTerm)) ||
        (chainNames?.[item.address] && chainNames[item.address].toLowerCase().includes(searchTerm))
      );
    }
    if (filterBy === 'withMedia') {
      filtered = filtered.filter(item => item.media && Array.isArray(item.media) && item.media.length > 0);
    } else if (filterBy === 'withComments') {
      filtered = filtered.filter(item => {
        const postId = item.id || item._id;
        return getCommentCount(postId) > 0;
      });
    }
    return filtered;
  }, [list, localSearch, filterBy, chainNames, commentCounts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(query);
    if (localSearch.trim()) { params.set('search', localSearch.trim()); } else { params.delete('search'); }
    navigate(`/?${params.toString()}`);
  };

  const handleFilterChange = (newFilter: string) => {
    const params = new URLSearchParams(query);
    if (newFilter === 'all') { params.delete('filterBy'); } else { params.set('filterBy', newFilter); }
    navigate(`/?${params.toString()}`);
  };

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="tips-list">
        {/* Move CreatePost above tab bar */}
        <CreatePost onSuccess={() => { dispatch(markTipsReloading(key)); dispatch(reloadTips(args)); }} />

        <div className="actions">
          <div className="row">
            <AeButton 
              onClick={() => navigate(`/?sortBy=latest`)}
              className={sortBy === 'latest' ? 'active' : ''}
            >
              Latest
            </AeButton>
            <AeButton 
              onClick={() => navigate(`/?sortBy=hot`)}
              className={sortBy === 'hot' ? 'active' : ''}
            >
              Most Popular
            </AeButton>
            <AeButton 
              onClick={() => navigate(`/?sortBy=highest`)}
              className={sortBy === 'highest' ? 'active' : ''}
            >
              Highest Rated
            </AeButton>

          </div>


        </div>

        <div className="feed">
          {filteredAndSortedList.length === 0 && (
            <div className="feed-item empty-state" key="empty">
              <div className="avatar" />
              <div className="content">
                <div className="title">
                  {localSearch ? 'No posts found matching your search.' : 'No posts found.'}
                </div>
                {localSearch && (
                  <div className="subtitle">Try adjusting your search terms or filters.</div>
                )}
              </div>
            </div>
          )}
          {filteredAndSortedList.map((item: any) => {
            const authorAddress = item.address || item.author || item.sender || item.owner || null;
            const postId = item.id || item._id;
            const commentCount = getCommentCount(postId);
            const chainName = chainNames?.[authorAddress];
            
            return (
              <div className="feed-item" key={postId}>
                <div className="avatar-container">
                  {authorAddress && (
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
                  )}
                </div>
                <div className="content" onClick={() => navigate(`/post/${postId}`)} style={{ cursor: 'pointer' }}>
                  <div className="header">
                    <div className="author-section">
                      {authorAddress && (
                        <UserBadge address={authorAddress} showAvatar={false} chainName={chainName} />
                      )}
                    </div>
                    {item.timestamp && (
                      <span className="timestamp">{relativeTime(new Date(item.timestamp))}</span>
                    )}
                  </div>
                  <div className="title">{linkify(item.title)}</div>
                  <div className="url">{linkify(item.url)}</div>
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
                        <IconComment /> {commentCountsLoading[postId] ? '...' : commentCount}
                      </span>
                    </div>
                    <div className="footer-right">
                      <AeButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); dispatch(open({ name: 'feed-item-menu', props: { postId: postId, url: item.url, author: authorAddress } })); }}>•••</AeButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!endReached && filteredAndSortedList.length > 0 && (
          <div className="load-more">
            <AeButton loading={loadingNext} onClick={() => { dispatch(markTipsNextLoading(key)); dispatch(loadNextPageOfTips(args)); }}>Load more</AeButton>
          </div>
        )}
      </div>
    </Shell>
  );
}


