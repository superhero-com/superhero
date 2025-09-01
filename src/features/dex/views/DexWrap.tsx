import React from 'react';
import { WrapUnwrapWidget } from '../WrapUnwrapWidget';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import './DexViews.scss';

export default function DexWrap() {
  return (
    <div className="dex-wrap-container">
      {/* Main Content */}
      <div className="dex-swap-content">
        <div className="dex-swap-main">
          <WrapUnwrapWidget />
        </div>
        
        <div className="dex-swap-sidebar">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
