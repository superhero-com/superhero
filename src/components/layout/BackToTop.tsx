import React from "react";

export default function BackToTop({ inline = false }: { inline?: boolean }) {
  const scrollTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className={[
      inline ? "mt-4 w-full flex justify-end" : "mt-6 sticky bottom-3 pr-2 w-full flex justify-end",
      "z-[5] pointer-events-none"
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


