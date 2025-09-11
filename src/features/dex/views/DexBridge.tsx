import React from 'react';
import { EthBridgeWidget } from '../../bridge';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

//
export default function DexBridge() {
  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex gap-4 sm:gap-5 items-start w-full flex-col md:flex-row md:gap-6">
        <div className="w-full max-w-full min-w-0 flex-shrink-0 md:max-w-[min(480px,100%)]">
          <EthBridgeWidget />
        </div>
        
        <div className="flex-1 min-w-0 w-full">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
