import React, { useEffect, useState } from "react";

type BackToTopProps = {
  threshold?: number;     // optional override; defaults to .right-rail-bleed height
  bottomOffset?: number;  // px from viewport bottom when fixed
};

export default function BackToTop({ threshold, bottomOffset = 32 }: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const [leftOffset, setLeftOffset] = useState<number>(16);
  const [computedThreshold, setComputedThreshold] = useState<number>(threshold ?? 400);
  const [isMdUp, setIsMdUp] = useState<boolean>(() => window.matchMedia('(min-width: 768px)').matches);

  // Compute threshold from .right-rail-bleed height if not provided
  useEffect(() => {
    if (threshold != null) {
      setComputedThreshold(threshold);
      return;
    }
    const el = document.querySelector('.right-rail-bleed') as HTMLElement | null;
    const h = el?.clientHeight ?? 400;
    const EXTRA_OFFSET = 300; // increased: show 300px later than the rail height
    setComputedThreshold(h + EXTRA_OFFSET);
  }, [threshold]);

  // Media query watcher for md+
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsMdUp(mq.matches);
    mq.addEventListener('change', handler);
    handler();
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Toggle visibility after threshold and keep horizontally inside right rail
  useEffect(() => {
    const onScrollOrResize = () => {
      setVisible(isMdUp && window.scrollY > computedThreshold);
      const rail = document.getElementById('right-rail-root');
      if (rail) {
        const rect = rail.getBoundingClientRect();
        setLeftOffset(Math.max(8, rect.left + 8));
      }
    };
    onScrollOrResize();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [computedThreshold, isMdUp]);

  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  if (!isMdUp) return null;

  return (
    <div
      className="pointer-events-none z-[50]"
      style={{ position: 'fixed', bottom: bottomOffset, left: leftOffset }}
    >
      <button
        type="button"
        aria-label="Back to top"
        onClick={scrollTop}
        className={[
          "pointer-events-auto select-none transition-opacity duration-200",
          "rounded-full px-4 py-2 text-xs font-semibold",
          // Glass styling
          "bg-[var(--glass-bg)] text-white border border-white/20",
          "backdrop-blur-[12px] shadow-[var(--glass-shadow)]",
          // Hover/active
          "hover:bg-white/15 transition-colors",
          visible ? 'opacity-100' : 'opacity-0'
        ].join(" ")}
      >
        ↑ Back to top
      </button>
    </div>
  );
}


