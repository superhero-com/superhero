import React from "react";
import Shell from "@/components/layout/Shell";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import { AeEthBridge } from "../components/AeEthBridge";

export default function Bridge() {
  const rightRail = (
    <div className="hidden lg:block">
      <AeEthBridge />
    </div>
  );

  return (
    <Shell right={rightRail} containerClassName="max-w-[min(1200px,100%)] mx-auto">
      <div className="md:pt-0 md:pb-5 flex flex-col gap-6 md:gap-8 px-2 md:px-4">
        {/* Mobile: action card before content */}
        <div className="lg:hidden">
          <AeEthBridge />
        </div>
        {/* Center: Recent activity */}
        <div className="w-full min-w-0">
          <RecentActivity />
        </div>
      </div>
    </Shell>
  );
}