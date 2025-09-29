import React from "react";
import { WrapUnwrapWidget } from "../WrapUnwrapWidget";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";

export default function DexWrap() {
  return (
    <div className="mx-auto md:px-5 md:pt-0 md:pb-5 flex flex-row flex-wrap gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        <WrapUnwrapWidget />
      </div>

      <div className="flex-1 min-w-0 w-full">
        <RecentActivity />
      </div>
    </div>
  );
}
