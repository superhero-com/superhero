import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Assets
import votingSvg from '../svg/landing/voting.svg';
import appStoreSvg from '../svg/landing/appstore.svg';
import googlePlaySvg from '../svg/landing/googleplay.svg';
import githubSvg from '../svg/landing/github.svg';
// Placeholder for missing images - using existing SVGs or removing them
// import bannerImg from '../../../src/assets/landing/banner-img.png';
// import postPng from '../../../src/assets/landing/post.png';
// import mockupPng from '../../../src/assets/landing/mockup.png';
// import meetPng from '../../../src/assets/landing/superhero-meet-icon.png';
// import votingIconPng from '../../../src/assets/landing/superhero-voting-icon.png';
// import leagueIconPng from '../../../src/assets/landing/superhero-league-icon.png';

export default function Landing() {
  const { t } = useTranslation('landing');

  return (
    <div className='bg-black-900'>
      
      {/* Hero */}
      <section className="h-screen overflow-hidden flex items-center relative bg-gradient-to-br from-[#0a0a0f] via-[#0f0f23] to-[#1a1a2e]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,107,107,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(0,255,157,0.15)_0%,transparent_50%),radial-gradient(circle_at_40%_40%,rgba(69,183,209,0.1)_0%,transparent_50%)]" />
        <div className="relative z-10 w-full">
          <div className="max-w-[1180px] mx-auto px-4 py-32">
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-3 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {t('hero.tagline')}
            </h3>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight" dangerouslySetInnerHTML={{ __html: t('hero.title') }} />
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-4xl">
              {t('hero.description')}
            </p>
            <Link 
              to="/" 
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-lg px-8 py-4 rounded-2xl uppercase tracking-wide transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/30 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              {t('hero.getStarted')}
            </Link>
            <div className="mt-16">
              <div className="bg-gray-800 h-80 flex items-center justify-center text-white rounded-2xl shadow-2xl">
                {t('hero.appPreview')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story + Decentralization */}
      <section className="bg-black/20 backdrop-blur-2xl border-t border-white/10 py-24">
        <div className="max-w-[1180px] mx-auto px-4">
          <div className="flex flex-wrap -mx-4 mb-16">
            <div className="w-full md:w-1/2 px-4 mb-8 md:mb-0">
              <div className="pl-0 md:pl-40">
                <div className="mb-8">
                  <span className="text-[var(--neon-teal)] text-base font-semibold">{t('privacy.badge')}</span>
                  <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {t('privacy.title')}
                  </h2>
                  <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {t('privacy.title2')}
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 px-4">
              <p className="text-lg text-slate-300 leading-relaxed mt-6">
                {t('privacy.description')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap -mx-4">
            <div className="w-full lg:w-1/4 px-4 mb-8 lg:mb-0">
              <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 h-full min-w-[280px] lg:min-w-0">
                <img 
                  src={votingSvg} 
                  alt="Decentralized" 
                  className="max-h-16 max-w-16 mb-8 drop-shadow-[0_0_10px_rgba(255,107,107,0.7)]" 
                />
                <h4 className="text-[var(--neon-teal)] text-xl font-bold mb-6">
                  {t('features.decentralized.title')}
                </h4>
                <p className="text-slate-300 text-base leading-relaxed">
                  {t('features.decentralized.description')}
                </p>
              </div>
            </div>
            <div className="w-full lg:w-3/4 px-4">
              <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 h-full">
                <div className="bg-gray-200 h-48 flex items-center justify-center rounded-xl text-gray-600">
                  {t('features.posting.title')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition vs. Centralized Social Media */}
      <section className="bg-cover bg-center py-24" style={{ backgroundImage: 'url("../../src/assets/landing/bg-black.png")' }}>
        <div className="max-w-[1180px] mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-gray-400 text-base font-semibold uppercase tracking-wide">
              WHY ON‑CHAIN IDENTITY AND POSTS?
            </span>
            <h2 className="text-4xl md:text-5xl font-normal text-white mt-4">
              Wallet login makes your identity <b>portable</b>. On‑chain posts are <b>provable</b>
              and <b>remixable</b>.
            </h2>
          </div>
          <ul className="list-none mt-8 space-y-3 max-w-2xl mx-auto">
            <li className="text-lg text-gray-200 pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">
              Sign in with your wallet — one identity across apps
            </li>
            <li className="text-lg text-gray-200 pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">
              Own your social graph and portable reputation
            </li>
            <li className="text-lg text-gray-200 pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">
              Verifiable, timestamped posts (on‑chain option)
            </li>
            <li className="text-lg text-gray-200 pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400">
              Open source and community‑driven
            </li>
          </ul>
        </div>
      </section>

      {/* Tipping + Wallet downloads */}
      <section className="bg-black/20 backdrop-blur-2xl border-t border-white/10 py-24">
        <div className="max-w-[1180px] mx-auto px-4">
          <div className="flex flex-wrap -mx-4 items-center">
            <div className="w-full lg:w-1/2 px-4 mb-12 lg:mb-0">
              <div className="mb-8">
                <h3 className="text-sm font-semibold tracking-wider uppercase mb-3 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  TIPPING
                </h3>
                <p className="text-3xl md:text-4xl font-bold text-white">
                  <b>Sending crypto</b> has never been <b>easier</b>
                </p>
              </div>
              <div className="space-y-6">
                <p className="text-lg text-slate-300 leading-relaxed">
                  Superhero's native wallet integrates seamlessly into your daily life and allows you
                  to tip content and creators instantaneously – at virtually no cost.
                </p>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Create invitation links, track your history, and more –
                  all in one place.
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-4 pt-3">
                  <a href="https://apps.apple.com/app/superhero-wallet/id1502786641" target="_blank" rel="noreferrer">
                    <img src={appStoreSvg} alt="Download on the App Store" className="h-12 hover:opacity-80 transition-opacity" />
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.superhero.cordova" target="_blank" rel="noreferrer">
                    <img src={googlePlaySvg} alt="Get it on Google Play" className="h-12 hover:opacity-80 transition-opacity" />
                  </a>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-1/2 px-4">
              <div className="bg-gray-200 h-80 flex items-center justify-center rounded-2xl shadow-2xl">
                Wallet Mockup
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-950 py-24">
        <div className="max-w-[1180px] mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-normal text-white mb-4">
              Full of <b>powerful features</b>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed max-w-4xl mx-auto">
              Tip what you value, meet with your community, vote on what matters, and embed tipping
              everywhere with the Superhero Button.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center mt-16">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-8"></div>
              <h4 className="text-white text-xl font-semibold mb-5">
                Superhero Meet
              </h4>
              <p className="text-gray-400 text-base leading-relaxed pr-0 md:pr-12">
                Spin up a conference room in seconds – no account required – and even live-stream to
                YouTube with real-time decentralized tipping.
              </p>
            </div>
            <div className="text-center mt-16">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-8"></div>
              <h4 className="text-white text-xl font-semibold mb-5">
                Superhero Voting
              </h4>
              <p className="text-gray-400 text-base leading-relaxed pr-0 md:pr-12">
                Create polls, vote, delegate, and collect voting power from the community. Every vote
                counts.
              </p>
            </div>
            <div className="text-center mt-16">
              <h4 className="text-white text-xl font-semibold mb-5">
                Superhero Button
              </h4>
              <p className="text-gray-400 text-base leading-relaxed pr-0 md:pr-12 mb-6">
                Add a simple, customizable tip button to your website or blog and let people reward
                your work.
              </p>
              <a 
                className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-base px-8 py-4 rounded-2xl uppercase tracking-wide transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/30"
                href="https://github.com/aeternity/superhero-utils" 
                target="_blank" 
                rel="noreferrer"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="bg-gray-200 bg-cover bg-left py-24" style={{ backgroundImage: 'url("../../src/assets/landing/github.jpg")', backgroundSize: '700px 100%' }}>
        <div className="max-w-[1180px] mx-auto px-4">
          <div className="flex flex-wrap -mx-4">
            <div className="w-full lg:w-1/2 px-4" />
            <div className="w-full lg:w-1/2 px-4 pl-8 lg:pl-20">
              <div className="mb-8">
                <span className="text-gray-600 text-base font-semibold uppercase tracking-wide">
                  OPEN SOURCE
                </span>
                <h2 className="text-4xl md:text-5xl font-normal text-gray-900 mt-2">
                  Superhero
                </h2>
                <p className="text-4xl md:text-5xl font-normal text-gray-900">
                  is open-source
                </p>
              </div>
              <div>
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  Dive under the hood, use the code, fork it, or run it locally. Join a global
                  community pushing the ecosystem forward.
                </p>
                <a 
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-base px-8 py-4 rounded-2xl uppercase tracking-wide transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/30"
                  href="https://github.com/aeternity/superhero-ui/" 
                  target="_blank" 
                  rel="noreferrer"
                >
                  <img src={githubSvg} alt="GitHub" className="w-5 h-5" /> 
                  Contribute on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-10">
        <div className="max-w-[570px] mx-auto text-center px-4">
          <Link 
            to="/" 
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-lg px-8 py-4 rounded-2xl uppercase tracking-wide transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/30"
          >
            Become a Superhero Today
          </Link>
        </div>
      </section>
    </div>
  );
}


