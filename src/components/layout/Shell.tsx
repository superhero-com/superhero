import React from "react";
import BackToTop from "./BackToTop";
import { useLayoutVariant } from "../../contexts/LayoutVariantContext";

type ShellProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
};

export default function Shell({ left, right, children, containerClassName }: ShellProps) {
  const { variant } = useLayoutVariant();
  
  // 3-column grid on large screens: left | center | right
  // On smaller screens show only center; right rail stays hidden; left can be rendered separately if desired
  const hasRight = Boolean(right);
  const hasLeft = Boolean(left);

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
    if (showVisualLeft && showVisualRight) {
       gridClass = "lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)_minmax(300px,360px)]";
    } else if (showVisualLeft) {
       gridClass = "lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)]";
    } else if (showVisualRight) {
       gridClass = "lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]";
    }
  }

  return (
    <>
      <div className={[
        "shell-container min-h-screen w-full mx-auto flex flex-col transition-all duration-300",
        // Respect caller-provided max-w classes; otherwise use default
        containerClassName && /(^|\s)max-w-/.test(containerClassName) ? "" : "max-w-[min(1400px,100%)]",
        containerClassName || ""
      ].filter(Boolean).join(" ")}
      >
        <div
          className={[
            "flex-grow grid grid-cols-1 gap-0 p-1 px-2 md:p-3 md:px-4 lg:p-4 lg:pb-0 sm:p-2 sm:px-3 transition-all duration-300",
            gridClass
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {showVisualLeft && (
            <aside className="hidden lg:block sticky top-0 self-start min-w-0 h-screen overflow-y-auto no-scrollbar">
              <div className="pt-2 pb-6">
                {left}
              </div>
            </aside>
          )}

          <main className="min-w-0 overflow-visible transition-all duration-300 py-1 md:py-0">{children}</main>

          {showVisualRight && (
            <aside className="hidden lg:block sticky top-0 self-start min-w-0 h-screen overflow-y-auto no-scrollbar">
              <div className="min-w-0 h-full pb-6 pt-0">
                {right}
                <div className="mt-6">
                  <BackToTop />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
