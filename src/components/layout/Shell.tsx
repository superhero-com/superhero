import React from "react";
import FooterSection from "./FooterSection";

type ShellProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
};

export default function Shell({ left, right, children, containerClassName }: ShellProps) {
  // 3-column grid on large screens: left | center | right
  // On smaller screens show only center; right rail stays hidden; left can be rendered separately if desired
  const hasRight = Boolean(right);
  const hasLeft = Boolean(left);

  return (
    <>
      <div className={[
        "min-h-screen w-full mx-auto flex flex-col",
        // Respect caller-provided max-w classes; otherwise use default
        containerClassName && /(^|\s)max-w-/.test(containerClassName) ? "" : "max-w-[min(1400px,100%)]",
        containerClassName || ""
      ].filter(Boolean).join(" ")}
      >
        <div
          className={[
            "flex-grow grid grid-cols-1 gap-4 p-1 px-2 md:gap-3 md:p-2 md:px-3 lg:gap-4 lg:gap-x-8 lg:p-2 lg:pb-0 lg:px-4 sm:gap-2 sm:p-1 sm:px-2",
            // lg layout widths similar to X: ~280 | 600-720 | 320
            hasLeft && hasRight
              ? "lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)_minmax(300px,360px)]"
              : hasLeft && !hasRight
              ? "lg:grid-cols-[minmax(240px,300px)_minmax(560px,1fr)]"
              : !hasLeft && hasRight
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {hasLeft && (
            <aside className="hidden lg:block sticky top-0 self-start min-w-0">
              {left}
            </aside>
          )}

          <main className="min-w-0 overflow-visible">{children}</main>

          {hasRight && (
            <aside className="hidden lg:block min-w-0 overflow-visible">
              <div className="sticky top-0 z-0 overflow-visible">
                <div className="right-rail-bleed -mx-2 lg:-mx-4 px-2 lg:px-4 pt-[80px] overflow-visible">
                  <div className="right-rail-scroll max-h-screen overflow-y-auto overflow-x-visible overscroll-contain">
                    <div className="min-w-0">{right}</div>
                    <FooterSection />
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
