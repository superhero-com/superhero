import React from 'react';

/**
 * "Signal → treasury: Purpose-DAOs" showcase card for the home hero banner (slide C).
 * Static mockup (decorative). A #trend DAO treasury with a passing payout proposal,
 * matching the slide's "fees seed DAOs so ideas get budgets and milestones" message.
 */
const BannerDaoCard = () => (
  <div className="liquid-glass liquid-glass--gradient banner-slide-card__inner">
    {/* Header */}
    <div className="bdc-head">
      <div className="bdc-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 21h18M4 21V9l8-5 8 5v12M9 21v-6h6v6" />
        </svg>
      </div>
      <div className="bdc-id">
        <span className="bdc-name">#DeSci DAO</span>
        <span className="bdc-sub">Purpose&#8209;DAO · Treasury</span>
      </div>
    </div>

    {/* Treasury */}
    <div className="bdc-treasury">
      <span className="bdc-treasury-v">9,306 AE</span>
      <span className="bdc-treasury-usd">≈ $46,180 · fees → treasury</span>
    </div>

    {/* Proposal + vote */}
    <div className="bdc-prop">
      <div className="bdc-prop-top">
        <span className="bdc-prop-title">Fund milestone #2 payout</span>
        <span className="bdc-prop-pill">Passing</span>
      </div>
      <div className="bdc-bar"><div className="bdc-bar-fill" style={{ width: '72%' }} /></div>
      <div className="bdc-prop-meta">
        <span className="bdc-for">For 72%</span>
        <span>Against 28%</span>
      </div>
    </div>

    {/* Stats */}
    <div className="bdc-stats">
      <div className="bdc-stat">
        <span className="bdc-stat-lbl">Members</span>
        <span className="bdc-stat-v">412</span>
      </div>
      <div className="bdc-stat">
        <span className="bdc-stat-lbl">Payouts</span>
        <span className="bdc-stat-v">$128k</span>
      </div>
      <div className="bdc-stat">
        <span className="bdc-stat-lbl">Proposals</span>
        <span className="bdc-stat-v">24</span>
      </div>
    </div>
  </div>
);

export default BannerDaoCard;
