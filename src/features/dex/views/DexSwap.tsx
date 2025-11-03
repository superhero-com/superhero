import React, { useState } from "react";
import Shell from "@/components/layout/Shell";
import { DexTokenDto, PairDto } from "../../../api/generated";
import SwapForm from "../../../components/dex/core/SwapForm";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import PoolCandlestickChart from "../components/charts/PoolCandlestickChart";

export default function DexSwap() {
  const [selectedPair, setSelectedPair] = useState<PairDto | null>(null);
  const [fromToken, setFromToken] = useState<DexTokenDto | null>(null);
  // todo get selected pool address3
  const rightRail = (
    <div className="hidden lg:block">
      <SwapForm onPairSelected={setSelectedPair} onFromTokenSelected={setFromToken} />
    </div>
  );

  return (
    <Shell right={rightRail} containerClassName="max-w-[min(1200px,100%)] mx-auto">
      <div className="md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen px-2 md:px-4">
        {/* Mobile: action card before content */}
        <div className="lg:hidden">
          <SwapForm onPairSelected={setSelectedPair} onFromTokenSelected={setFromToken} />
        </div>

        {/* Center content: Chart + Recent Activity */}
        <div className="w-full min-w-0 flex flex-col gap-6">
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
    </Shell>
  );
}
