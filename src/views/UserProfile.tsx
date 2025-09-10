import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AeButton from '../components/AeButton';
import Identicon from '../components/Identicon';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import Shell from '../components/layout/Shell';
import UserBadge from '../components/UserBadge';

import { useQuery } from '@tanstack/react-query';
import { PostsService } from '../api/generated';
import FeedItem from '../features/social/components/FeedItem';
import { PostApiResponse } from '../features/social/types';
import '../features/social/views/FeedList.scss';
import { useAccountBalances } from '../hooks/useAccountBalances';
import { useChainName } from '../hooks/useChainName';

import AddressAvatar from '../components/AddressAvatar';

export default function UserProfile() {
  const navigate = useNavigate();
  const { address } = useParams();
  const { decimalBalance, loadAccountData } = useAccountBalances(address);
  const { chainName } = useChainName(address);

  const { data } = useQuery({
    queryKey: ['PostsService.listAll', address],
    queryFn: () => PostsService.listAll({
      limit: 100,
      page: 1,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      search: '',
      accountAddress: address,
    }) as unknown as Promise<PostApiResponse>,
    enabled: !!address,
  })

  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<'feed'>('feed');

  // Get posts from the query data
  const posts = data?.items || [];

  useEffect(() => {
    if (!address) return;
    loadAccountData()
    // Load profile
  }, [address]);

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.5rem 1rem' }}>
        {/* Compact Profile header */}
        <div className="profile-header">
          <div className="profile-content">
            <div className="profile-avatar-container">
              <div className="avatar-stack">
                {/* Chain avatar (bigger) if available */}
                {chainName && (
                  <div className="chain-avatar">
                    <Identicon address={address} size={50} name={chainName} />
                  </div>
                )}
                {/* Address avatar (smaller) if no chain name, or as overlay */}
                {(!chainName) && (
                  <div className="address-avatar">
                    <AddressAvatar address={address} size={56} />
                  </div>
                )}
                {/* Overlay avatar for chain names */}
                {chainName && (
                  <div className="address-avatar-overlay">
                    <AddressAvatar address={address} size={24} />
                  </div>
                )}
              </div>
            </div>
            <div className="profile-info">
              {address && (
                <div className="profile-name">
                  <UserBadge
                    address={address}
                    showAvatar={false}
                    chainName={chainName}
                  />
                </div>
              )}
              <div className="profile-balance">
                <div className="balance-label">Balance</div>
                <div className="balance-amount">{decimalBalance.prettify()} AE</div>
              </div>
              {profile?.createdAt && (
                <div className="profile-joined">
                  <span className="joined-label">Joined </span>
                  <span className="joined-date">
                    {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Tabs */}
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #2f2f3b', padding: '0 4px' }}>
          <AeButton onClick={() => setTab('feed')} variant="tab" active={tab === 'feed'}>Feed</AeButton>
          {/* Comments tab removed in unified posts model */}
        </div>

        {tab === 'feed' && (
          <div className="feed">
            {posts.length === 0 && (
              <div className="feed-item empty-state">
                <div>No posts found.</div>
                <div className="subtitle">This user hasn't posted anything yet.</div>
              </div>
            )}
            {posts.map((item: any) => {
              const postId = item.id;
              const commentCount = item.total_comments ?? 0;

              return (
                <FeedItem
                  key={postId}
                  item={item}
                  commentCount={commentCount}
                  onItemClick={(id: string) => navigate(`/post/${id}`)}
                />
              );
            })}
          </div>
        )}

        {/* User comments list removed in unified posts model */}
      </div>

      <style>{`
        .profile-header {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.1) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .profile-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .profile-header:hover {
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3);
          transform: translateY(-2px);
        }
        
        .profile-content {
          display: flex;
          gap: 16px;
          position: relative;
          z-index: 1;
        }
        
        .profile-avatar-container {
          position: relative;
          width: 56px;
          height: 56px;
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
          border-radius: 16px;
          overflow: hidden;
          border: 3px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          transition: all 0.3s ease;
        }
        
        .chain-avatar:hover {
          border-color: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }
        
        .address-avatar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          border: 3px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          transition: all 0.3s ease;
        }
        
        .address-avatar:hover {
          border-color: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }
        
        .address-avatar-overlay {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          overflow: hidden;
          border: 2px solid #1c1c24;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .profile-info {
          flex: 1;
          min-width: 0;
        }
        
        .profile-name {
          margin-bottom: 8px;
        }
        
        .profile-balance {
          margin-bottom: 6px;
        }
        
        .balance-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .balance-amount {
          color: #fff;
          font-size: 1.375rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          line-height: 1.2;
        }
        
        .profile-joined {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .joined-label {
          opacity: 0.8;
        }
        
        .joined-date {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .profile-header {
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 14px;
          }
          
          .profile-content {
            gap: 12px;
          }
          
          .profile-avatar-container {
            width: 48px;
            height: 48px;
          }
          
          .chain-avatar,
          .address-avatar {
            border-radius: 10px;
            border-width: 2px;
          }
          
          .address-avatar-overlay {
            width: 20px;
            height: 20px;
            border-radius: 5px;
            bottom: -3px;
            right: -3px;
          }
          
          .balance-amount {
            font-size: 1.25rem;
          }
          
          .balance-label {
            font-size: 0.7rem;
          }
          
          .profile-joined {
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 768px) {
          .profile-info {
            width: 100%;
          }
          
          .profile-name {
            margin-bottom: 6px;
          }
          
          .profile-balance {
            margin-bottom: 4px;
          }
        }
      `}</style>
    </Shell>
  );
}


