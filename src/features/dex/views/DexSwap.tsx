import React from 'react';
import SwapForm from '../../../components/dex/core/SwapForm';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import NewAccountEducation from '../../../components/dex/widgets/NewAccountEducation';
import './DexViews.scss';

export default function DexSwap() {
  // todo get selected pool address
  return (
    <div>
      {/* Main Content */}
      <div className="dex-swap-content">
        <div className="dex-swap-main">
          <SwapForm />
        </div>

        <div className="dex-swap-sidebar">
          <RecentActivity />
        </div>
      </div>
      {/* New Account Education */}
      <NewAccountEducation />

    </div>
  );
}
