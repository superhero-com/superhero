import React, { useEffect, useState } from "react";

type BackToTopProps = {
  threshold?: number; // px scrolled before showing
  align?: 'left' | 'right';
};

export default function BackToTop({ threshold = 400, align = 'left' }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div
      className={[
        "mt-6 sticky bottom-3 w-full flex pointer-events-none z-[5]",
        align === 'left' ? 'justify-start pl-2' : 'justify-end pr-2'
      ].join(' ')}
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
  );
}


