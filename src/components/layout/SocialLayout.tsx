import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Shell from "./Shell";
import RightRail from "./RightRail";
import LeftRail from "./LeftRail";

export default function SocialLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <Suspense fallback={<div className="loading-fallback" />}>
        {children ?? <Outlet />}
      </Suspense>
    </Shell>
  );
}
