import React, { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="sticky bottom-3 z-[5] pointer-events-none">
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
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        ↑ Back to top
      </button>
    </div>
  );
}


