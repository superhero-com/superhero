import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Backend } from '../api/backend';
import { deeplinkTip } from '../auth/deeplink';
import AeAmountFiat from '../components/AeAmountFiat';
import AeButton from '../components/AeButton';
import Identicon from '../components/Identicon';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import Shell from '../components/layout/Shell';
import UserBadge from '../components/UserBadge';
import CreatePost from '../features/social/components/CreatePost';

import { useWallet, useModal } from '../hooks';
import { useQuery } from '@tanstack/react-query';
import { PostsService } from '../api/generated';
import { PostApiResponse } from '../features/social/types';
import FeedItem from '../features/social/components/FeedItem';
import '../features/social/views/FeedList.scss';
import { useAccountBalances } from '../hooks/useAccountBalances';

export default function UserProfile() {
  const navigate = useNavigate();
  const { address } = useParams();
  const { chainNames, address: myAddress } = useWallet();
  const { decimalBalance, loadAccountData } = useAccountBalances(address);
  const { openModal } = useModal();
  
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
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<'feed'>('feed');
  const [showTipBox, setShowTipBox] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>('0.1');
  const [tipMessage, setTipMessage] = useState<string>('');

  // Get posts from the query data
  const posts = data?.items || [];

  useEffect(() => {
    if (!address) return;
    loadAccountData()
    // Load profile and stats
    Backend.getProfile(address).then(setProfile).catch(() => { });
    Backend.getSenderStats(address).then(setStats).catch(() => { });
  }, [address]);

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
                {decimalBalance.prettify()} AE
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
            <AeButton>Activity</AeButton>
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
                  if (address) {
                    deeplinkTip();
                    console.log('Tip:', { to: address, amount: amt, text });
                  }
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
          <div className="feed">
            {posts.length === 0 && (
              <div className="feed-item empty-state">
                <div>No posts found.</div>
                <div className="subtitle">This user hasn't posted anything yet.</div>
              </div>
            )}
            {posts.map((item: any) => {
              const postId = item.id;
              const authorAddress = item.sender_address;
              const commentCount = item.total_comments ?? 0;
              const itemChainName = chainNames?.[authorAddress];

              return (
                <FeedItem
                  key={postId}
                  item={item}
                  commentCount={commentCount}
                  chainName={itemChainName}
                  onItemClick={(id: string) => navigate(`/post/${id}`)}
                />
              );
            })}
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


