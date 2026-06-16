/* eslint-disable max-len, react/no-unescaped-entities */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AeButton } from '@/components/ui/ae-button';
import {
  Download, Copy, Check, Sparkles, Image as ImageIcon, Type, Award,
} from 'lucide-react';

// Custom icons import
import IconDiamond from '@/svg/iconDiamond.svg?react';
import IconWallet from '@/svg/iconWallet.svg?react';
import IconHashtag from '@/svg/iconHashtag.svg?react';
import IconFeed from '@/svg/iconFeed.svg?react';
import FaviconIcon from '@/svg/favicon.svg?react';
import FooterSection from '../components/layout/FooterSection';

const BRAND_COLORS = [
  {
    name: 'Primary Neon Teal',
    hex: '#00ff9d',
    rgb: '0, 255, 157',
    desc: 'The heart of our visual system. Used for core interactions, success states, and primary actions.',
  },
  {
    name: 'Neon Pink / Crimson',
    hex: '#ff6b6b',
    rgb: '255, 107, 107',
    desc: 'Vibrant highlight accent. Used for error states, destructive actions, and active gradients.',
  },
  {
    name: 'Neon Blue',
    hex: '#0f61fe',
    rgb: '15, 97, 254',
    desc: 'Fresh corporate balance. Used for sub-headings, secondary buttons, and informative components.',
  },
  {
    name: 'Background',
    hex: '#0a0a0f',
    rgb: '10, 10, 15',
    desc: 'Our deep dark-mode backdrop, optimized for high contrast with radiant cyberpunk neon hues.',
  },
];

const CUSTOM_ICONS = [
  { Component: IconDiamond, name: 'Diamond', id: 'svg-icon-diamond' },
  { Component: IconWallet, name: 'Wallet', id: 'svg-icon-wallet' },
  { Component: IconHashtag, name: 'Hashtag', id: 'svg-icon-hashtag' },
  { Component: IconFeed, name: 'Feed', id: 'svg-icon-feed' },
];

