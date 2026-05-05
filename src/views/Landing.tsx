/* eslint-disable
  react/function-component-definition,
  react/no-unescaped-entities,
  max-len
*/
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, TrendingUp, Users, Fingerprint, Smartphone,
  MessageCircle, ArrowRight, ChevronDown, Sparkles, Globe, BarChart3, Coins,
  Hash, Brain, Palette, Handshake, Bot, Zap, ChevronRight,
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
/*  Audience card component                                           */
/* ------------------------------------------------------------------ */
function AudienceCard({
  icon: Icon,
  title,
  description,
  color = 'pink',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color?: 'pink' | 'blue' | 'purple' | 'green';
}) {
  const colorMap = {
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
  };
  return (
    <div className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-1">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} border mb-4`}>
        <Icon className={`w-5 h-5 ${colorMap[color].split(' ').pop()}`} />
      </div>
      <h3 className="text-[15px] font-semibold text-white/90 mb-2">{title}</h3>
      <p className="text-[13px] text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ item component                                                */
/* ------------------------------------------------------------------ */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-white/[0.06] py-6">
      <h3 className="text-[15px] font-semibold text-white/90 mb-2">{question}</h3>
      <p className="text-[14px] text-white/50 leading-relaxed">{answer}</p>
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
            className="max-w-2xl mx-auto text-lg md:text-xl text-white/40 leading-relaxed mb-6"
          >
            Create and participate in
            {' '}
            <span className="text-white/70 font-medium">#tokens</span>
            {' '}
            — shared signals around hashtags, ideas, memes, narratives, and emerging cultural moments.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
          >

            <a
              href="#mobile"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              Download on Mobile
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://github.com/superhero-com/superhero-agent-skill"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Sparkles className="w-4 h-4" />
              Openclaw or Claude
              {' '}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              to="/"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-pink-500/25 min-w-64 justify-center"
            >
              Continue on Web
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

          </div>

          {/* Video */}
          <div
            className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm"
          >
            <div className="aspect-video bg-gradient-to-br from-pink-600/10 via-purple-600/10 to-blue-600/10">
              <video
                className="w-full h-full object-cover"
                src="/superhero-video.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center">
            <ChevronDown className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHAT IS A #TOKEN                                            */}
      {/* ============================================================ */}
      <section id="features" className="relative py-32">
        <div className="max-w-[1180px] mx-auto px-6">
          {/* Section header */}
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
              What is a #token?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              A shared coordination primitive
              <br />
              <span className="text-white/40">around a signal</span>
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              Each #token becomes a live space where attention gathers — open-ended signals
              that evolve with the internet and enable ongoing participation.
            </p>
          </div>

          {/* Token types grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Hash}
              number="01"
              title="Hashtags & ideas"
              description="Turn #AI, #BTC, #SF, or any idea into a live coordination space. Hashtags become more than labels — they become communities."
            />
            <FeatureCard
              icon={TrendingUp}
              number="02"
              title="Emerging narratives"
              description="Surface signals early, before they're saturated. Track what's gaining attention in real time across the network."
            />
            <FeatureCard
              icon={MessageCircle}
              number="03"
              title="Memes & cultural moments"
              description="Capture cultural moments as they happen. A meme, a movement, a moment — all can become a #token."
            />
            <FeatureCard
              icon={Users}
              number="04"
              title="Communities & niches"
              description="Every #token can evolve into a conversation, community, or movement. Coordinate with others around shared focus."
            />
            <FeatureCard
              icon={BarChart3}
              number="05"
              title="Visible attention"
              description="Attention is made visible and participatory, not hidden in algorithmic feeds. See what the internet is actually caring about."
            />
            <FeatureCard
              icon={Coins}
              number="06"
              title="Rewards & referrals"
              description="The platform rewards participation through an affiliation system and ProtocolDAO token. Engage, refer, and earn."
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHY SUPERHERO — COMPARISON                                  */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              Why Superhero?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              The internet runs on attention —
              <br />
              <span className="text-white/40">it should be yours to see</span>
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              Today, attention is fragmented, opaque, and controlled by algorithms.
              Superhero makes it visible, participatory, and community-driven.
            </p>
          </div>

          {/* Comparison table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {/* Traditional */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8">
              <h3 className="text-[13px] font-semibold tracking-wider uppercase text-white/30 mb-6">Traditional social media</h3>
              <ul className="space-y-4">
                {[
                  'Scroll feeds passively',
                  'Algorithm decides relevance',
                  'Attention is extracted',
                  'Guess what matters',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-white/40">
                    <span className="mt-0.5 w-4 h-4 rounded-full border border-white/[0.12] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Superhero */}
            <div className="bg-gradient-to-br from-blue-500/[0.07] to-purple-500/[0.07] border border-blue-500/20 rounded-2xl p-8">
              <h3 className="text-[13px] font-semibold tracking-wider uppercase text-blue-400/80 mb-6">Superhero</h3>
              <ul className="space-y-4">
                {[
                  'Signals are user-created',
                  'Attention is visible',
                  'Participation is intentional',
                  'Communities form around shared focus',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-white/70">
                    <Zap className="mt-0.5 w-4 h-4 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <FloatingOrb className="w-[500px] h-[500px] bg-blue-700 top-0 right-0 opacity-10" />
        <div className="max-w-[1180px] mx-auto px-6 relative z-10">
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              Four steps to a signal
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                icon: Hash,
                title: 'Create a #token',
                body: 'Pick a signal — a hashtag, idea, or narrative — and make it discoverable for the network.',
              },
              {
                step: '02',
                icon: BarChart3,
                title: 'Participate',
                body: 'Engage with #tokens you care about and follow how attention develops in real time.',
              },
              {
                step: '03',
                icon: MessageCircle,
                title: 'Contribute',
                body: 'Share, discuss, and bring others into the signal. Every post and tip is on-chain.',
              },
              {
                step: '04',
                icon: Users,
                title: 'Coordinate',
                body: 'Communities form naturally around shared focus — no opaque algorithm required.',
              },
            ].map(({
              step, icon: Icon, title, body,
            }) => (
              <div key={step} className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1">
                <span className="text-[10px] font-mono text-white/20 tracking-wider mb-4 block">{step}</span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-[15px] font-semibold text-white/90 mb-2">{title}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHO IT'S FOR                                                */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
              Who it's for
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              Built for anyone who shapes
              <br />
              <span className="text-white/40">what the internet cares about</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AudienceCard
              icon={Brain}
              color="blue"
              title="Researchers & analysts"
              description="Track emerging narratives and cultural signals early — before they reach mainstream feeds."
            />
            <AudienceCard
              icon={Palette}
              color="pink"
              title="Creators"
              description="Launch and grow communities around your ideas or content. Your audience, your signal."
            />
            <AudienceCard
              icon={Handshake}
              color="purple"
              title="Communities"
              description="Coordinate around shared beliefs, interests, or goals with transparent, on-chain primitives."
            />
            <AudienceCard
              icon={Bot}
              color="green"
              title="Agents"
              description="Monitor and interact with real-time attention flows. #tokens are machine-readable coordination layers."
            />
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
              <p className="text-[15px] text-white/40 leading-relaxed">
                A decentralized DID that links your social accounts to your wallet.
                Your identity is verifiable, portable, and censorship-resistant —
                following the W3C standard for decentralized identifiers.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-5 mt-3">

                <Link
                  to="/whitepaper"
                  className="inline-flex items-center gap-2 text-[14px] text-white/50 hover:text-white/80 transition-colors"
                >
                  Read the Whitepaper
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
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
      <section id="mobile" className="relative py-20 border-t border-white/[0.04]">
        <FloatingOrb className="w-[400px] h-[400px] bg-pink-700 bottom-0 left-0" />

        <div className="max-w-[1180px] mx-auto px-6 relative z-10 text-center">
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
            Mobile App
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-12">
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
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed my-12">
            The Superhero app comes with a built-in wallet so you can post, trade, tip,
            and govern — all without leaving the app. No extensions, no friction.
          </p>

          <div className="flex flex-row items-center justify-center gap-4 mb-16">
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
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
                FAQ
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
                Common questions
              </h2>
              <p className="text-[15px] text-white/40 leading-relaxed">
                The deeper idea: the internet is a network of signals.
                Superhero turns those signals into shared coordination layers —
                visible, interactive, and collective.
              </p>
            </div>
            <div>
              <FaqItem
                question="What is a #token really?"
                answer="A #token is a shared signal space that people can gather around — combining conversation, visibility, and participation around a hashtag, idea, or cultural moment."
              />
              <FaqItem
                question="Is this about trading?"
                answer="Superhero focuses on participation, discovery, and coordination around signals. Different forms of interaction may exist, but the core is engagement with ideas and communities."
              />
              <FaqItem
                question="Why does this matter?"
                answer="Because attention shapes culture, technology, and the future — and it should be visible and participatory, not controlled by opaque systems."
              />
              <FaqItem
                question="Who controls what matters?"
                answer="No single entity. Signals emerge from collective participation — not from an algorithm optimizing for engagement."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BOTTOM CTA                                                  */}
      {/* ============================================================ */}
      <section className="relative py-20 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-600/[0.03] to-transparent" />
        <div className="max-w-[1180px] mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/95 mb-4">
            Don't just consume the internet.
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Participate in what shapes it.
            </span>
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed mb-10">
            Create a #token. Join a signal. Build something that matters.
          </p>
          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
          >

            <a
              href="#mobile"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Smartphone className="w-4 h-4" />
              Download on Mobile
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://github.com/superhero-com/superhero-agent-skill"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Sparkles className="w-4 h-4" />
              Openclaw or Claude
              {' '}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              to="/"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-pink-500/25 min-w-64 justify-center"
            >
              Continue on Web
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
