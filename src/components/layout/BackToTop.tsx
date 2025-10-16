import React, { useEffect, useState } from "react";

export default function BackToTop({ inline = false, withinRightRail = false }: { inline?: boolean; withinRightRail?: boolean }) {
  const [rightOffset, setRightOffset] = useState<number | null>(null);

  // Compute the fixed right offset so the button sits inside the right rail horizontally
  useEffect(() => {
    if (!inline || !withinRightRail) return;

    const computeOffset = () => {
      const rail = document.getElementById('right-rail-root');
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const viewportRight = window.innerWidth;
      const offset = Math.max(8, viewportRight - rect.right + 8); // 8px padding inside rail
      setRightOffset(offset);
    };

    computeOffset();
    window.addEventListener('resize', computeOffset);
    window.addEventListener('scroll', computeOffset, { passive: true });
    return () => {
      window.removeEventListener('resize', computeOffset);
      window.removeEventListener('scroll', computeOffset);
    };
  }, [inline, withinRightRail]);
  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  // Positioning: if withinRightRail, anchor the fixed button to the rail's left edge
  const fixedClass = withinRightRail ? "fixed bottom-4" : "fixed left-4 bottom-4";

  return (
    <div
      className={[
        inline ? fixedClass : "mt-6 sticky bottom-3 pr-2 w-full flex justify-end",
        "z-[50] pointer-events-none w-full flex",
        inline ? "justify-start" : "justify-end"
      ].join(" ")}
      style={inline && withinRightRail && rightOffset != null ? { right: rightOffset } as React.CSSProperties : undefined}
    >
      <button
        type="button"
        aria-label="Back to top"
        onClick={scrollTop}
        className={[
          "pointer-events-auto select-none",
          "rounded-full shadow-md border border-white/10",
          "px-4 py-2 text-xs font-semibold",
          "bg-[rgba(20,20,28,0.85)] text-white backdrop-blur",
          "hover:bg-[rgba(20,20,28,0.95)] transition-colors",
        ].join(" ")}
      >
        ↑ Back to top
      </button>
    </div>
  );
}


