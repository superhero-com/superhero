import React, { useState } from "react";
import Head from "../../../seo/Head";
import { DexTokenDto, PairDto } from "../../../api/generated";
import SwapForm from "../../../components/dex/core/SwapForm";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import PoolCandlestickChart from "../components/charts/PoolCandlestickChart";

export default function DexSwap() {
  const [selectedPair, setSelectedPair] = useState<PairDto | null>(null);
  const [fromToken, setFromToken] = useState<DexTokenDto | null>(null);
  // todo get selected pool address3
  return (
    <div className="w-full py-4 md:py-6">
      <Head
        title="Swap AE and tokens – Superhero DEX"
        description="Trustless swapping on Superhero DEX with live charts and recent activity."
        canonicalPath="/defi/swap"
      />
      {/* Main Content - wrapped in card */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 md:p-8" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 md:gap-8 items-start w-full">
          {/* Swap Form */}
          <div className="min-w-0">
            <SwapForm
              onPairSelected={setSelectedPair}
              onFromTokenSelected={setFromToken}
            />
          </div>

          {/* Chart */}
          {!!selectedPair?.address && (
            <div className="min-w-0 flex flex-col gap-6">
              <PoolCandlestickChart
                pairAddress={selectedPair?.address}
                fromTokenAddress={fromToken?.address}
                height={460}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
