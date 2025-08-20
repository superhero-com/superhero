import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DexTabs from '../components/dex/DexTabs';
import SwapForm from '../components/dex/core/SwapForm';
import WrapUnwrapWidget from '../components/dex/widgets/WrapUnwrapWidget';
import EthxitWidget from '../components/dex/widgets/EthxitWidget';
import EthBridgeWidget from '../components/dex/widgets/EthBridgeWidget';
import NewAccountEducation from '../components/dex/widgets/NewAccountEducation';
import RecentActivity from '../components/dex/supporting/RecentActivity';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { useTokenList } from '../components/dex/hooks/useTokenList';
import { RecentActivity as RecentActivityType } from '../components/dex/types/dex';
import './Dex.scss';

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
    <div className="dex-container">
      {/* Sexy Theme Switcher */}
      <div className="dex-theme-switcher">
        <ThemeSwitcher />
      </div>
      
      <DexTabs />
      
      <div className="dex-header">
        <h2 className="dex-title">Superhero DEX</h2>
        <p className="dex-description">
          Trade any supported AEX-9 tokens on æternity via the AMM. Routes may hop through WAE. Tokens (non-AE) require a one-time allowance. Swaps are non-custodial and executed on-chain.{' '}
          <a href="https://aepp.dex.superhero.com" target="_blank" rel="noreferrer" className="dex-link">Learn more</a>
        </p>
      </div>

      {/* New Account Education */}
      <NewAccountEducation />

      {/* Main Swap Form */}
      <SwapForm />

      {/* Specialized Widgets */}
      <EthxitWidget />
      <WrapUnwrapWidget />
      <EthBridgeWidget />

      {/* Recent Activity */}
      <RecentActivity recent={recent} />
    </div>
  );
}
