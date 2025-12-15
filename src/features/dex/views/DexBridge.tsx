import React from "react";
import { BuyAeWidget } from "../../ae-eth-buy";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";

//
export default function DexBridge() {
  return (
    <div className="w-full py-4 md:py-6">
      {/* Main Content - wrapped in card */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 md:p-8" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 md:gap-8 items-start w-full">
          {/* Buy AE Widget */}
          <div className="min-w-0">
            <BuyAeWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
