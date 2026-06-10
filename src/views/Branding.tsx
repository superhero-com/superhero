/* eslint-disable max-len, react/no-unescaped-entities */
import React, { useState } from 'react';
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

  const downloadPredefinedBanner = (type: 'landscape' | 'vertical') => {
    let svgContent = '';
    const filename = `superhero-brand-banner-${type}.svg`;

    if (type === 'landscape') {
      svgContent = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a0f"/>
  <circle cx="250" cy="150" r="300" fill="#ff6b6b" opacity="0.2" filter="blur(100px)"/>
  <circle cx="950" cy="480" r="300" fill="#00ff9d" opacity="0.18" filter="blur(100px)"/>
  <circle cx="600" cy="315" r="200" fill="#45b7d1" opacity="0.12" filter="blur(80px)"/>
  <path d="M0 100 L1200 100" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M0 315 L1200 315" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
  <path d="M0 530 L1200 530" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M300 0 L300 630" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M600 0 L600 630" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
  <path d="M900 0 L900 630" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <g transform="translate(520, 160) scale(4)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M0.105957 10.1933L11.0668 0.294678H30.5399L41.5008 10.1933L20.8617 29.6529L0.105957 10.1933ZM12.2912 3.33174H18.2381L30.948 15.8737L20.8034 25.4348L4.65355 10.2495L12.2912 3.33174Z" fill="#1161FE"/>
  </g>
  <text x="600" y="420" font-family="'Inter', sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">SUPERHERO</text>
  <text x="600" y="465" font-family="'Inter', sans-serif" font-size="20" font-weight="500" fill="#00ff9d" text-anchor="middle" letter-spacing="8">DECENTRALIZED SOCIAL PROTOCOL</text>
</svg>`;
    } else {
      svgContent = `<svg width="400" height="800" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="800" fill="#0a0a0f"/>
  <circle cx="200" cy="150" r="200" fill="#ff6b6b" opacity="0.2" filter="blur(80px)"/>
  <circle cx="200" cy="650" r="200" fill="#00ff9d" opacity="0.18" filter="blur(80px)"/>
  <path d="M0 200 L400 200" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M0 400 L400 400" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
  <path d="M0 600 L400 600" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M100 0 L100 800" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="M200 0 L200 800" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
  <path d="M300 0 L300 800" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <g transform="translate(136, 260) scale(3)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M0.105957 10.1933L11.0668 0.294678H30.5399L41.5008 10.1933L20.8617 29.6529L0.105957 10.1933ZM12.2912 3.33174H18.2381L30.948 15.8737L20.8034 25.4348L4.65355 10.2495L12.2912 3.33174Z" fill="#1161FE"/>
  </g>
  <text x="200" y="480" font-family="'Inter', sans-serif" font-size="40" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">SUPERHERO</text>
  <text x="200" y="520" font-family="'Inter', sans-serif" font-size="14" font-weight="500" fill="#00ff9d" text-anchor="middle" letter-spacing="4">Web3 Attention Market</text>
</svg>`;
    }

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
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
            ← Back
          </AeButton>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-md text-white mb-8 shadow-glass animate-fadeInUp">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-32 h-32 text-neon-teal" />
          </div>
          <div className="text-sm font-extrabold uppercase tracking-widest text-neon-teal mb-1">Superhero Brand Kit</div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3">
            Brand Identity Guidelines
          </h1>
          <p className="text-[15px] md:text-lg opacity-80 max-w-[800px] leading-relaxed">
            Welcome to the official Superhero resource hub. This guide details our brand colors, typography, logos, and digital asset templates to help you construct material.
          </p>
        </div>

        {/* Brand Colors */}
        <section className="mb-10 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-neon-teal/10 rounded-lg border border-neon-teal/20">
              <Sparkles className="w-5 h-5 text-neon-teal" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Brand Color Palette</h2>
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
                      title="Copy HEX Code"
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
            <h2 className="text-2xl font-bold tracking-tight text-white">Typography System</h2>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-bold text-neon-blue uppercase tracking-widest mb-1">Primary Typeface</div>
                <div className="text-4xl md:text-5xl font-black mb-3">Inter</div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  Inter is an open-source, modern type family carefully crafted for high readability on screens.
                </p>
                <div className="font-mono text-xs text-white/50 p-3 bg-black/20 rounded-lg border border-white/5">
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest block mb-1">Heading Style</span>
                    <span className="text-2xl font-extrabold text-white">Attention Markets</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest block mb-1">Body Text</span>
                    <span className="text-sm text-white/70">Follow Trends on-chain on a decentralized network.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-semibold">Regular</span>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-bold">Semibold</span>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-xs font-black">Black</span>
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
            <h2 className="text-2xl font-bold tracking-tight text-white">Logos and Iconography</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full Logo Card */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="h-44 flex items-center justify-center p-6 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                <img
                  src="/full-logo.svg"
                  alt="Superhero Full Logo"
                  className="max-h-12 w-auto object-contain z-10 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">Full Logo (SVG)</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  Our main combination logo featuring the Superhero brand name alongside the signature blue power shield icon.
                </p>
                <AeButton
                  onClick={() => downloadFile('/full-logo.svg', 'superhero-full-logo.svg')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download SVG
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
                <h3 className="font-bold text-lg mb-1">Small Logo / Favicon</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  The minimalistic geometric shield icon. Highly identifiable at small scales, ideal for browser tabs, app icons, and avatar frames.
                </p>
                <AeButton
                  onClick={() => downloadSvgElementById('favicon-brand-download', 'superhero-favicon.svg')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download SVG
                </AeButton>
              </div>
            </div>

            {/* Square PNG Logo */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="h-44 flex items-center justify-center p-6 bg-slate-950 border-b border-white/10 relative overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Superhero Square Logo"
                  className="w-16 h-16 rounded-2xl object-cover z-10 transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder if not found
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%231161FE" rx="16"/><text x="32" y="38" font-family="sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">S</text></svg>';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">Square Brand Logo</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  High quality PNG representation of the square logo emblem. Optimal for social profile images, directories, and standard app stores.
                </p>
                <AeButton
                  onClick={() => downloadFile('/logo.png', 'superhero-square-logo.png')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download PNG
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
            <h2 className="text-2xl font-bold tracking-tight text-white">Digital Banners & Assets</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OG Social Banner */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="relative aspect-[16/9] bg-slate-950 border-b border-white/10 overflow-hidden flex items-center justify-center">
                <img
                  src="/og-default.png"
                  alt="Superhero OG Social Banner"
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
                <h3 className="font-bold text-lg mb-1">Standard OG Social Banner</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  The default sharing metadata card for Twitter, Telegram, Discord, or Facebook.
                </p>
                <AeButton
                  onClick={() => downloadFile('/og-default.png', 'superhero-og-banner.png')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download PNG
                </AeButton>
              </div>
            </div>

            {/* Custom Pre-Designed Landscape Banner */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="relative aspect-[16/9] bg-[#0a0a0f] border-b border-white/10 overflow-hidden flex flex-col justify-center items-center p-4">
                {/* Simulated CSS Gradient & Logo Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/10 via-neon-teal/10 to-neon-blue/10 pointer-events-none" />
                <div className="w-10 h-10 mb-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <FaviconIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-xl font-black tracking-widest text-white">SUPERHERO</div>
                <div className="text-[10px] text-neon-teal font-semibold tracking-wider uppercase mt-1">THE SOCIAL + CRYPTO PROTOCOL</div>
                <div className="absolute bottom-2 left-4 text-xs text-white/50 uppercase tracking-widest font-mono">Vector SVG Template</div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">Vector Brand Banner</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  Scalable banner vector file (.svg) for headers.
                </p>
                <AeButton
                  onClick={() => downloadPredefinedBanner('landscape')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download Scalable SVG
                </AeButton>
              </div>
            </div>

            {/* Interface Screenshot Showcase */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="relative aspect-[16/9] bg-slate-950 border-b border-white/10 overflow-hidden flex items-center justify-center">
                <img
                  src="/screen-1.png"
                  alt="Superhero Interface Showcase"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <span className="text-xs text-white/50 uppercase tracking-widest font-mono">App Interface Preview</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">App Showcase Screenshot</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  App screenshot highlighting interface layout, trending topics, feeds, and cryptocurrency components.
                </p>
                <AeButton
                  onClick={() => downloadFile('/screen-1.png', 'superhero-interface-screenshot.png')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download PNG
                </AeButton>
              </div>
            </div>

            {/* Custom Pre-Designed Vertical Banner */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group">
              <div className="relative aspect-[16/9] bg-[#0a0a0f] border-b border-white/10 overflow-hidden flex flex-col justify-center items-center p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/10 to-neon-teal/10 pointer-events-none" />
                <div className="w-8 h-8 mb-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <FaviconIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-lg font-black tracking-widest text-white">SUPERHERO</div>
                <div className="text-[8px] text-neon-teal font-semibold tracking-wider uppercase mt-1">Follow Trends</div>
                <div className="absolute bottom-2 left-4 text-xs text-white/50 uppercase tracking-widest font-mono">Vector SVG Template (Tall)</div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1">Tall Vector Mobile Banner</h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed flex-1">
                  Vertical banner vector file (.svg) for smartphone screens.
                </p>
                <AeButton
                  onClick={() => downloadPredefinedBanner('vertical')}
                  className="w-full justify-center"
                  variant="success"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {' '}
                  Download Scalable SVG
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
            <h2 className="text-2xl font-bold tracking-tight text-white">Custom Icons</h2>
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
                  title={`Download ${name} Icon`}
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
