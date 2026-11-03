import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import GovernanceAccount from '@/components/governance/GovernanceAccount';
import GovernancePolls from '@/components/governance/GovernancePolls';
import GovernanceVote from '@/components/governance/GovernanceVote';
import GovernanceCreate from '@/components/governance/GovernanceCreate';
import DaoSectionTabs from '@/features/dao/components/DaoSectionTabs';
import AeButton from '../components/AeButton';

type TabType = 'polls' | 'vote' | 'account' | 'create';

const Governance = () => {
  const { t } = useTranslation('governance');
  const { id: pollId } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('polls');

  // Determine active tab based on URL. A click on a link to the current path
  // (the section tab while another tab is open) changes only location.key.
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
  }, [pollId, location.pathname, location.key]);

  return (
    // Same container as the DAO list, so the shared section tabs stay put when switching.
    <main className="ui-page governance-page max-w-6xl mx-auto p-4">
      <div className="mb-2">
        <DaoSectionTabs />
      </div>
      {/* Enhanced Tab Navigation */}
      <div className="governance-tabs flex flex-wrap gap-2 mb-5 py-2">
        <AeButton
          onClick={() => setActiveTab('polls')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'polls'
              ? 'bg-[#1c304f] text-[#b6d0ff] border-[#3e5f8e]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:shadow-none'
          }`}
        >
          {t('tabs.polls')}
        </AeButton>
        {pollId && (
          <AeButton
            onClick={() => setActiveTab('vote')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
              activeTab === 'vote'
                ? 'bg-[#1c304f] text-[#b6d0ff] border-[#3e5f8e]'
                : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:shadow-none'
            }`}
          >
            {t('tabs.vote')}
          </AeButton>
        )}
        <AeButton
          onClick={() => setActiveTab('account')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'account'
              ? 'bg-[#1c304f] text-[#b6d0ff] border-[#3e5f8e]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:shadow-none'
          }`}
        >
          {t('tabs.myAccount')}
        </AeButton>
        <AeButton
          onClick={() => setActiveTab('create')}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'create'
              ? 'bg-[#1c304f] text-[#b6d0ff] border-[#3e5f8e]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:shadow-none'
          }`}
        >
          {t('tabs.createPoll')}
        </AeButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'polls' && <GovernancePolls />}
      {activeTab === 'vote' && <GovernanceVote pollId={pollId} setActiveTab={(tab: string) => setActiveTab(tab as TabType)} />}
      {activeTab === 'account' && <GovernanceAccount />}
      {activeTab === 'create' && <GovernanceCreate />}
    </main>
  );
};

export default Governance;
