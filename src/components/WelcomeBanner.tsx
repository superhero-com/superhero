import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

type WelcomeBannerProps = {
  className?: string;
};

const DISMISS_KEY = "welcome_banner_dismissed_until";

export default function WelcomeBanner({ className }: WelcomeBannerProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (!until) return;
      const ts = Date.parse(until);
      if (!Number.isNaN(ts) && ts > Date.now()) setHidden(true);
    } catch {}
  }, []);

  const handleDismiss = () => {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      localStorage.setItem(DISMISS_KEY, expiresAt.toISOString());
    } catch {}
    setHidden(true);
  };

  if (hidden) return null;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl p-4 sm:p-6 md:p-7",
        "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600",
        "text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
        "border border-white/10",
        "transition-all duration-300 ease-out",
        className
      )}
      style={{ minHeight: 112 }}
      aria-label="Welcome to Superhero"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss welcome banner"
        className={cn(
          "absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center",
          "rounded-full bg-white/15 text-white/90 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/60"
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-300 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-2 md:gap-3">
        <h2
          className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight leading-[1.15] sm:leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] text-white"
          style={{ WebkitTextFillColor: 'white', background: 'none' }}
        >
          Superhero — the all‑in‑one social + crypto app
        </h2>
        <p className="text-sm md:text-base leading-snug text-white/95 max-w-3xl">
          Posts are timestamped forever on the aeternity blockchain. Tokenize trends. Own the hype. Build communities.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Link
            to="/trending/tokens"
            className="no-gradient-text inline-flex items-center rounded-lg bg-white text-violet-700 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            Explore Trends
          </Link>
          <Link
            to="/faq"
            className="inline-flex items-center rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-sm font-medium text-white/95 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            Learn more
          </Link>
        </div>
      </div>
    </div>
  );
}

