import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Shell from "./Shell";
import RightRail from "./RightRail";
import LeftRail from "./LeftRail";

/**
 * DashboardContentContainer
 * 
 * Combines left rail and middle content as one container.
 * This container gets replaced entirely by mini-apps when navigating to /apps/*
 */
function DashboardContentContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)] gap-0 w-full">
      {/* Left Rail */}
      <aside className="hidden lg:block sticky top-0 self-start min-w-0 h-screen overflow-y-auto no-scrollbar">
        <div className="pt-4 pb-6">
          <LeftRail />
        </div>
      </aside>
      
      {/* Middle Content */}
      <main className="min-w-0 overflow-visible transition-all duration-300 pt-4 pb-20 md:pt-4 md:pb-0">
        {children}
      </main>
    </div>
  );
}

export default function SocialLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const location = useLocation();
  
  // Check if we're on a mini-app route (including overview page)
  // Mini apps replace the entire left+middle container (left rail + middle content)
  const isMiniAppRoute = location.pathname.startsWith('/apps');
  
  // On mini-app routes: replace left+middle container with mini-app content
  // On dashboard routes: show left rail + middle content as one combined container
  // On wide screens (xl+), show left rail alongside mini-apps
  return (
    <Shell 
      left={<LeftRail />}
      right={<RightRail />} 
      spanLeftAndMiddle={isMiniAppRoute}
      showLeftOnWideForMiniApps={isMiniAppRoute}
    >
      <Suspense fallback={<div className="loading-fallback" />}>
        {isMiniAppRoute ? (
          // Mini-app replaces the entire left+middle container (but left rail shows on xl+ screens)
          (children ?? <Outlet />)
        ) : (
          // Dashboard: left rail + middle content as one container
          <DashboardContentContainer>
            {children ?? <Outlet />}
          </DashboardContentContainer>
        )}
      </Suspense>
    </Shell>
  );
}
