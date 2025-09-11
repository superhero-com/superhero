import React from 'react';
import { EthBridgeWidget } from '../../bridge';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

export default function DexBridge() {
  return (
    <div>
      {/* Main Content */}
      <div className="flex gap-6 items-start w-full mobile:flex-col mobile:gap-5">
        <div className="min-w-0 max-w-[600px] flex-shrink-0 mobile:max-w-none">
          <EthBridgeWidget />
        </div>
        
        <div className="flex-1 min-w-0">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
