import React from "react";
import { EthBridgeWidget } from "../../bridge";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";

//
export default function DexBridge() {
  return (
    <div className="mx-auto md:pt-0 md:pb-5 flex flex-row flex-wrap gap-6 md:gap-8">
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        <EthBridgeWidget />
      </div>

      <div className="flex-1 min-w-0 w-full">
        <RecentActivity />
      </div>
    </div>
  );
}
