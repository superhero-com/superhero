import React, { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

type WelcomeBannerProps = {
  className?: string;
};

const DISMISS_KEY = "welcome_banner_dismissed_until";

export default function WelcomeBanner({ className }: WelcomeBannerProps) {
  const [hidden, setHidden] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

  const maxTilt = 14;
  const maxZ = 22;
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const xr = (e.clientX - rect.left) / rect.width;
    const yr = (e.clientY - rect.top) / rect.height;
    const rx = (yr - 0.5) * -2 * maxTilt;
    const ry = (xr - 0.5) * 2 * maxTilt;
    if (wrapRef.current) {
      wrapRef.current.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(${maxZ}px)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (wrapRef.current) {
      wrapRef.current.style.transform = "rotateX(0) rotateY(0)";
    }
  }, []);

  if (hidden) return null;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl p-4 sm:p-6 md:p-7",
        "text-white",
        "border border-white/10",
        "transition-all duration-300 ease-out",
        className
      )}
      style={{
        minHeight: 112,
        background: "linear-gradient(145deg,#1d1836,#0a0a12)",
        boxShadow: "0 30px 70px rgba(0,0,0,.45), 0 4px 14px rgba(0,0,0,.25)",
      }}
      aria-label="Welcome to Superhero"
    >
      {/* translucent gradient blends with page background; no black overlay */}

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
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-300 blur-3xl" />
      </div>

      <div className="relative flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pr-0">
        <div className="text-left max-w-[640px] w-full">
          <h2 className="text-2xl md:text-4xl font-semibold leading-tight tracking-tight text-white">
            Your on-chain social realm
          </h2>
          <p className="mt-3 text-sm md:text-base leading-snug text-white/90">
            Where ideas gain value - every post is time‑stamped, communication is transparent, and trends are tokenizable.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/trends/tokens"
              className="inline-flex items-center rounded-[10px] px-[22px] py-[12px] text-sm font-bold transition-transform duration-100 hover:-translate-y-0.5 focus:outline-none"
              style={{ background: '#fff', color: '#000', textDecoration: 'none' }}
            >
              <span>Explore Trends</span>
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center rounded-[10px] px-[22px] py-[12px] text-sm font-bold transition-transform duration-100 hover:-translate-y-0.5 focus:outline-none"
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.45)', textDecoration: 'none' }}
            >
              <span>Learn more</span>
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: '#66d1ff', boxShadow: '0 0 10px #66d1ff' }} />
              Post
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: '#6dff9c', boxShadow: '0 0 10px #66ffb3' }} />
              Reward
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: '#ffb566', boxShadow: '0 0 10px #ffb566' }} />
              Tokenize
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: '#66d1ff', boxShadow: '0 0 10px #66d1ff' }} />
              Connect
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: '#6dff9c', boxShadow: '0 0 10px #66ffb3' }} />
              Earn
            </span>
          </div>
        </div>

        <div
          className="relative w-[280px] sm:w-[320px] md:w-[360px] aspect-square select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-hidden="true"
        >
          <div
            ref={wrapRef}
            className="w-full h-full will-change-transform"
            style={{ transformStyle: "preserve-3d", transition: "transform .2s ease-out" }}
          >
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <radialGradient id="turquoise" cx="35%" cy="35%" r="70%">
                  <stop offset="0" stopColor="#a0fff2" />
                  <stop offset="0.6" stopColor="#00ffd0" />
                  <stop offset="1" stopColor="#00a37a" />
                </radialGradient>
                <radialGradient id="blue" cx="35%" cy="35%" r="70%">
                  <stop offset="0" stopColor="#c2e8ff" />
                  <stop offset="0.6" stopColor="#57c7ff" />
                  <stop offset="1" stopColor="#0077ff" />
                </radialGradient>
                <radialGradient id="purple" cx="35%" cy="35%" r="70%">
                  <stop offset="0" stopColor="#e3c2ff" />
                  <stop offset="0.6" stopColor="#b057ff" />
                  <stop offset="1" stopColor="#6200ff" />
                </radialGradient>
                <radialGradient id="shadow" cx="50%" cy="60%" r="70%">
                  <stop offset="0" stopColor="#000" stopOpacity=".45" />
                  <stop offset="1" stopColor="#000" stopOpacity="0" />
                </radialGradient>
                <filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g transform="translate(100,100)">
                <g id="orbit" opacity="0.9">
                  <g transform="rotate(0)">
                    <g transform="translate(70,0)">
                      <polygon points="0,-6 1.8,-1.8 6,0 1.8,1.8 0,6 -1.8,1.8 -6,0 -1.8,-1.8" fill="#00ffd0" filter="url(#starGlow)" />
                    </g>
                  </g>
                  <g transform="rotate(120)">
                    <g transform="translate(55,0)">
                      <polygon points="0,-5 1.6,-1.6 5,0 1.6,1.6 0,5 -1.6,1.6 -5,0 -1.6,-1.6" fill="#57c7ff" filter="url(#starGlow)" />
                    </g>
                  </g>
                  <g transform="rotate(240)">
                    <g transform="translate(85,0)">
                      <polygon points="0,-4.5 1.5,-1.5 4.5,0 1.5,1.5 0,4.5 -1.5,1.5 -4.5,0 -1.5,-1.5" fill="#b057ff" filter="url(#starGlow)" />
                    </g>
                  </g>
                  <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 0 0" to="360 0 0" dur="18s" repeatCount="indefinite" />
                </g>

                <g className="coins">
                  <g className="coin" transform="translate(-60,-24)">
                    <ellipse cx="0" cy="24" rx="34" ry="9" fill="#000" opacity=".25" />
                    <circle cx="0" cy="0" r="34" fill="url(#turquoise)" />
                    <circle cx="0" cy="0" r="30" fill="none" stroke="#8affec" strokeWidth="4" />
                    <circle cx="-7" cy="-7" r="34" fill="url(#shadow)" />
                  </g>
                  <g className="coin" transform="translate(0,12)">
                    <ellipse cx="0" cy="24" rx="30" ry="9" fill="#000" opacity=".25" />
                    <circle cx="0" cy="0" r="30" fill="url(#blue)" />
                    <circle cx="0" cy="0" r="26" fill="none" stroke="#8ad4ff" strokeWidth="4" />
                    <circle cx="-6" cy="-6" r="30" fill="url(#shadow)" />
                  </g>
                  <g className="coin" transform="translate(60,0)">
                    <ellipse cx="0" cy="22" rx="26" ry="8" fill="#000" opacity=".25" />
                    <circle cx="0" cy="0" r="26" fill="url(#purple)" />
                    <circle cx="0" cy="0" r="22" fill="none" stroke="#d79fff" strokeWidth="4" />
                    <circle cx="-5" cy="-5" r="26" fill="url(#shadow)" />
                  </g>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

