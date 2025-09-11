import React from 'react';
import { WrapUnwrapWidget } from '../WrapUnwrapWidget';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

export default function DexWrap() {
  return (
    <div>
      {/* Main Content */}
      <div className="flex flex-col gap-5 items-start w-full md:flex-row md:gap-6">
        <div className="min-w-0 max-w-none w-full md:max-w-[min(480px,100%)] md:flex-shrink-0">
          <WrapUnwrapWidget />
        </div>
        
        <div className="flex-1 min-w-0 w-full">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
