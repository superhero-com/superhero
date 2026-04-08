import React from 'react';
import { Wallet, MessageCircle, Star } from 'lucide-react';
import { Head } from '@/seo/Head';

import appStoreBadge from '@/assets/images/appstore-download.png';
import googlePlayBadge from '@/assets/images/googleplay-download.png';
import screen1 from '@/assets/images/sh-app-screen-1.png';
import screen2 from '@/assets/images/sh-app-screen-2.png';
import screen3 from '@/assets/images/sh-app-screen-3.png';

const APP_STORE_URL = 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.superhero.apps';

const sections = [
  {
    image: screen1,
    title: 'Follow the Conversation',
    description:
      'Discover posts, trends, and communities in real time. See what people are talking about and follow ideas from their first post to active communities.',
  },
  {
    image: screen2,
    title: 'Discover Rising Tokens',
    description:
      'Find communities gaining momentum in real time. Explore trending tokens, track market caps, and spot opportunities early.',
  },
  {
    image: screen3,
    title: 'Track Growth. Join Instantly.',
    description:
      'Support communities directly on-chain. Trade tokens, view price history, and join with a single tap — all through decentralized smart contracts.',
  },
];

const highlights = [
  {
    icon: <Wallet className="w-6 h-6" />,
    title: 'In-App Wallet',
    description:
      'Superhero has a built-in, non-custodial wallet embedded directly in the app. Send, receive, and manage your crypto without ever leaving.',
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'Chats',
    description:
      'Nostr-based chats between users. Private, decentralized messaging built right into the app.',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Rewards & Affiliate',
    description:
      'Earn when you share on X. Invite friends, grow communities, and get rewarded for spreading the word.',
  },
];

const StoreBadges = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className="transition-transform duration-200 hover:scale-105"
    >
      <img
        src={appStoreBadge}
        alt="Download on the App Store"
        className="h-12 sm:h-14"
      />
    </a>
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noreferrer"
      className="transition-transform duration-200 hover:scale-105"
    >
      <img
        src={googlePlayBadge}
        alt="Get it on Google Play"
        className="h-12 sm:h-14"
      />
    </a>
  </div>
);

export const DownloadScreen = () => (
  <div className="min-h-screen bg-[#0a0a0f] text-white">
    <Head
      title="Download Superhero App — Web3 Communities"
      description="Download the Superhero app for iOS and Android. Discover trends, join communities, and trade tokens — all in one app."
      canonicalPath="/download"
    />

    {/* ── Hero ── */}
    <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="relative max-w-3xl mx-auto">
        <p className="text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-slate-500 mb-4">
          Available on iOS &amp; Android
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-5">
          Superhero App
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
          Discover trends, join communities, trade tokens&nbsp;&mdash; all in one app.
        </p>
        <StoreBadges className="justify-center" />
      </div>
    </section>

    {/* ── Highlight Cards ── */}
    <section className="py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-5">
        {highlights.map((h) => (
          <div
            key={h.title}
            className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.06] text-slate-300 group-hover:text-white transition-colors duration-300">
                {h.icon}
              </div>
              <h3 className="text-lg font-semibold">{h.title}</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors duration-300">
              {h.description}
            </p>
          </div>
        ))}
      </div>
    </section>

    {/* ── Alternating Feature Sections ── */}
    {sections.map((section, i) => {
      const imageOnLeft = i % 2 === 0;

      return (
        <section
          key={section.title}
          className={`py-10 sm:py-16 ${i === 0 ? 'border-t border-white/5' : ''}`}
        >
          <div
            className={`max-w-6xl mx-auto px-4 flex flex-col items-center gap-8 md:gap-12 ${
              imageOnLeft ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            <div className="w-full md:w-1/2 flex justify-center">
              <img
                src={section.image}
                alt={section.title}
                className="max-h-[520px] sm:max-h-[600px] w-auto rounded-3xl object-contain"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>

            <div className="w-full md:w-1/2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                {section.title}
              </h2>
              <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-md mx-auto md:mx-0">
                {section.description}
              </p>
            </div>
          </div>
        </section>
      );
    })}

    {/* ── Bottom CTA ── */}
    <section className="relative py-14 sm:py-20 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />
      <div className="relative max-w-2xl mx-auto text-center px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
          Ready to join?
        </h2>
        <p className="text-slate-500 text-lg mb-8">
          Download Superhero and be part of what comes next.
        </p>
        <StoreBadges className="justify-center" />
      </div>
    </section>
  </div>
);

export default DownloadScreen;
