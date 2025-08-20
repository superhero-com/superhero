import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import AeAmountFiat from '../components/AeAmountFiat';
import './Landing.scss';

// Assets (re-using Vue landing assets)
import bannerImg from '../../../src/assets/landing/banner-img.png';
import votingSvg from '../../../src/assets/landing/voting.svg';
import postPng from '../../../src/assets/landing/post.png';
import appStoreSvg from '../../../src/assets/landing/appstore.svg';
import googlePlaySvg from '../../../src/assets/landing/googleplay.svg';
import mockupPng from '../../../src/assets/landing/mockup.png';
import githubSvg from '../../../src/assets/landing/github.svg';
import meetPng from '../../../src/assets/landing/superhero-meet-icon.png';
import votingIconPng from '../../../src/assets/landing/superhero-voting-icon.png';
import leagueIconPng from '../../../src/assets/landing/superhero-league-icon.png';

export default function Landing() {
  const stats = useSelector((s: RootState) => s.backend.stats);

  return (
    <div className="landing-page-container">
      {/* Hero */}
      <section className="main-banner">
        <div className="banner-caption">
          <div className="sh-container">
            <h3>OWN YOUR ONLINE IDENTITY</h3>
            <h1>
              Your social, your wallet, your rules — a <b>decentralized</b> network for everyone
            </h1>
            <p>
              Sign in with your wallet and keep one portable identity across apps. Post on-chain when
              you want verifiable, timestamped ideas — and tip creators instantly. It’s simple,
              friendly, and powered by the æternity blockchain.
            </p>
            <Link to="/" className="sh-btn-blue">Get started</Link>
            <div className="banner-img">
              <img src={bannerImg} alt="Superhero app preview" />
            </div>
          </div>
        </div>
      </section>

      {/* Story + Decentralization */}
      <section className="superhero-story">
        <div className="sh-container">
          <div className="sh-row">
            <div className="sh-col-6 left-share">
              <div className="share-history">
                <div className="top-title">
                  <span>Privacy First</span>
                  <h2>Share your story — </h2>
                  <p>and keep your identity</p>
                </div>
              </div>
            </div>
            <div className="sh-col-6 right-share-text">
              <p>
                With wallet-based identity you decide what to share and what to keep. Your handle and
                reputation are portable across the æternity ecosystem, and your posts can live on-chain
                when you want proof of authorship and permanence — or off-chain when you prefer speed
                and lightness. You’re in control either way.
              </p>
            </div>
          </div>

          <div className="sh-row">
            <div className="sh-col-3 left-voting-box">
              <div className="inner-left-voting-box">
                <img src={votingSvg} alt="Decentralized" />
                <h4>Fully decentralized</h4>
                <p>
                  Peer-to-peer by design. Nothing stands between you and the people you follow. Your
                  identity and posts can be on-chain, so value flows directly to creators.
                </p>
              </div>
            </div>
            <div className="sh-col-9 voting-img">
              <img src={postPng} alt="Decentralized posting" />
            </div>
          </div>

              {stats && (
            <div className="sh-row stats-row">
              <div className="sh-col-3 sm-text-box">
                <h4>{stats.totalTipsLength}</h4>
                <p>Tips aggregated</p>
              </div>
              <div className="sh-col-3 sm-text-box">
                <h4><AeAmountFiat amount={stats.totalAmount} /></h4>
                <p>Total Tips Value</p>
              </div>
              <div className="sh-col-3 sm-text-box">
                <h4>{stats.sendersLength}</h4>
                <p>Unique Tip Senders</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition vs. Centralized Social Media */}
      <section className="superhero-tokenization">
        <div className="sh-container">
          <div className="top-title">
            <span>WHY ON‑CHAIN IDENTITY AND POSTS?</span>
            <h2>
              Wallet login makes your identity <b>portable</b>. On‑chain posts are <b>provable</b>
              and <b>remixable</b>.
            </h2>
          </div>
          <ul className="custom-list">
            <li>Sign in with your wallet — one identity across apps</li>
            <li>Own your social graph and portable reputation</li>
            <li>Verifiable, timestamped posts (on‑chain option)</li>
            <li>Open source and community‑driven</li>
          </ul>
        </div>
      </section>

      {/* Tipping + Wallet downloads */}
      <section className="superhero-tips">
        <div className="sh-container">
          <div className="sh-row">
            <div className="sh-col-6 left-tips">
              <div className="top-title">
                <h3>TIPPING</h3>
                <p><b>Sending crypto</b> has never been <b>easier</b></p>
              </div>
              <div className="desc">
                <p>
                  Superhero’s native wallet integrates seamlessly into your daily life and allows you
                  to tip content and creators instantaneously – at virtually no cost.
                </p>
                <p>
                  Create invitation links, track your history, and more –
                  all in one place.
                </p>
                <div className="desc-hero">
                  <a href="https://apps.apple.com/app/superhero-wallet/id1502786641" target="_blank" rel="noreferrer">
                    <img src={appStoreSvg} alt="Download on the App Store" />
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.superhero.cordova" target="_blank" rel="noreferrer">
                    <img src={googlePlaySvg} alt="Get it on Google Play" />
                  </a>
                </div>
              </div>
            </div>
            <div className="sh-col-6 left-tips-img">
              <img src={mockupPng} alt="Superhero wallet mockup" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="superhero-crypto">
        <div className="sh-container">
          <div className="custom-title">
            <h2>Full of <b>powerful features</b></h2>
            <p>
              Tip what you value, meet with your community, vote on what matters, and embed tipping
              everywhere with the Superhero Button.
            </p>
          </div>
          <div className="sh-row">
            <div className="sh-col-4 crypto-box">
              <img src={meetPng} alt="Superhero Meet" />
              <h4>Superhero Meet</h4>
              <p>
                Spin up a conference room in seconds – no account required – and even live-stream to
                YouTube with real-time decentralized tipping.
              </p>
            </div>
            <div className="sh-col-4 crypto-box">
              <img src={votingIconPng} alt="Superhero Voting" />
              <h4>Superhero Voting</h4>
              <p>
                Create polls, vote, delegate, and collect voting power from the community. Every vote
                counts.
              </p>
            </div>
            <div className="sh-col-4 crypto-box">
              <img src={leagueIconPng} alt="Superhero Button" />
              <h4>Superhero Button</h4>
              <p>
                Add a simple, customizable tip button to your website or blog and let people reward
                your work.
              </p>
              <a className="sh-btn-blue" href="https://github.com/aeternity/superhero-utils" target="_blank" rel="noreferrer">Learn More</a>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="superhero-sendTrips">
        <div className="sh-container">
          <div className="sh-row">
            <div className="sh-col-6 empty-div" />
            <div className="sh-col-6 left-tips">
              <div className="top-title">
                <span>OPEN SOURCE</span>
                <h2>Superhero</h2>
                <p>is open-source</p>
              </div>
              <div className="desc">
                <p>
                  Dive under the hood, use the code, fork it, or run it locally. Join a global
                  community pushing the ecosystem forward.
                </p>
                <a className="sh-btn-blue" href="https://github.com/aeternity/superhero-ui/" target="_blank" rel="noreferrer">
                  <img src={githubSvg} alt="GitHub" /> Contribute on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="superhero-cta button-left-section">
        <div className="sh-join">
          <Link to="/" className="sh-btn-blue">Become a Superhero Today</Link>
        </div>
      </section>
    </div>
  );
}


