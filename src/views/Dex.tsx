import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';
import DexTabs from '../components/dex/DexTabs';
import SwapTabSwitcher from '../components/dex/core/SwapTabSwitcher';
import { useTokenList } from '../components/dex/hooks/useTokenList';
import RecentActivity from '../components/dex/supporting/RecentActivity';
import { RecentActivity as RecentActivityType } from '../components/dex/types/dex';
import NewAccountEducation from '../components/dex/widgets/NewAccountEducation';

export default function DexRefactored() {
  const location = useLocation();
  const { tokens } = useTokenList();
  const [recent, setRecent] = useState<RecentActivityType[]>([]);

  // Prefill from query params (?from=ct_...|AE&to=ct_...|AE)
  useEffect(() => {
    try {
      if (!tokens.length) return;
      const qs = new URLSearchParams(location.search);
      const from = qs.get('from');
      const to = qs.get('to');
      // This would be handled by the SwapForm component
      // The query params could be passed down to initialize the form
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, location.search]);

  const addRecentActivity = (activity: RecentActivityType) => {
    setRecent((r) => [activity, ...r].slice(0, 5));
  };

  return (
    <div className="max-w-[1400px] mx-auto p-5 space-y-6">
      {/* Theme Switcher */}
      <div className="flex justify-end">
        <ThemeSwitcher />
      </div>
      
      <DexTabs />
      
      <div className="text-center space-y-4 mb-8">
        <h2 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
          Superhero DEX
        </h2>
        <p className="text-white/80 max-w-3xl mx-auto leading-relaxed">
          Trade any supported AEX-9 tokens on æternity via the AMM. Routes may hop through WAE. Tokens (non-AE) require a one-time allowance. Swaps are non-custodial and executed on-chain.{' '}
          <a href="https://aepp.dex.superhero.com" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline">Learn more</a>
        </p>
      </div>

      {/* New Account Education */}
      <NewAccountEducation />

      {/* Swap Tab Switcher - Contains all swap widgets */}
      <SwapTabSwitcher />

      {/* Recent Activity */}
      <RecentActivity recent={recent} />
    </div>
  );
}
