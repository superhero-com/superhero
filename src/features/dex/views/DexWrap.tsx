import React from "react";
import { WrapUnwrapWidget } from "../WrapUnwrapWidget";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";

export default function DexWrap() {
  return (
    <div className="mx-auto md:pt-0 md:pb-5 flex flex-col gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[480px_minmax(560px,1fr)] gap-6 md:gap-8 items-start w-full">
        {/* Left card (Wrap/Unwrap) */}
        <div className="order-1 lg:order-1">
          <WrapUnwrapWidget />
        </div>

        {/* Right column (Recent Activity) */}
        <div className="order-2 lg:order-2 w-full min-w-0">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
