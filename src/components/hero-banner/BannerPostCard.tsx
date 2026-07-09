import React from 'react';

/**
 * "Post on-chain, tip instantly" showcase card for the home hero banner (slide A).
 * Static mockup (decorative). A social post with an inline on-chain tip + receipt,
 * matching the slide's "readers tip inline; creators get receipts" message.
 */
const BannerPostCard = () => (
  <div className="liquid-glass liquid-glass--gradient banner-slide-card__inner">
    {/* Author */}
    <div className="bpc-head">
      <div className="bpc-avatar">S</div>
      <div className="bpc-id">
        <span className="bpc-name">
          sophia.chain
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#8b5cf6" aria-hidden="true">
            <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19.3 7.2 16.7l.9-5.4L4.2 7.7l5.4-.8z" />
          </svg>
        </span>
        <span className="bpc-sub">Creator · 2m</span>
      </div>
      <span className="bpc-chain">◆ on&#8209;chain</span>
    </div>

    {/* Post body */}
    <p className="bpc-text">
      Shipped inline tipping ⚡ readers tip any post on&#8209;chain and creators get
      receipts automatically. <span className="bpc-tag">#buildonae</span>
    </p>

    {/* Inline tip event */}
    <div className="bpc-tip">
      <span className="bpc-tip-left">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Tip sent
      </span>
      <span className="bpc-tip-amt">+12.5 AE</span>
    </div>

    {/* Receipt */}
    <div className="bpc-receipt">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      On&#8209;chain receipt · tx confirmed
    </div>

    {/* Footer stats */}
    <div className="bpc-stats">
      <span className="bpc-stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
        248
      </span>
      <span className="bpc-stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-4-1L3 20l1.1-4A8.4 8.4 0 1 1 21 11.5z" /></svg>
        32
      </span>
      <span className="bpc-stat bpc-stat--bull">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4" /></svg>
        18 tips
      </span>
    </div>
  </div>
);

export default BannerPostCard;
