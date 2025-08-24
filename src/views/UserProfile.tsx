import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AeButton from '../components/AeButton';
import AeAmountFiat from '../components/AeAmountFiat';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import UserBadge from '../components/UserBadge';
import { IconComment } from '../icons';
import Identicon from '../components/Identicon';
import { linkify } from '../utils/linkify';
import { relativeTime } from '../utils/time';
import { Backend } from '../api/backend';
import CreatePost from '../components/CreatePost';
import { deeplinkTip } from '../auth/deeplink';

import { useWallet, useBackend, useModal } from '../../hooks';

const EMPTY_LIST: any[] = [];

export default function UserProfile() {
  const navigate = useNavigate();
  const { address } = useParams();
  const { chainNames, balance, address: myAddress } = useWallet();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<'feed'>('feed');
  const [showTipBox, setShowTipBox] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>('0.1');
  const [tipMessage, setTipMessage] = useState<string>('');

  // Load user's posts - simplified since we're removing Redux backend
  const [list, setList] = useState(EMPTY_LIST);
  const [endReached, setEndReached] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  
  // Comment counts state - simplified
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentCountsLoading, setCommentCountsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!address) return;
    // Load user posts - simplified implementation
    
    // Load profile and stats
    Backend.getProfile(address).then(setProfile).catch(() => {});
    Backend.getSenderStats(address).then(setStats).catch(() => {});
  }, [address]);

  // Load comment counts for posts when the list changes
  useEffect(() => {
    if (list.length > 0) {
      const postIds = list
        .map(item => item.id || item._id)
        .filter(Boolean)
        .filter(postId => !commentCounts[postId] && !commentCountsLoading[postId]);
      
      if (postIds.length > 0) {
        // Load comment counts - simplified implementation
      }
    }
  }, [list, commentCounts, commentCountsLoading]);

  // Helper function to get comment count for a post
  const getCommentCount = (postId: string) => {
    return commentCounts[postId] ?? 0;
  };

  const chainName = chainNames?.[address];

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.5rem 1rem' }}>
        {/* Profile header */}
        <div style={{ background: '#242430', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="profile-avatar-container">
              <div className="avatar-stack">
                {/* Chain avatar (bigger) if available */}
                {chainName && chainName !== 'Legend' && (
                  <div className="chain-avatar">
                    <Identicon address={address} size={64} name={chainName} />
                  </div>
                )}
                {/* Address avatar (smaller) if no chain name, or as overlay */}
                {(!chainName || chainName === 'Legend') && (
                  <div className="address-avatar">
                    <Identicon address={address} size={64} />
                  </div>
                )}
                {/* Overlay avatar for chain names */}
                {chainName && chainName !== 'Legend' && (
                  <div className="address-avatar-overlay">
                    <Identicon address={address} size={32} />
                  </div>
                )}
              </div>
            </div>
            <div>
              {address && (
                <UserBadge 
                  address={address} 
                  showAvatar={false}
                  chainName={chainName}
                />
              )}
              <div style={{ marginTop: 6, fontSize: 14 }}>
                <span style={{ color: '#c3c3c7' }}>Balance: </span>
                <AeAmountFiat amount={balance || 0} />
              </div>
              {profile?.createdAt && (
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  <span style={{ color: '#c3c3c7' }}>Joined </span>
                  {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 14 }}>
            <div><strong>{stats?.totalTipsLength ?? 0}</strong> Tips Sent</div>
            <div><strong>{stats?.receivedTipsLength ?? 0}</strong> Tips Received</div>
            <div><strong>{stats?.commentsLength ?? 0}</strong> Replies</div>
            <div><strong>{stats?.urlsLength ?? 0}</strong> URLs</div>
          </div>

          {/* Channel / Activity controls (visual only) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <AeButton>Channel</AeButton>
            <AeButton green>Activity</AeButton>
            {address && myAddress !== address && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  style={{ width: 90, background: '#1c1c24', color: '#fff', border: '1px solid #2f2f3b', borderRadius: 6, padding: '6px 8px' }}
                  placeholder="Amount"
                  aria-label="Tip amount in AE"
                />
                <AeButton onClick={() => setShowTipBox((v) => !v)}>{showTipBox ? 'Cancel' : 'Tip'}</AeButton>
              </div>
            )}
          </div>
        </div>

        {showTipBox && address && myAddress !== address && (
          <div style={{ background: '#242430', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 14, opacity: 0.9 }}>Send a tip with a message</div>
            <CreatePost
              className="compact"
              onSuccess={() => setShowTipBox(false)}
              onClose={() => setShowTipBox(false)}
              onTextChange={setTipMessage}
            />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <AeButton
                onClick={() => {
                  const amt = parseFloat(tipAmount || '0');
                  if (!Number.isFinite(amt) || amt <= 0) return;
                  const text = tipMessage.trim();
                  deeplinkTip({ to: address, amount: amt, text });
                }}
              >Send Tip</AeButton>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #2f2f3b', padding: '0 4px' }}>
          <AeButton onClick={() => setTab('feed')} variant="tab" active={tab === 'feed'}>Feed</AeButton>
          {/* Comments tab removed in unified posts model */}
        </div>

        {tab === 'feed' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {list.length === 0 && (
              <div style={{ background: '#242430', borderRadius: 8, padding: 12 }}>No items found.</div>
            )}
            {list.map((item: any) => {
              const postId = item.id || item._id;
              const commentCount = getCommentCount(postId);
              const itemChainName = chainNames?.[item.address];
              
              return (
                <div className="feed-item" key={postId}>
                  <div className="avatar-container">
                    {item.address && (
                      <div className="avatar-stack">
                        {/* Chain avatar (bigger) if available */}
                        {itemChainName && itemChainName !== 'Legend' && (
                          <div className="chain-avatar">
                            <Identicon address={item.address} size={48} name={itemChainName} />
                          </div>
                        )}
                        {/* Address avatar (smaller) if no chain name, or as overlay */}
                        {(!itemChainName || itemChainName === 'Legend') && (
                          <div className="address-avatar">
                            <Identicon address={item.address} size={48} />
                          </div>
                        )}
                        {/* Overlay avatar for chain names */}
                        {itemChainName && itemChainName !== 'Legend' && (
                          <div className="address-avatar-overlay">
                            <Identicon address={item.address} size={24} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="content" onClick={() => navigate(`/post/${postId}`)} style={{ cursor: 'pointer' }}>
                    <div className="header">
                      <div className="author-section">
                        {item.address && (
                          <UserBadge 
                            address={item.address} 
                            showAvatar={false}
                            chainName={itemChainName}
                          />
                        )}
                      </div>
                      {item.timestamp && (
                        <span className="timestamp">
                          {relativeTime(new Date(item.timestamp))}
                        </span>
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
                        <span>
                          <AeAmountFiat amount={item.amount || 0} />
                        </span>
                      </div>
                      <div className="footer-right">
                        <span className="comment-count">
                          <IconComment /> {commentCountsLoading[postId] ? '...' : commentCount}
                        </span>
                        <AeButton 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            openModal({ 
                              name: 'feed-item-menu', 
                              props: { postId: postId, url: item.url, author: item.address } 
                            }); 
                          }}
                        >
                          •••
                        </AeButton>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!endReached && (
              <div className="load-more" style={{ textAlign: 'center', padding: 12 }}>
                <AeButton
                  loading={loadingNext}
                  onClick={() => { /* Load more posts - simplified */ }}
                >Load more</AeButton>
              </div>
            )}
          </div>
        )}

        {/* User comments list removed in unified posts model */}
      </div>
      
      <style>{`
        .profile-avatar-container {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }
        
        .avatar-stack {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .chain-avatar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .address-avatar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .address-avatar-overlay {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          overflow: hidden;
          border: 2px solid #1c1c24;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </Shell>
  );
}


