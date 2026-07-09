import React from 'react';

/**
 * Glossy, 3D-tilted "trend token" showcase card for the home hero banner.
 * Static mockup (no live data) — mirrors the reference design language:
 * gradient hairline (flagship), brand-gradient area chart with a glowing
 * endpoint, timeframe pills, and holders / volume / liquidity stat chips.
 * Decorative only (aria-hidden); hidden on small screens via CSS.
 */
const BannerTokenCard = () => (
  <div className="liquid-glass liquid-glass--gradient banner-slide-card__inner">
    {/* Header */}
    <div className="btc-head">
      <div className="btc-logo">#</div>
      <div className="btc-id">
        <span className="btc-name">#AI&nbsp;PersonalOS</span>
        <span className="btc-sub">
          Tokenized #trend
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#8b5cf6" aria-hidden="true">
            <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19.3 7.2 16.7l.9-5.4L4.2 7.7l5.4-.8z" />
          </svg>
        </span>
      </div>
    </div>

    {/* Price */}
    <div className="btc-price">
      <span className="btc-value">$0.84</span>
      <span className="btc-delta">+24.6% ↗</span>
    </div>

    {/* Chart */}
    <svg className="btc-chart" viewBox="0 0 320 96" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="btcStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="btcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <filter id="btcGlow"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d="M0,78 L28,72 L56,76 L84,60 L112,66 L140,50 L168,58 L196,38 L224,46 L252,26 L280,32 L308,10 L308,96 L0,96 Z" fill="url(#btcFill)" />
      <path d="M0,78 L28,72 L56,76 L84,60 L112,66 L140,50 L168,58 L196,38 L224,46 L252,26 L280,32 L308,10" fill="none" stroke="url(#btcStroke)" strokeWidth="2.4" filter="url(#btcGlow)" />
      <circle cx="308" cy="10" r="4.5" fill="#ec4899" filter="url(#btcGlow)" />
    </svg>

    {/* Timeframes */}
    <div className="btc-tfs">
      {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((tf) => (
        <span key={tf} className={`btc-tf${tf === '1D' ? ' active' : ''}`}>{tf}</span>
      ))}
    </div>

    {/* Stats */}
    <div className="btc-stats">
      <div className="btc-stat">
        <span className="btc-stat-lbl">Holders</span>
        <span className="btc-stat-v">2,731</span>
        <span className="btc-stat-sub">+18.3%</span>
      </div>
      <div className="btc-stat">
        <span className="btc-stat-lbl">Volume 24h</span>
        <span className="btc-stat-v">$84k</span>
        <span className="btc-stat-sub">+37.8%</span>
      </div>
      <div className="btc-stat">
        <span className="btc-stat-lbl">Liquidity</span>
        <span className="btc-stat-v">$312k</span>
        <span className="btc-stat-sub btc-stat-sub--muted">pool</span>
      </div>
    </div>
  </div>
);

export default BannerTokenCard;
