/* eslint-disable
  react/function-component-definition,
  react/no-unescaped-entities,
  max-len
*/
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Smartphone, ArrowRight, ChevronDown, Sparkles, Globe,
  Layers, Link2, Download, HelpCircle, ChevronUp, Wallet as WalletIcon, Monitor,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Floating orb component for ambient background                     */
/* ------------------------------------------------------------------ */
function FloatingOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] opacity-20 pointer-events-none ${className ?? ''}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Feature card — glass morphism style                               */
/* ------------------------------------------------------------------ */
function FeatureCard({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.08] hover:border-blue-400/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xs font-mono text-white/30 tracking-wider">{number}</span>
        </div>
        <h3 className="text-[15px] font-semibold text-white/90 mb-2 leading-snug">{title}</h3>
        <p className="text-[13px] text-white/50 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Item — glass morphism                                         */
/* ------------------------------------------------------------------ */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.05]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-[15px] font-medium text-white/80">{question}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-blue-400/60 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-[14px] text-white/50 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Supported chains pill                                             */
/* ------------------------------------------------------------------ */
function ChainBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] text-[12px] font-medium text-white/70">
      {name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Wallet Page                                                  */
/* ------------------------------------------------------------------ */
export default function Wallet() {
  return (
    <div className="min-h-screen bg-[#06060b] text-white overflow-x-hidden selection:bg-blue-500/30">

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background effects */}
        <div className="absolute inset-0">
          <FloatingOrb className="w-[600px] h-[600px] bg-blue-600 -top-40 -left-40" />
          <FloatingOrb className="w-[500px] h-[500px] bg-indigo-600 top-1/3 -right-32" />
          <FloatingOrb className="w-[400px] h-[400px] bg-cyan-600 bottom-0 left-1/3" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#06060b_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] mb-8">
            <WalletIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[12px] font-medium tracking-wide text-white/60 uppercase">
              Multichain Wallet
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6">
            <span className="block text-white/95">Superhero Wallet</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent pb-4">
              One wallet, all chains
            </span>
          </h1>

          {/* Sub */}
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/40 leading-relaxed mb-8">
            A multichain crypto wallet available on Android, iOS, and as a Chrome extension.
            Manage ETH, Bitcoin, Dogecoin, BNB, and æternity — all in one place.
          </p>

          {/* Supported chains */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <ChainBadge name="Ethereum" />
            <ChainBadge name="Bitcoin" />
            <ChainBadge name="Dogecoin" />
            <ChainBadge name="BNB Chain" />
            <ChainBadge name="æternity" />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href="https://play.google.com/store/apps/details?id=com.superhero.cordova&pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/25 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              Get on Google Play
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://apps.apple.com/bg/app/superhero-wallet/id1502786641"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-500/25 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              Download on App Store
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-blue-400/20 hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Globe className="w-4 h-4" />
              Chrome Extension
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center">
            <ChevronDown className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                    */}
      {/* ============================================================ */}
      <section id="features" className="relative py-32">
        <div className="max-w-[1180px] mx-auto px-6">
          {/* Section header */}
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              Everything you need
              <br />
              <span className="text-white/40">in a multichain wallet</span>
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              Superhero Wallet gives you full control of your assets across multiple blockchains
              with a simple, secure interface.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Layers}
              number="01"
              title="Multichain support"
              description="Manage Ethereum, Bitcoin, Dogecoin, BNB Chain, and æternity assets from a single wallet. No switching between apps."
            />
            <FeatureCard
              icon={Shield}
              number="02"
              title="Secure & self-custodial"
              description="Your keys, your crypto. Private keys never leave your device. No third party has access to your funds."
            />
            <FeatureCard
              icon={Link2}
              number="03"
              title="Buy .chain names"
              description="On the æternity chain, register human-readable .chain names that replace your wallet address. Easy to share, impossible to forget."
            />
            <FeatureCard
              icon={Sparkles}
              number="04"
              title="Connect to Superhero.com"
              description="Seamlessly connect to Superhero.com social media trends, trade attention tokens, and participate in on-chain communities."
            />
            <FeatureCard
              icon={Globe}
              number="05"
              title="DApp browser"
              description="Access decentralized applications directly from the wallet. Interact with DeFi protocols, NFT marketplaces, and more."
            />
            <FeatureCard
              icon={WalletIcon}
              number="06"
              title="Token management"
              description="Send, receive, and swap tokens across supported chains. View real-time balances and transaction history at a glance."
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  æternity SECTION                                           */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
                æternity Chain
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-6">
                .chain names &
                <br />
                <span className="text-white/40">social media trends</span>
              </h2>
              <p className="text-[15px] text-white/40 leading-relaxed mb-6">
                On the æternity chain, Superhero Wallet lets you register .chain names — human-readable
                identifiers that replace long wallet addresses. Share your name instead of a hash.
              </p>
              <p className="text-[15px] text-white/40 leading-relaxed mb-6">
                Connect your wallet to Superhero.com to participate in on-chain social media trends,
                trade attention tokens via bonding curves, and engage with decentralized communities.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Link2, label: 'Register .chain names as your identity' },
                  { icon: Sparkles, label: 'Trade social media trend tokens' },
                  { icon: Globe, label: 'Connect to Superhero.com communities' },
                ].map(({ icon: I, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                      <I className="w-4 h-4 text-blue-400/80" />
                    </div>
                    <span className="text-[14px] text-white/60">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual */}
            <div className="relative flex items-center justify-center">
              <div className="w-full max-w-sm aspect-square rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl flex items-center justify-center shadow-xl shadow-blue-500/5">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                    <Link2 className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-[18px] font-semibold text-white/80 mb-2">yourname.chain</p>
                  <p className="text-[13px] text-white/40">Your identity on the blockchain</p>
                </div>
              </div>
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 -z-10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  DOWNLOAD SECTION                                            */}
      {/* ============================================================ */}
      <section id="download" className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[400px] h-[400px] bg-blue-700 bottom-0 right-0" />

        <div className="max-w-[1180px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              Download
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              Get Superhero Wallet
            </h2>
            <p className="max-w-2xl mx-auto text-[15px] text-white/40 leading-relaxed">
              Choose the right option for your platform and use case.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Desktop Web */}
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 text-center transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.06]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white/90 mb-2">Desktop Web</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                To use Superhero on desktop web, you need the Superhero Wallet Chrome extension to sign transactions and manage your keys.
              </p>
              <a
                href="https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Get Chrome Extension
              </a>
            </div>

            {/* Mobile Browser */}
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 text-center transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.06]">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white/90 mb-2">Mobile Browser</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                To use Superhero on a mobile browser, you need the Superhero Wallet app installed on your device to handle transaction signing.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.superhero.cordova&pli=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Google Play
                </a>
                <a
                  href="https://apps.apple.com/bg/app/superhero-wallet/id1502786641"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  App Store
                </a>
              </div>
            </div>

            {/* All-in-One */}
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 text-center relative overflow-hidden transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.06]">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                Recommended
              </div>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white/90 mb-2">All-in-One App</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                For the most seamless experience, download the Superhero app which has a wallet built in — no extensions needed, everything in one place.
              </p>
              <Link
                to="/landing"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Get the Superhero App
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section id="faq" className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              <HelpCircle className="w-4 h-4 inline-block mr-1 -mt-0.5" />
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            <FaqItem
              question="What chains does Superhero Wallet support?"
              answer="Superhero Wallet supports Ethereum, Bitcoin, Dogecoin, BNB Chain, and æternity. You can manage all your assets across these chains from a single wallet interface."
            />
            <FaqItem
              question="Is Superhero Wallet self-custodial?"
              answer="Yes. Superhero Wallet is fully self-custodial. Your private keys are stored only on your device and never shared with anyone. You have complete control over your funds."
            />
            <FaqItem
              question="What are .chain names?"
              answer=".chain names are human-readable identifiers on the æternity blockchain that replace long wallet addresses. Instead of sharing a cryptographic hash, you can share a simple name like 'yourname.chain'. You can register them directly from the wallet."
            />
            <FaqItem
              question="How does the wallet connect to Superhero.com?"
              answer="Superhero Wallet connects to Superhero.com to let you participate in on-chain social media trends, trade attention tokens, tip creators, and interact with decentralized communities — all signed securely from your wallet."
            />
            <FaqItem
              question="Where can I download Superhero Wallet?"
              answer="Superhero Wallet is available on Google Play for Android, the App Store for iOS, and as a Chrome extension for desktop browsers. Visit superherowallet.com for direct download links."
            />
            <FaqItem
              question="Do I need the wallet to use Superhero.com?"
              answer="On desktop, you need the Chrome extension to sign transactions. On mobile, you need the wallet app. Alternatively, you can download the all-in-one Superhero app from the /landing page which has a wallet built in for a seamless experience."
            />
            <FaqItem
              question="Is Superhero Wallet free?"
              answer="Yes, Superhero Wallet is completely free to download and use. You only pay network fees (gas) when making on-chain transactions, which go to the blockchain miners/validators — not to us."
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BOTTOM CTA                                                  */}
      {/* ============================================================ */}
      <section className="relative py-20 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/[0.03] to-transparent" />
        <div className="max-w-[1180px] mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/95 mb-4">
            Take control of your crypto
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed mb-10">
            Download Superhero Wallet and manage all your assets in one secure, multichain wallet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href="https://play.google.com/store/apps/details?id=com.superhero.cordova&pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/25 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              Google Play
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://apps.apple.com/bg/app/superhero-wallet/id1502786641"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-500/25 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              App Store
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-blue-400/20 hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Globe className="w-4 h-4" />
              Chrome Extension
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <a
              href="https://superherowallet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] text-white/50 hover:text-white/80 transition-colors"
            >
              Visit superherowallet.com
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
