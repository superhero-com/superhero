import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Shell from "./Shell";
import LeftNav from "./LeftNav";
import RightRail from "./RightRail";

export default function SocialLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <Shell left={<LeftNav />} right={<RightRail />}>
      <Suspense fallback={<div className="loading-fallback" />}>
        {children ?? <Outlet />}
      </Suspense>
    </Shell>
  );
}
