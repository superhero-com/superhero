import React from 'react';
import { EthBridgeWidget } from '../../bridge';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

export default function DexBridge() {
  return (
    <div>
      {/* Main Content */}
      <div className="flex flex-col gap-5 items-start w-full md:flex-row md:gap-6">
        <div className="min-w-0 max-w-none w-full md:max-w-[600px] md:flex-shrink-0">
          <EthBridgeWidget />
        </div>
        
        <div className="flex-1 min-w-0 w-full">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
