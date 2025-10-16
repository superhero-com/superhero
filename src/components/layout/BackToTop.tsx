import React, { useEffect, useRef, useState } from "react";

export default function BackToTop({ anchorId }: { anchorId: string }) {
  const [isFixed, setIsFixed] = useState(false);
  const btnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // When the sentinel (just above footer) is visible near the bottom,
        // pin the button to viewport bottom; otherwise keep it in flow.
        setIsFixed(entry.isIntersecting);
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
    <div
      ref={btnRef}
      className={[
        isFixed ? "fixed left-auto right-4 bottom-4" : "sticky bottom-3",
        "z-[5] pointer-events-none",
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


