import React from "react";
import BackToTop from "./BackToTop";
import MobileBottomNav from "./MobileBottomNav";
import { useLayoutVariant } from "../../contexts/LayoutVariantContext";

type ShellProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
  /** When true, content spans both left and middle columns (for mini-apps) */
  spanLeftAndMiddle?: boolean;
  /** When true, show left rail on wide screens (xl+) even when spanLeftAndMiddle is true */
  showLeftOnWideForMiniApps?: boolean;
};

export default function Shell({ left, right, children, containerClassName, spanLeftAndMiddle = false, showLeftOnWideForMiniApps = false }: ShellProps) {
  const { variant } = useLayoutVariant();
  
  // 3-column grid on large screens: left | center | right
  // On smaller screens show only center; right rail stays hidden; left can be rendered separately if desired
  const hasRight = Boolean(right);
  // Show left rail if:
  // 1. It exists AND we're not spanning left+middle, OR
  // 2. We're on a mini-app route and showLeftOnWideForMiniApps is true (will be conditionally rendered on xl+)
  const hasLeft = Boolean(left) && (!spanLeftAndMiddle || showLeftOnWideForMiniApps);

  // Determine visibility and grid columns based on variant
  // SocialLayout passes: left={RightRail} (Visual Left), right={LeftRail} (Visual Right)
  // So 'left' prop corresponds to Visual Left Column
  // So 'right' prop corresponds to Visual Right Column

  // Default / Dashboard: All visible (if props exist)
  // Focus: Hide Visual Right (right prop)
  // Minimal: Hide Visual Left (left prop) AND Visual Right (right prop)

  const showVisualLeft = hasLeft && variant !== 'minimal';
  const showVisualRight = hasRight && variant === 'dashboard';

  let gridClass = "";
  
  if (variant === 'minimal') {
    // 1 column centered
    gridClass = "lg:grid-cols-[minmax(600px,800px)] lg:justify-center";
  } else if (variant === 'focus') {
    // 2 columns: Left | Center
    if (showVisualLeft) {
      gridClass = "lg:grid-cols-[minmax(240px,300px)_minmax(600px,1fr)]";
    } else {
       // Fallback if left is missing but we are in focus
       gridClass = "lg:grid-cols-[minmax(600px,1fr)]";
    }
  } else {
    // Dashboard (Default)
    if (spanLeftAndMiddle) {
      // Content spans left+middle, but on wide screens (2xl+, >1500px) show left rail alongside
      if (showLeftOnWideForMiniApps) {
        // Mini-apps with left rail on wide screens
        if (showVisualLeft && showVisualRight) {
          // 2xl+ breakpoint: left | mini-app | right
          gridClass = "lg:grid-cols-[minmax(800px,1fr)_minmax(300px,360px)] xl:grid-cols-[minmax(800px,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)_minmax(420px,480px)]";
        } else if (showVisualLeft) {
          // 2xl+ breakpoint: left | mini-app
          gridClass = "lg:grid-cols-[minmax(800px,1fr)] xl:grid-cols-[minmax(800px,1fr)] 2xl:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)]";
        } else if (showVisualRight) {
          // No left rail, just mini-app | right
          gridClass = "lg:grid-cols-[minmax(800px,1fr)_minmax(300px,360px)] xl:grid-cols-[minmax(800px,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(800px,1fr)_minmax(420px,480px)]";
        } else {
          gridClass = "lg:grid-cols-[minmax(800px,1fr)]";
        }
      } else {
        // Content spans left+middle, only right rail visible (original behavior)
        if (showVisualRight) {
          gridClass = "lg:grid-cols-[minmax(800px,1fr)_minmax(300px,360px)] xl:grid-cols-[minmax(800px,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(800px,1fr)_minmax(420px,480px)]";
        } else {
          gridClass = "lg:grid-cols-[minmax(800px,1fr)]";
        }
      }
    } else if (showVisualLeft && showVisualRight) {
       gridClass = "lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)_minmax(300px,360px)] xl:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)_minmax(420px,480px)]";
    } else if (showVisualLeft) {
       gridClass = "lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)]";
    } else if (showVisualRight) {
       gridClass = "lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,480px)]";
    }
  }

  return (
    <>
      <div className={[
        "shell-container w-full mx-auto flex flex-col transition-all duration-300",
        // Respect caller-provided max-w classes; otherwise allow full width scaling
        containerClassName && /(^|\s)max-w-/.test(containerClassName) ? "" : "",
        containerClassName || ""
      ].filter(Boolean).join(" ")}
      style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}
      >
        <div
          className={[
            "flex-grow grid grid-cols-1 gap-0 px-2 md:px-4 lg:px-4 sm:px-3 transition-all duration-300",
            gridClass
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {showVisualLeft && (
            <aside className={`sticky top-0 self-start min-w-0 h-screen overflow-y-auto no-scrollbar ${
              spanLeftAndMiddle && showLeftOnWideForMiniApps 
                ? 'hidden 2xl:block' // Only show on 2xl+ (>1500px) for mini-apps
                : 'hidden lg:block'  // Show on lg+ for dashboard
            }`}>
              <div className="pt-4 pb-6">
                {left}
              </div>
            </aside>
          )}

          <main className="min-w-0 overflow-hidden transition-all duration-300 flex flex-col" style={{ minHeight: 0 }}>{children}</main>

          {showVisualRight && (
            <aside className="hidden lg:block sticky top-0 self-start min-w-0 h-screen overflow-y-auto no-scrollbar">
              <div className="min-w-0 h-full pb-6">
                {right}
                <div className="mt-6">
                  <BackToTop />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
