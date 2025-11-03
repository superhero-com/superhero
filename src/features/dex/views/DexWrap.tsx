import React from "react";
import { WrapUnwrapWidget } from "../WrapUnwrapWidget";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import Shell from "@/components/layout/Shell";

export default function DexWrap() {
  const rightRail = (
    <div className="hidden lg:block">
      <WrapUnwrapWidget />
    </div>
  );

  return (
    <Shell right={rightRail} containerClassName="max-w-[min(1200px,100%)] mx-auto">
      <div className="md:pt-0 md:pb-5 flex flex-col gap-6 md:gap-8 min-h-screen px-2 md:px-4">
        {/* Mobile: action card before content */}
        <div className="lg:hidden">
          <WrapUnwrapWidget />
        </div>
        {/* Center: Recent activity */}
        <div className="w-full min-w-0">
          <RecentActivity />
        </div>
      </div>
    </Shell>
  );
}
