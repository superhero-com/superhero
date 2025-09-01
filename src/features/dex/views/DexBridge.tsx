import React from 'react';
import './DexViews.scss';
import { EthBridgeWidget } from '../../bridge';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

export default function DexBridge() {
  return (
    <div className="dex-bridge-container">
      {/* Main Content */}
      <div className="dex-swap-content">
        <div className="dex-swap-main">
          <EthBridgeWidget />
        </div>
        
        <div className="dex-swap-sidebar">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
