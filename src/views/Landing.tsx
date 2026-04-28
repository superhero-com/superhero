/* eslint-disable
  react/function-component-definition,
  react/no-unescaped-entities,
  max-len
*/
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, TrendingUp, Users, Fingerprint, Smartphone,
  MessageCircle, ArrowRight, Play, ChevronDown, Sparkles, Globe, BarChart3, Coins,
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
/*  Feature card component                                            */
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
    <div className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-1">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
            <Icon className="w-5 h-5 text-pink-400" />
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
/*  Main Product Page                                                 */
/* ------------------------------------------------------------------ */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#06060b] text-white overflow-x-hidden selection:bg-pink-500/30">

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background effects */}
        <div className="absolute inset-0">
          <FloatingOrb className="w-[600px] h-[600px] bg-pink-600 -top-40 -left-40" />
          <FloatingOrb className="w-[500px] h-[500px] bg-purple-600 top-1/3 -right-32" />
          <FloatingOrb className="w-[400px] h-[400px] bg-blue-600 bottom-0 left-1/3" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#06060b_70%)]" />
          {/* Grid pattern */}
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
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[12px] font-medium tracking-wide text-white/60 uppercase">
              New paradigm shift in attention markets
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6"
          >
            <span className="block text-white/95">Following trends</span>
            <span className="block bg-gradient-to-r from-blue-700 via-blue-500 to-purple-600 bg-clip-text text-transparent pb-4">
              just got a new meaning
            </span>
          </h1>

          {/* Sub */}
          <p
            className="max-w-2xl mx-auto text-lg md:text-xl text-white/40 leading-relaxed mb-10"
          >
            Superhero is the on-chain attention market where you can discover,
            trade, and govern the trends you believe in — before everyone else.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              to="/"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-pink-500/25"
            >
              Continue on Web
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#mobile"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5"
            >
              <Smartphone className="w-4 h-4" />
              Download on Mobile
            </a>
          </div>

          {/* Video placeholder */}
          <div
            className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm"
          >
            <div className="aspect-video flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 via-purple-600/10 to-blue-600/10" />
              <button
                type="button"
                className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/15 hover:border-white/30 group"
                aria-label="Play video"
              >
                <Play className="w-8 h-8 text-white/80 ml-1 group-hover:text-white transition-colors" />
              </button>
              <span className="absolute bottom-6 text-[13px] text-white/30 tracking-wide">
                Product video coming soon
              </span>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center animate-bounce">
            <ChevronDown className="w-5 h-5 text-white/20" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHAT IS SUPERHERO                                           */}
      {/* ============================================================ */}
      <section id="features" className="relative py-32">
        <div className="max-w-[1180px] mx-auto px-6">
          {/* Section header */}
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
              What is Superhero?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              A decentralized attention market
              <br />
              <span className="text-white/40">for social trends</span>
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              Where creators own their content, communities become tradable markets,
              and attention is priced in real time.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Shield}
              number="01"
              title="Own your content & identity"
              description="On-chain posts and Superhero Onchain ID give creators full ownership. Your content is immutable, your identity is yours."
            />
            <FeatureCard
              icon={TrendingUp}
              number="02"
              title="Tradable trend markets"
              description="Communities and hashtags become tradable via bonding curve tokens. Attention and conviction show up directly in the price."
            />
            <FeatureCard
              icon={BarChart3}
              number="03"
              title="Real-time attention pricing"
              description="Trend analytics surface trending tokens, hashtags, and communities as a real-time prediction layer over the social graph."
            />
            <FeatureCard
              icon={Coins}
              number="04"
              title="Rewards & referrals"
              description="The platform rewards participation through an affiliation system and ProtocolDAO token. Engage, refer, and earn."
            />
            <FeatureCard
              icon={MessageCircle}
              number="05"
              title="On-chain posts & tipping"
              description="Immutable content anchored to verifiable events. Tip creators directly — every interaction is transparent and permanent."
            />
            <FeatureCard
              icon={Users}
              number="06"
              title="On-chain identity"
              description="Wallet + chain names + X handle — all linked together. Your identity lives on-chain, not on a corporate server."
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section id="how-it-works" className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[500px] h-[500px] bg-purple-700 top-0 right-0" />

        <div className="max-w-[1180px] mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-purple-400/80 mb-3 block">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95">
              The attention economy,
              {' '}
              <span className="text-white/40">on chain</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 group hover:border-white/[0.1] transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-pink-400/80 font-mono">1</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-1">Post on chain</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Create immutable posts that anchor attention to verifiable events.
                    Content lives on the æternity blockchain — no one can delete it.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 group hover:border-white/[0.1] transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-400/80 font-mono">2</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-1">Trade trends</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Community and trend tokens are priced via an exponential bonding curve.
                    Buy into trends you believe in — early conviction is rewarded.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 group hover:border-white/[0.1] transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-400/80 font-mono">3</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-1">Track Trends</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Real-time analytics surface trending tokens, hashtags, and communities.
                    A prediction layer over the entire social graph.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 group hover:border-white/[0.1] transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-teal-400/80 font-mono">4</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-1">Govern & earn</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Participate in DAOs, vote on proposals, and earn rewards through
                    the affiliation system and ProtocolDAO token.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SUPERHERO ID                                                */}
      {/* ============================================================ */}
      <section id="identity" className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
                Superhero ID
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-6">
                Decentralized identity,
                <br />
                <span className="text-white/40">W3C standard</span>
              </h2>
              <p className="text-[15px] text-white/40 leading-relaxed mb-8">
                A decentralized DID that links your social accounts to your wallet.
                Your identity is verifiable, portable, and censorship-resistant —
                following the W3C standard for decentralized identifiers.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Fingerprint, label: 'W3C DID standard compliant' },
                  { icon: Globe, label: 'Links wallet, chain names, and X handle' },
                  { icon: Shield, label: 'Self-sovereign — you control your data' },
                ].map(({ icon: I, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/10 flex items-center justify-center">
                      <I className="w-4 h-4 text-blue-400/80" />
                    </div>
                    <span className="text-[14px] text-white/60">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual placeholder */}
            <div className="relative">
              <img
                src="/did-image.png"
                alt="Superhero ID visual mockup"
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hue-rotate-60"
              />
              {/* Decorative glow */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 -z-10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MOBILE APP                                                  */}
      {/* ============================================================ */}
      <section id="mobile" className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[400px] h-[400px] bg-pink-700 bottom-0 left-0" />

        <div className="max-w-[1180px] mx-auto px-6 relative z-10 text-center">
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
            Mobile App
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
            Seamless experience,
            <br />
            <span className="text-white/40">wallet built in</span>
          </h2>
          {/* App mockup placeholder */}
          <div className="max-w-sm mx-auto">
            <img
              src="/screen-1.png"
              alt="Superhero mobile app mockup"
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm"
            />
          </div>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed mb-12">
            The Superhero app comes with a built-in wallet so you can post, trade, tip,
            and govern — all without leaving the app. No extensions, no friction.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="https://apps.apple.com/us/app/superhero-web3-communities/id6758045846"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/[0.1] rounded-xl px-6 py-3.5 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5"
            >
              <Smartphone className="w-5 h-5 text-white/60" />
              <div className="text-left">
                <span className="block text-[11px] text-white/40 leading-none">Download on</span>
                <span className="block text-[14px] font-semibold text-white/90 leading-tight">App Store</span>
              </div>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.superhero.apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/[0.1] rounded-xl px-6 py-3.5 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5"
            >
              <Smartphone className="w-5 h-5 text-white/60" />
              <div className="text-left">
                <span className="block text-[11px] text-white/40 leading-none">Get it on</span>
                <span className="block text-[14px] font-semibold text-white/90 leading-tight">Google Play</span>
              </div>
            </a>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/*  BOTTOM CTA                                                  */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-600/[0.03] to-transparent" />
        <div className="max-w-[1180px] mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/95 mb-4">
            Ready to discover the next trend?
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed mb-10">
            Join the attention market. Trade conviction. Own your identity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold text-[15px] px-8 py-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-pink-500/25"
            >
              Launch App
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/whitepaper"
              className="inline-flex items-center gap-2 text-[14px] text-white/50 hover:text-white/80 transition-colors"
            >
              Read the Whitepaper
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
