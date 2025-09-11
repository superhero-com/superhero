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
      <div className="max-w-[680px] mx-auto px-4 py-2">
        {/* Compact Profile header */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-4 relative overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 md:p-4 md:mb-3 md:rounded-xl">
          <div className="flex gap-4 relative z-10 md:gap-3">
            <div className="relative w-14 h-14 flex-shrink-0 md:w-12 md:h-12">
              <div className="relative w-full h-full">
                {/* Chain avatar (bigger) if available */}
                {chainName && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/30 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] md:rounded-xl md:border-2">
                    <Identicon address={address} size={50} name={chainName} />
                  </div>
                )}
                {/* Address avatar (smaller) if no chain name, or as overlay */}
                {(!chainName) && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/30 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] md:rounded-xl md:border-2">
                    <AddressAvatar address={address} size={56} />
                  </div>
                )}
                {/* Overlay avatar for chain names */}
                {chainName && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md overflow-hidden border-2 border-[#1c1c24] shadow-[0_4px_12px_rgba(0,0,0,0.5)] md:w-5 md:h-5 md:rounded-sm md:-bottom-0.5 md:-right-0.5">
                    <AddressAvatar address={address} size={24} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {address && (
                <div className="mb-2 md:mb-1.5">
                  <UserBadge
                    address={address}
                    showAvatar={false}
                    chainName={chainName}
                  />
                </div>
              )}
              <div className="mb-1.5 md:mb-1">
                <div className="text-white/60 text-xs font-medium mb-0.5 uppercase tracking-wider md:text-[0.7rem]">Balance</div>
                <div className="text-white text-[1.375rem] font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent leading-tight md:text-xl">
                  {decimalBalance.prettify()} AE
                </div>
              </div>
              {profile?.createdAt && (
                <div className="text-white/70 text-sm font-medium md:text-xs">
                  <span className="opacity-80">Joined </span>
                  <span className="text-white/90 font-semibold">
                    {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[#2f2f3b] px-1">
          <AeButton onClick={() => setTab('feed')} variant="tab" active={tab === 'feed'}>Feed</AeButton>
          {/* Comments tab removed in unified posts model */}
        </div>

        {tab === 'feed' && (
          <div className="feed">
            {posts.length === 0 && (
              <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl mt-6">
                <div className="text-4xl mb-4 opacity-30">📝</div>
                <div className="text-white font-semibold mb-2">No posts found.</div>
                <div className="text-white/60 text-sm">This user hasn't posted anything yet.</div>
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
    </Shell>
  );
}


