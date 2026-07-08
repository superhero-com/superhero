/* eslint-disable
  react/function-component-definition,
  react/no-unescaped-entities,
  max-len
*/
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Shield, TrendingUp, Users, Fingerprint, Smartphone,
  MessageCircle, ArrowRight, ChevronDown, Sparkles, Globe, BarChart3, Coins,
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
  const { t } = useTranslation();
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
              {t('common.views.landing.heroBadge')}
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6"
          >
            <span className="block text-white/95">{t('common.views.landing.heroTitleLine1')}</span>
            <span className="block bg-gradient-to-r from-blue-700 via-blue-500 to-purple-600 bg-clip-text text-transparent pb-4">
              {t('common.views.landing.heroTitleLine2')}
            </span>
          </h1>

          {/* Sub */}
          <p
            className="max-w-2xl mx-auto text-lg md:text-xl text-white/40 leading-relaxed mb-10"
          >
            {t('common.views.landing.heroSubtitle')}
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
              {t('common.views.landing.downloadOnMobile')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://github.com/superhero-com/superhero-agent-skill"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Sparkles className="w-4 h-4" />
              {t('common.views.landing.openclawOrClaude')}
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
              {t('common.views.landing.continueOnWeb')}
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
      {/*  WHAT IS SUPERHERO                                           */}
      {/* ============================================================ */}
      <section id="features" className="relative py-32">
        <div className="max-w-[1180px] mx-auto px-6">
          {/* Section header */}
          <div className="max-w-2xl mb-16">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-pink-400/80 mb-3 block">
              {t('common.views.landing.whatIsEyebrow')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-4">
              {t('common.views.landing.whatIsTitleLine1')}
              <br />
              <span className="text-white/40">{t('common.views.landing.whatIsTitleLine2')}</span>
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              {t('common.views.landing.whatIsDescription')}
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Shield}
              number="01"
              title={t('common.views.landing.features.ownContent.title')}
              description={t('common.views.landing.features.ownContent.description')}
            />
            <FeatureCard
              icon={TrendingUp}
              number="02"
              title={t('common.views.landing.features.tradableMarkets.title')}
              description={t('common.views.landing.features.tradableMarkets.description')}
            />
            <FeatureCard
              icon={BarChart3}
              number="03"
              title={t('common.views.landing.features.attentionMarket.title')}
              description={t('common.views.landing.features.attentionMarket.description')}
            />
            <FeatureCard
              icon={Coins}
              number="04"
              title={t('common.views.landing.features.rewards.title')}
              description={t('common.views.landing.features.rewards.description')}
            />
            <FeatureCard
              icon={MessageCircle}
              number="05"
              title={t('common.views.landing.features.posts.title')}
              description={t('common.views.landing.features.posts.description')}
            />
            <FeatureCard
              icon={Users}
              number="06"
              title={t('common.views.landing.features.identity.title')}
              description={t('common.views.landing.features.identity.description')}
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SuperheroID                                                */}
      {/* ============================================================ */}
      <section id="identity" className="relative py-32 border-t border-white/[0.04]">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-blue-400/80 mb-3 block">
                SuperheroID
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-6">
                {t('common.views.landing.id.titleLine1')}
                <br />
                <span className="text-white/40">{t('common.views.landing.id.titleLine2')}</span>
              </h2>
              <p className="text-[15px] text-white/40 leading-relaxed">
                {t('common.views.landing.id.description')}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-5 mt-3">

                <Link
                  to="/whitepaper"
                  className="inline-flex items-center gap-2 text-[14px] text-white/50 hover:text-white/80 transition-colors"
                >
                  {t('common.views.landing.id.readWhitepaper')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Fingerprint, label: t('common.views.landing.id.point1') },
                  { icon: Globe, label: t('common.views.landing.id.point2') },
                  { icon: Shield, label: t('common.views.landing.id.point3') },
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
                alt={t('common.views.landing.id.imageAlt')}
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
            {t('common.views.landing.mobile.eyebrow')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/95 mb-12">
            {t('common.views.landing.mobile.titleLine1')}
            <br />
            <span className="text-white/40">{t('common.views.landing.mobile.titleLine2')}</span>
          </h2>
          {/* App mockup placeholder */}
          <div className="max-w-sm mx-auto">
            <img
              src="/screen-1.png"
              alt={t('common.views.landing.mobile.imageAlt')}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm"
            />
          </div>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed my-12">
            {t('common.views.landing.mobile.description')}
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
                <span className="block text-[11px] text-white/40 leading-none">{t('common.views.landing.mobile.appStorePre')}</span>
                <span className="block text-[14px] font-semibold text-white/90 leading-tight">{t('common.views.landing.mobile.appStore')}</span>
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
                <span className="block text-[11px] text-white/40 leading-none">{t('common.views.landing.mobile.googlePlayPre')}</span>
                <span className="block text-[14px] font-semibold text-white/90 leading-tight">{t('common.views.landing.mobile.googlePlay')}</span>
              </div>
            </a>
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
            {t('common.views.landing.bottomCta.title')}
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-white/40 leading-relaxed mb-10">
            {t('common.views.landing.bottomCta.subtitle')}
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
              {t('common.views.landing.downloadOnMobile')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://github.com/superhero-com/superhero-agent-skill"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium text-[15px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5 min-w-64 justify-center"
            >
              <Sparkles className="w-4 h-4" />
              {t('common.views.landing.openclawOrClaude')}
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
              {t('common.views.landing.continueOnWeb')}
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
