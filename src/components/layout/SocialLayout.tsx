import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Shell from './Shell';
import RightRail from './RightRail';

const SocialLayout = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const containerClassName = 'max-w-[min(1200px,100%)]';
  return (
    <Shell right={<RightRail />} containerClassName={containerClassName}>
      <Suspense fallback={<div className="loading-fallback" />}>
        {children ?? <Outlet />}
      </Suspense>
    </Shell>
  );
};

export default SocialLayout;
