import React, { useState } from 'react';
import { DexTokenDto, PairDto } from '../../../api/generated';
import SwapForm from '../../../components/dex/core/SwapForm';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import NewAccountEducation from '../../../components/dex/widgets/NewAccountEducation';
import PoolCandlestickChart from '../components/charts/PoolCandlestickChart';

export default function DexSwap() {
  const [selectedPair, setSelectedPair] = useState<PairDto | null>(null);
  const [fromToken, setFromToken] = useState<DexTokenDto | null>(null); 
  // todo get selected pool address
  return (
    <div>
      {/* Main Content */}
      <div className="flex gap-6 items-start w-full mobile:flex-col mobile:gap-5">
        <div className="min-w-0 max-w-[480px] flex-shrink-0 mobile:max-w-none">
          <SwapForm onPairSelected={setSelectedPair} onFromTokenSelected={setFromToken} />
        </div>

        {!!selectedPair?.address && (
          <div className="flex-1 min-w-0 mobile:w-full">
            <PoolCandlestickChart 
              pairAddress={selectedPair?.address} 
              fromTokenAddress={fromToken?.address}
              height={460}
            />
          </div>
        )}
      </div>
      <RecentActivity />
      {/* New Account Education */}
      <NewAccountEducation />

    </div>
  );
}
