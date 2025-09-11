import React from 'react';
import { WrapUnwrapWidget } from '../WrapUnwrapWidget';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

export default function DexWrap() {
  return (
    <div>
      {/* Main Content */}
      <div className="flex gap-6 items-start w-full mobile:flex-col mobile:gap-5">
        <div className="min-w-0 max-w-[min(480px,100%)] flex-shrink-0 mobile:max-w-none">
          <WrapUnwrapWidget />
        </div>
        
        <div className="flex-1 min-w-0">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
