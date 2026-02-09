import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Shell from './Shell';
import RightRail from './RightRail';

export default function SocialLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const containerClassName = 'max-w-[min(1200px,100%)]';
  return (
    <Shell right={<RightRail />} containerClassName={containerClassName}>
      <Suspense fallback={<div className="loading-fallback" />}>
        {children ?? <Outlet />}
      </Suspense>
    </Shell>
  );
}
