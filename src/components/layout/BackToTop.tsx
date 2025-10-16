import React, { useEffect, useState } from "react";

export default function BackToTop({ anchorId = "right-rail-bottom-sentinel" }: { anchorId?: string }) {
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Desired behavior (opposite of previous):
        // - While BELOW its anchor (sentinel not visible), keep button FIXED to viewport bottom
        // - When anchor is visible (we reached the footer area), switch to STICKY so it locks above the footer
        setIsFixed(!entry.isIntersecting);
      },
      { root: null, threshold: 0.01 }
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);
  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className={[
      isFixed ? "fixed right-4 bottom-4" : "sticky bottom-3 pr-2",
      "z-[5] pointer-events-none w-full flex justify-end"
    ].join(" ")}
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


