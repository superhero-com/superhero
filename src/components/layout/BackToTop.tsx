import React, { useEffect, useRef, useState } from "react";

type BackToTopProps = {
  threshold?: number;     // show after this scroll amount
  bottomOffset?: number;  // px from viewport bottom when fixed
};

export default function BackToTop({ threshold = 400, bottomOffset = 16 }: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [leftOffset, setLeftOffset] = useState<number>(16);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  // Become fixed after the anchor passes near the bottom of viewport
  useEffect(() => {
    if (!anchorRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: null, rootMargin: `0px 0px -${bottomOffset + 48}px 0px`, threshold: 0 }
    );
    observer.observe(anchorRef.current);
    return () => observer.disconnect();
  }, [bottomOffset]);

  // Keep horizontally inside the right rail when fixed
  useEffect(() => {
    const updateLeft = () => {
      const rail = document.getElementById('right-rail-root');
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      setLeftOffset(Math.max(8, rect.left + 8));
    };
    updateLeft();
    window.addEventListener('resize', updateLeft);
    window.addEventListener('scroll', updateLeft, { passive: true });
    return () => {
      window.removeEventListener('resize', updateLeft);
      window.removeEventListener('scroll', updateLeft);
    };
  }, []);

  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <>
      <div ref={anchorRef} className="h-0" aria-hidden />
      <div
        className={["w-full pointer-events-none z-[10]", stuck ? "" : "mt-6 sticky bottom-3 flex justify-start pl-2"].join(" ")}
        style={stuck ? { position: 'fixed', bottom: bottomOffset, left: leftOffset } as React.CSSProperties : undefined}
      >
        <button
          type="button"
          aria-label="Back to top"
          onClick={scrollTop}
          className={[
            "pointer-events-auto select-none transition-opacity duration-200",
            "rounded-full shadow-md border border-white/10",
            "px-4 py-2 text-xs font-semibold",
            "bg-[rgba(20,20,28,0.85)] text-white backdrop-blur",
            "hover:bg-[rgba(20,20,28,0.95)] transition-colors",
            visible ? 'opacity-100' : 'opacity-0'
          ].join(" ")}
        >
          ↑ Back to top
        </button>
      </div>
    </>
  );
}


