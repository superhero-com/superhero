import React from 'react';
import { Link } from 'react-router-dom';
import './bannerD.styles.css';

const STEPS = [
  { badge: 'START', icon: '#', label: 'Create / buy' },
  { badge: '1', icon: '✍', label: 'Post' },
  { badge: '2', icon: '◉', label: 'Attention' },
  { badge: '3', icon: '↗', label: 'Trade' },
  { badge: '4', icon: '◎', label: 'Govern' },
];

const BannerD = () => (
  <div className="banner-d">
    <div className="banner-d__top">
      <div className="banner-d__left">
        <h1 className="banner-d__title">
          Create or buy a #trend.
          {' '}
          <br className="mobile-break" />
          Then
          {' '}
          <span className="banner-d__accent">make it move.</span>
        </h1>

        <p className="banner-d__desc">
          Post the thesis. Build attention. Trade the hashtag market. Holders govern the DAO.
        </p>

        <div className="banner-cta">
          <Link to="/trends/create" className="banner-btn banner-btn--primary">
            Tokenize #trend
          </Link>
          <Link to="/faq" className="banner-btn banner-btn--ghost">
            How it works
          </Link>
        </div>
      </div>

      <div className="banner-d__right">
        <div className="banner-d__card">
          <div className="banner-d__card-header">
            <div className="banner-d__card-icon">#</div>
            <div className="banner-d__card-meta">
              <span className="banner-d__card-name">#AI PersonalOS</span>
              <span className="banner-d__card-sub">Tokenized #trend &middot; hashtag market</span>
            </div>
          </div>

          <div className="banner-d__card-priceline">
            <span className="banner-d__card-price">$0.84</span>
            <span className="banner-d__card-change">
              +24.6%
              ↗
            </span>
          </div>

          <div className="banner-d__card-chart">
            <svg viewBox="0 0 280 64" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bdChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(122,92,255,0.4)" />
                  <stop offset="100%" stopColor="rgba(122,92,255,0)" />
                </linearGradient>
                <linearGradient id="bdChartStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7a5cff" />
                  <stop offset="100%" stopColor="#00e5ff" />
                </linearGradient>
              </defs>
              <path
                d="M0 52 Q30 48 55 40 T110 28 T165 20 T200 24 T240 12 T280 8 V64 H0 Z"
                fill="url(#bdChartFill)"
              />
              <path
                d="M0 52 Q30 48 55 40 T110 28 T165 20 T200 24 T240 12 T280 8"
                stroke="url(#bdChartStroke)"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>

          <div className="banner-d__card-stats">
            <div className="banner-d__stat">
              <span className="banner-d__stat-label">Holders</span>
              <span className="banner-d__stat-value">2,731</span>
            </div>
            <div className="banner-d__stat">
              <span className="banner-d__stat-label">Volume 24h</span>
              <span className="banner-d__stat-value">$84k</span>
            </div>
            <div className="banner-d__stat">
              <span className="banner-d__stat-label">Liquidity</span>
              <span className="banner-d__stat-value">$312k</span>
            </div>
            <div className="banner-d__stat">
              <span className="banner-d__stat-label">DAO votes</span>
              <span className="banner-d__stat-value">1,247</span>
            </div>
            <div className="banner-d__stat">
              <span className="banner-d__stat-label">Treasury</span>
              <span className="banner-d__stat-value">$128.4k</span>
            </div>
            <div className="banner-d__stat">
              <span className="banner-d__stat-label">Proposals</span>
              <span className="banner-d__stat-value">3 open</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="banner-d__pipeline">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.badge}>
          {i > 0 && <span className="banner-d__pipe-arrow" aria-hidden="true">›</span>}
          <div className="banner-d__step">
            <span
              className={`banner-d__badge ${step.badge === 'START' ? 'banner-d__badge--start' : ''}`}
            >
              {step.badge}
            </span>
            <span className="banner-d__step-icon">{step.icon}</span>
            <span className="banner-d__step-label">{step.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default BannerD;
