import React from "react";
import { cn } from "../lib/utils";

type WelcomeBannerProps = {
  className?: string;
};

export default function WelcomeBanner({ className }: WelcomeBannerProps) {
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
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-300 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-2 md:gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
          Superhero — the all‑in‑one social + crypto app
        </h2>
        <p className="text-sm md:text-base leading-snug text-white/90 max-w-3xl">
          Posts are timestamped forever on the aeternity blockchain. Discover and invest in trending community tokens, and help govern them on‑chain.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex select-none items-center rounded-lg bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-md">
            Explore Trends
          </span>
          <span className="inline-flex select-none items-center rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium">
            Learn more
          </span>
        </div>
      </div>
    </div>
  );
}

