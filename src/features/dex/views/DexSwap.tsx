import React, { useState } from 'react';
import { DexTokenDto, PairDto } from '../../../api/generated';
import SwapForm from '../../../components/dex/core/SwapForm';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import NewAccountEducation from '../../../components/dex/widgets/NewAccountEducation';
import './DexViews.scss';
import PoolCandlestickChart from '../components/charts/PoolCandlestickChart';

export default function DexSwap() {
  const [selectedPair, setSelectedPair] = useState<PairDto | null>(null);
  const [fromToken, setFromToken] = useState<DexTokenDto | null>(null); 
  // todo get selected pool address
  return (
    <div>
      {/* Main Content */}
      <div className="dex-swap-content">
        <div className="dex-swap-main">
          <SwapForm onPairSelected={setSelectedPair} onFromTokenSelected={setFromToken} />
        </div>

        {!!selectedPair?.address && (
          <div className="dex-swap-chart">
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
