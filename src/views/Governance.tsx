import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AeButton from '../components/AeButton';
import Shell from '../components/layout/Shell';

import GovernanceAccount from '@/components/governance/GovernanceAccount';
import GovernancePolls from '@/components/governance/GovernancePolls';
import GovernanceVote from '@/components/governance/GovernanceVote';
import GovernanceCreate from '@/components/governance/GovernanceCreate';
type TabType = 'polls' | 'vote' | 'account' | 'create';

export default function Governance() {
  const { id: pollId } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('polls');

  // Determine active tab based on URL
  useEffect(() => {
    if (pollId) {
      setActiveTab('vote');
    } else if (location.pathname.includes('/account')) {
      setActiveTab('account');
    } else if (location.pathname.includes('/create')) {
      setActiveTab('create');
    } else {
      setActiveTab('polls');
    }
  }, [pollId, location.pathname]);

  return (
    <Shell> 
      {/* Enhanced Tab Navigation */}
      <div className="flex gap-2 mb-5 p-2 overflow-x-auto scrollbar-none -ms-overflow-style-none webkit-scrollbar-none scroll-smooth webkit-overflow-scrolling-touch">
        <AeButton 
          onClick={() => setActiveTab('polls')}
          className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'polls'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
          }`}
        >
          📊 Polls
        </AeButton>
        {pollId && (
          <AeButton 
            onClick={() => setActiveTab('vote')}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
              activeTab === 'vote'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
                : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
            }`}
          >
            🗳️ Vote
          </AeButton>
        )}
        <AeButton 
          onClick={() => setActiveTab('account')}
          className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'account'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
          }`}
        >
          👤 My Account
        </AeButton>
        <AeButton 
          onClick={() => setActiveTab('create')}
          className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'create'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
          }`}
        >
          🆕 Create Poll
        </AeButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'polls' && <GovernancePolls />}
      {activeTab === 'vote' && <GovernanceVote pollId={pollId} setActiveTab={(tab: string) => setActiveTab(tab as TabType)} />}
      {activeTab === 'account' && <GovernanceAccount />}
      {activeTab === 'create' && <GovernanceCreate />}
    </Shell>
  );
}