const Branding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedColor(hex);
      setTimeout(() => setCopiedColor(null), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download', err);
    }
  };

  const downloadSvgElementById = (id: string, filename: string) => {
    const svgEl = document.getElementById(id);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 text-white">
        {/* Navigation & Header */}
        <div className="mb-6">
          <AeButton
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            variant="ghost"
            size="sm"
            className="!border !border-solid !border-white/15 hover:!border-white/35"
          >
            ←
            {' '}
            {t('common.labels.back')}
          </AeButton>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-md text-white mb-8 shadow-glass animate-fadeInUp">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-32 h-32 text-neon-teal" />
          </div>
          <div className="text-sm font-extrabold uppercase tracking-widest text-neon-teal mb-1">{t('common.views.branding.brandKit')}</div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3">
            {t('common.views.branding.heroTitle')}
          </h1>
          <p className="text-[15px] md:text-lg opacity-80 max-w-[800px] leading-relaxed">
            {t('common.views.branding.heroDescription')}
          </p>
        </div>

        {/* Brand Colors */}
        <section className="mb-10 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-neon-teal/10 rounded-lg border border-neon-teal/20">
              <Sparkles className="w-5 h-5 text-neon-teal" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{t('common.views.branding.colorPaletteTitle')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BRAND_COLORS.map((color) => (
              <div key={color.name} className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-white/20 hover:scale-[1.015]">
                <div
                  className="h-24 w-full transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="p-4">
                  <h3 className="font-bold text-white text-base mb-1">{color.name}</h3>
                  <div className="flex items-center justify-between gap-1 mb-2 bg-black/20 px-2 py-1.5 rounded-lg border border-white/5">
                    <span className="font-mono text-xs text-white/80">{color.hex}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyHex(color.hex)}
                      className="text-white/60 hover:text-white transition-colors"
                      title={t('common.views.branding.copyHexCode')}
                    >
                      {copiedColor === color.hex ? (
                        <Check className="w-4 h-4 text-neon-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed min-h-[48px]">{color.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-10 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
              <Type className="w-5 h-5 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{t('common.views.branding.typographyTitle')}</h2>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-bold text-neon-blue uppercase tracking-widest mb-1">{t('common.views.branding.primaryTypeface')}</div>
                <div className="text-4xl md:text-5xl font-black mb-3">Inter</div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  {t('common.views.branding.interDescription')}
                </p>
                <div className="font-mono text-xs text-white/50 p-3 bg-black/20 rounded-lg border border-white/5">
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest block mb-1">{t('common.views.branding.headingStyle')}</span>
                    <span className="text-2xl font-extrabold text-white">{t('common.views.branding.headingSample')}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest block mb-1">{t('common.views.branding.bodyText')}</span>
                    <span className="text-sm text-white/70">{t('common.views.branding.bodySample')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-semibold">{t('common.views.branding.weightRegular')}</span>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-bold">{t('common.views.branding.weightSemibold')}</span>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-black">{t('common.views.branding.weightBlack')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logos */}
        <section className="mb-10 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-neon-pink/10 rounded-lg border border-neon-pink/20">
              <Award className="w-5 h-5 text-neon-pink" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{t('common.views.branding.logosTitle')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full Logo Card */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="h-44 flex items-center justify-center p-6 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                <img
                  src="/full-logo.svg"
                  alt={t('common.views.branding.fullLogoAlt')}
                  className="max-h-12 w-auto object-contain z-10 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{t('common.views.branding.fullLogoTitle')}</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  {t('common.views.branding.fullLogoDescription')}
                </p>
                <AeButton
                  onClick={() => downloadFile('/full-logo.svg', 'superhero-full-logo.svg')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  {t('common.views.branding.downloadSvg')}
                </AeButton>
              </div>
            </div>

            {/* Small Icon Favicon Card */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="h-44 flex items-center justify-center p-6 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                <div className="w-16 h-16 flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm z-10 transition-transform duration-300 group-hover:scale-105">
                  <FaviconIcon id="favicon-brand-download" className="w-full h-full text-blue-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-transparent pointer-events-none" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{t('common.views.branding.faviconTitle')}</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  {t('common.views.branding.faviconDescription')}
                </p>
                <AeButton
                  onClick={() => downloadSvgElementById('favicon-brand-download', 'superhero-favicon.svg')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  {t('common.views.branding.downloadSvg')}
                </AeButton>
              </div>
            </div>

            {/* Square PNG Logo */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="h-44 flex items-center justify-center p-6 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                <img
                  src="/logo.png"
                  alt={t('common.views.branding.squareLogoAlt')}
                  className="w-16 h-16 rounded-2xl object-cover z-10 transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder if not found
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%231161FE" rx="16"/><text x="32" y="38" font-family="sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">S</text></svg>';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{t('common.views.branding.squareLogoTitle')}</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  {t('common.views.branding.squareLogoDescription')}
                </p>
                <AeButton
                  onClick={() => downloadFile('/logo.png', 'superhero-square-logo.png')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  {t('common.views.branding.downloadPng')}
                </AeButton>
              </div>
            </div>
          </div>
        </section>

        {/* Digital Banners & Wallpapers */}
        <section className="mb-10 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-neon-yellow/10 rounded-lg border border-neon-yellow/20">
              <ImageIcon className="w-5 h-5 text-neon-yellow" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{t('common.views.branding.bannersTitle')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OG Social Banner */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="relative aspect-[16/9] bg-slate-950 border-b border-white/10 overflow-hidden flex items-center justify-center">
                <img
                  src="/og-default.png"
                  alt={t('common.views.branding.ogBannerAlt')}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <span className="text-xs text-white/50 uppercase tracking-widest font-mono">1200 x 630 px</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{t('common.views.branding.ogBannerTitle')}</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  {t('common.views.branding.ogBannerDescription')}
                </p>
                <AeButton
                  onClick={() => downloadFile('/og-default.png', 'superhero-og-banner.png')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  {t('common.views.branding.downloadPng')}
                </AeButton>
              </div>
            </div>

            {/* Interface Screenshot Showcase */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="relative aspect-[16/9] bg-slate-950 border-b border-white/10 overflow-hidden flex items-center justify-center">
                <img
                  src="/screen-1.png"
                  alt={t('common.views.branding.interfaceShowcaseAlt')}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <span className="text-xs text-white/50 uppercase tracking-widest font-mono">{t('common.views.branding.appInterfacePreview')}</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{t('common.views.branding.appShowcaseTitle')}</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  {t('common.views.branding.appShowcaseDescription')}
                </p>
                <AeButton
                  onClick={() => downloadFile('/screen-1.png', 'superhero-interface-screenshot.png')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  {t('common.views.branding.downloadPng')}
                </AeButton>
              </div>
            </div>

          </div>
        </section>

        {/* Brand Custom Icon Set */}
        <section className="mb-10 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-neon-pink/10 rounded-lg border border-neon-pink/20">
              <Award className="w-5 h-5 text-neon-pink" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{t('common.views.branding.customIconsTitle')}</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {CUSTOM_ICONS.map(({ Component, name, id }) => (
              <div key={name} className="flex flex-col items-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm group hover:border-white/20 transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center text-white/80 group-hover:text-neon-teal transition-colors mb-3">
                  <Component id={id} className="w-8 h-8" />
                </div>
                <div className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors text-center mb-3 truncate w-full">
                  {name}
                </div>
                <button
                  type="button"
                  onClick={() => downloadSvgElementById(id, `superhero-icon-${name.toLowerCase()}.svg`)}
                  className="p-1.5 rounded-lg bg-white/10 border border-white/20 hover:bg-neon-teal hover:text-black hover:border-neon-teal hover:scale-105 active:scale-100 transition-all duration-200"
                  title={t('common.views.branding.downloadIcon', { name })}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <FooterSection />
      </div>
    </>
  );
};

export default Branding;
