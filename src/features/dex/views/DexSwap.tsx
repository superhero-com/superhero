import React, { useState } from "react";
import { DexTokenDto, PairDto } from "../../../api/generated";
import SwapForm from "../../../components/dex/core/SwapForm";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import PoolCandlestickChart from "../components/charts/PoolCandlestickChart";

export default function DexSwap() {
  const [selectedPair, setSelectedPair] = useState<PairDto | null>(null);
  const [fromToken, setFromToken] = useState<DexTokenDto | null>(null);
  // todo get selected pool address3
  return (
    <div className="mx-auto md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      {/* Main Content - unified layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[480px_minmax(560px,1fr)] gap-6 md:gap-8 items-start w-full">
        {/* Left card (Swap) */}
        <div className="order-1 lg:order-1">
          <SwapForm
            onPairSelected={setSelectedPair}
            onFromTokenSelected={setFromToken}
          />
        </div>

        {/* Right column (Chart + Recent Activity) */}
        <div className="order-2 lg:order-2 w-full min-w-0 flex flex-col gap-6">
          {!!selectedPair?.address && (
            <PoolCandlestickChart
              pairAddress={selectedPair?.address}
              fromTokenAddress={fromToken?.address}
              height={460}
            />
          )}
          <RecentActivity />
        </div>
      </div>
      {/* New Account Education hidden on DEX */}
    </div>
  );
}
