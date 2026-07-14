import React from 'react';
import './banner-graphics.css';

/* Small, consistently-styled graphics for each banner slide.
   All share the `.bmini` glass-card frame so the carousel feels cohesive. */

const Sparkline = ({ id }: { id: string }) => (
  <svg
    className="bmini__spark"
    viewBox="0 0 220 40"
    preserveAspectRatio="none"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(122,92,255,0.4)" />
        <stop offset="100%" stopColor="rgba(122,92,255,0)" />
      </linearGradient>
      <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7a5cff" />
        <stop offset="100%" stopColor="#00e5ff" />
      </linearGradient>
    </defs>
    <path d="M0 32 Q24 30 44 24 T88 16 T132 12 T160 16 T192 7 T220 4 V40 H0 Z" fill={`url(#${id}-fill)`} />
    <path
      d="M0 32 Q24 30 44 24 T88 16 T132 12 T160 16 T192 7 T220 4"
      stroke={`url(#${id}-stroke)`}
      strokeWidth="2"
      fill="none"
    />
    <circle cx="220" cy="4" r="3" fill="#00e5ff" />
  </svg>
);

/* Slide 0 – NEW: Superhero now available across platforms */
export const AvailabilityGraphic = () => (
  <div className="bmini">
    <div className="bmini__head">
      <span className="bmini__diamond" aria-hidden="true" />
      <div className="bmini__meta">
        <span className="bmini__name">Superhero</span>
        <span className="bmini__sub">Now available</span>
      </div>
    </div>
    <ul className="bmini__list">
      <li className="bmini__list-row">
        <span className="bmini__list-k">iOS</span>
        <span className="bmini__list-v">App Store</span>
      </li>
      <li className="bmini__list-row">
        <span className="bmini__list-k">Android</span>
        <span className="bmini__list-v">Google Play</span>
      </li>
      <li className="bmini__list-row">
        <span className="bmini__list-k">AI agents</span>
        <span className="bmini__list-v">Openclaw / Claude</span>
      </li>
    </ul>
    <div className="bmini__row">
      <span className="bmini__chip">Self-custodial wallet</span>
    </div>
  </div>
);

/* Slide A – Post on-chain / tip instantly */
export const PostTipGraphic = () => (
  <div className="bmini">
    <div className="bmini__head">
      <span className="bmini__avatar">SH</span>
      <div className="bmini__meta">
        <span className="bmini__name">@superhero</span>
        <span className="bmini__sub">Posted on-chain &middot; 2m</span>
      </div>
    </div>
    <p className="bmini__post">Shipped the new #trend markets today.</p>
    <div className="bmini__row">
      <span className="bmini__pill bmini__pill--gr">Tip 5 AE</span>
      <span className="bmini__chip">
        ✓
        {' '}
        receipt
      </span>
    </div>
  </div>
);

/* Slide B – Tokenize #trends / trade the signal */
export const SignalGraphic = () => (
  <div className="bmini">
    <div className="bmini__head">
      <span className="bmini__icon">#</span>
      <div className="bmini__meta">
        <span className="bmini__name">#Solar</span>
        <span className="bmini__sub">Tokenized signal</span>
      </div>
    </div>
    <div className="bmini__priceline">
      <span className="bmini__price">$1.24</span>
      <span className="bmini__delta bmini__delta--up">
        +8.2%
        ↗
      </span>
    </div>
    <Sparkline id="sig" />
    <div className="bmini__row">
      <span className="bmini__chip">Bonding curve</span>
      <span className="bmini__chip">Live</span>
    </div>
  </div>
);

/* Slide C – Signal → treasury / Purpose-DAOs */
export const TreasuryGraphic = () => (
  <div className="bmini">
    <div className="bmini__head">
      <span className="bmini__icon bmini__icon--pu">◈</span>
      <div className="bmini__meta">
        <span className="bmini__name">Purpose-DAO</span>
        <span className="bmini__sub">Treasury</span>
      </div>
    </div>
    <div className="bmini__priceline">
      <span className="bmini__price">$128.4k</span>
      <span className="bmini__delta bmini__delta--up">+37.8%</span>
    </div>
    <div className="bmini__flow">
      <span className="bmini__flow-tag">Fees</span>
      <span className="bmini__flow-arrow">→</span>
      <span className="bmini__flow-tag bmini__flow-tag--gr">Treasury</span>
    </div>
    <div className="bmini__row">
      <span className="bmini__stat-k">Creator payouts</span>
      <span className="bmini__stat-v">$12.3k</span>
    </div>
  </div>
);

/* Slide D – Create or buy a #trend / make it move */
export const MarketGraphic = () => (
  <div className="bmini">
    <div className="bmini__head">
      <span className="bmini__icon">#</span>
      <div className="bmini__meta">
        <span className="bmini__name">#AI PersonalOS</span>
        <span className="bmini__sub">Hashtag market</span>
      </div>
    </div>
    <div className="bmini__priceline">
      <span className="bmini__price">$0.84</span>
      <span className="bmini__delta bmini__delta--up">
        +24.6%
        ↗
      </span>
    </div>
    <Sparkline id="mkt" />
    <div className="bmini__stats">
      <div className="bmini__stat">
        <span className="bmini__stat-k">Holders</span>
        <span className="bmini__stat-v">2,731</span>
      </div>
      <div className="bmini__stat">
        <span className="bmini__stat-k">Vol 24h</span>
        <span className="bmini__stat-v">$84k</span>
      </div>
      <div className="bmini__stat">
        <span className="bmini__stat-k">Liq.</span>
        <span className="bmini__stat-v">$312k</span>
      </div>
    </div>
  </div>
);
