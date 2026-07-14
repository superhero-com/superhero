import React from 'react';
import { Link } from 'react-router-dom';
import './bannerD.styles.css';

const STEPS = [
  { badge: 'START', icon: '#', label: 'Create\n/ buy', desc: 'Start with a #trend hashtag.' },
  { badge: '1', icon: '✍', label: 'Post', desc: 'Publish the thesis on‑chain.' },
  { badge: '2', icon: '◉', label: 'Attention', desc: 'Readers debate and share.' },
  { badge: '3', icon: '↗', label: 'Trade', desc: 'Buy and sell the hashtag.' },
  { badge: '4', icon: '◎', label: 'Govern', desc: 'Holders shape the DAO.' },
];

const BannerD = () => (
  <div className="banner-d">
    <div className="banner-d__left">
      <h1 className="banner-d__title">
        Create or buy{' '}
        <br className="mobile-break" />
        a #trend. Then{' '}
        <br className="mobile-break" />
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

      <div className="banner-d__pipeline">
        {STEPS.map((step) => (
          <div key={step.badge} className="banner-d__step">
            <span
              className={`banner-d__badge ${step.badge === 'START' ? 'banner-d__badge--start' : ''}`}
            >
              {step.badge}
            </span>
            <span className="banner-d__step-icon">{step.icon}</span>
            <span className="banner-d__step-label">{step.label}</span>
            <span className="banner-d__step-desc">{step.desc}</span>
          </div>
        ))}
      </div>

      <p className="banner-d__footer">
        <span className="banner-d__bolt">{'ϟ'}</span>
        {' '}Censorship-resistant posts move attention.{' '}
        <span className="banner-d__footer-highlight">Trades move hashtag prices.</span>
        {' '}Holders govern.
      </p>
    </div>

    <div className="banner-d__right">
      <div className="banner-d__card">
        <div className="banner-d__card-header">
          <div className="banner-d__card-icon">#</div>
          <div className="banner-d__card-meta">
            <span className="banner-d__card-name">#AI PersonalOS</span>
            <span className="banner-d__card-sub">Tokenized #trend &middot; hashtag market</span>
          </div>
          <div className="banner-d__card-actions">
            <span className="banner-d__card-star">{'☆'}</span>
            <span className="banner-d__card-dots">&middot;&middot;&middot;</span>
          </div>
        </div>

        <div className="banner-d__card-price">$0.84</div>
        <div className="banner-d__card-change">+24.6% {'↗'}</div>

        <div className="banner-d__card-chart">
          <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(122,92,255,0.4)" />
                <stop offset="100%" stopColor="rgba(122,92,255,0)" />
              </linearGradient>
            </defs>
            <path
              d="M0 65 Q30 60 55 50 T110 35 T165 25 T200 30 T240 15 T280 10"
              stroke="url(#chartStroke)"
              strokeWidth="2"
              fill="none"
            />
            <defs>
              <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7a5cff" />
                <stop offset="100%" stopColor="#00e5ff" />
              </linearGradient>
            </defs>
            <path
              d="M0 65 Q30 60 55 50 T110 35 T165 25 T200 30 T240 15 T280 10 V80 H0 Z"
              fill="url(#chartGrad)"
            />
          </svg>
        </div>

        <div className="banner-d__card-stats">
          <div className="banner-d__stat">
            <span className="banner-d__stat-label">Holders</span>
            <span className="banner-d__stat-value">2,731</span>
            <span className="banner-d__stat-delta banner-d__stat-delta--up">+18.3%</span>
          </div>
          <div className="banner-d__stat">
            <span className="banner-d__stat-label">Volume 24h</span>
            <span className="banner-d__stat-value">$84k</span>
            <span className="banner-d__stat-delta banner-d__stat-delta--up">+37.8%</span>
          </div>
          <div className="banner-d__stat">
            <span className="banner-d__stat-label">Liquidity</span>
            <span className="banner-d__stat-value">$312k</span>
            <span className="banner-d__stat-delta banner-d__stat-delta--live">live</span>
          </div>
        </div>

        <div className="banner-d__card-stats">
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
);

export default BannerD;
