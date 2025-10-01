import React, { useState } from "react";
import { DexTokenDto, PairDto } from "../../../api/generated";
import SwapForm from "../../../components/dex/core/SwapForm";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import NewAccountEducation from "../../../components/dex/widgets/NewAccountEducation";
import PoolCandlestickChart from "../components/charts/PoolCandlestickChart";

export default function DexSwap() {
  const [selectedPair, setSelectedPair] = useState<PairDto | null>(null);
  const [fromToken, setFromToken] = useState<DexTokenDto | null>(null);
  // todo get selected pool address3
  return (
    <div className="mx-auto md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      {/* Main Content */}
      <div className="flex gap-5 items-start w-full flex-col md:flex-row md:gap-6">
        <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
          <SwapForm
            onPairSelected={setSelectedPair}
            onFromTokenSelected={setFromToken}
          />
        </div>

        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
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
      {/* New Account Education */}
      <NewAccountEducation />
    </div>
  );
}
