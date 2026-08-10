import React, {
  useEffect, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { isIOSWebKit, isMobileDevice, isStandalone } from '@/utils/displayMode';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

/**
 * PwaInstallGuide
 *
 * A step-by-step animated installation guide for mobile users (iOS and Android).
 * Designed to complement the existing PwaInstallPrompt:
 * - PwaInstallPrompt handles Chromium's native `beforeinstallprompt` (desktop + Android Chrome).
 * - PwaInstallGuide handles the manual flow for iOS Safari and cases where
 *   the native prompt isn't available but the user should still be guided.
 *
 * Use the `usePwaInstallGuide` hook to trigger it from anywhere in the app,
 * or render <PwaInstallGuide open={...} onOpenChange={...} /> directly.
 *
 * Trigger locations in this PR:
 * - Chat → Location tab: when an iOS user tries to enable location sharing
 *   without the PWA installed (geolocation is blocked in mobile Safari's
 *   in-browser context but works in standalone mode).
 * - Standalone "Install App" FAB shown on mobile when not yet installed.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type InstallPlatform = 'ios' | 'android' | 'desktop';

interface InstallStep {
  /** Short action label */
  title: string;
  /** Longer description shown when step is active */
  description: string;
  /** SVG icon element */
  icon: React.ReactNode;
}

interface PwaInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context that drove the user here, shown as a banner above the steps */
  trigger?: 'location' | 'chat' | 'general';
}

// ── Icons (inline SVG — no extra icon dep) ────────────────────────────────────

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 2v9M9 2L6 5M9 2l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11v4a1 1 0 001 1h10a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PlusSquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M4 9l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2 8l7-6 7 6v8a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 17V11h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MenuDotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="4" r="1.2" fill="currentColor" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="9" cy="14" r="1.2" fill="currentColor" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 2v9M9 11l-3-3M9 11l3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 14h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ── Step definitions ──────────────────────────────────────────────────────────

function getSteps(platform: InstallPlatform, t: ReturnType<typeof useTranslation>['t']): InstallStep[] {
  if (platform === 'ios') {
    return [
      {
        title: t('components.pwaInstallGuide.ios.step1.title'),
        description: t('components.pwaInstallGuide.ios.step1.description'),
        icon: <ShareIcon />,
      },
      {
        title: t('components.pwaInstallGuide.ios.step2.title'),
        description: t('components.pwaInstallGuide.ios.step2.description'),
        icon: <PlusSquareIcon />,
      },
      {
        title: t('components.pwaInstallGuide.ios.step3.title'),
        description: t('components.pwaInstallGuide.ios.step3.description'),
        icon: <CheckIcon />,
      },
      {
        title: t('components.pwaInstallGuide.ios.step4.title'),
        description: t('components.pwaInstallGuide.ios.step4.description'),
        icon: <HomeIcon />,
      },
    ];
  }

  // Android
  return [
    {
      title: t('components.pwaInstallGuide.android.step1.title'),
      description: t('components.pwaInstallGuide.android.step1.description'),
      icon: <MenuDotsIcon />,
    },
    {
      title: t('components.pwaInstallGuide.android.step2.title'),
      description: t('components.pwaInstallGuide.android.step2.description'),
      icon: <DownloadIcon />,
    },
    {
      title: t('components.pwaInstallGuide.android.step3.title'),
      description: t('components.pwaInstallGuide.android.step3.description'),
      icon: <CheckIcon />,
    },
    {
      title: t('components.pwaInstallGuide.android.step4.title'),
      description: t('components.pwaInstallGuide.android.step4.description'),
      icon: <HomeIcon />,
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PwaInstallGuide({ open, onOpenChange, trigger = 'general' }: PwaInstallGuideProps) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  const platform: InstallPlatform = isIOSWebKit() ? 'ios' : isMobileDevice() ? 'android' : 'desktop';
  const alreadyInstalled = isStandalone();

  // Reset step when dialog reopens
  useEffect(() => {
    if (open) setActiveStep(0);
  }, [open]);

  const steps = getSteps(platform, t);

  // Desktop — just show a short note (they should use PwaInstallPrompt instead)
  if (platform === 'desktop' || alreadyInstalled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('components.pwaInstallGuide.installedTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60 leading-relaxed">
            {alreadyInstalled
              ? t('components.pwaInstallGuide.alreadyInstalled')
              : t('components.pwaInstallGuide.desktopHint')}
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const triggerBanner = trigger === 'location'
    ? t('components.pwaInstallGuide.triggerLocation')
    : trigger === 'chat'
      ? t('components.pwaInstallGuide.triggerChat')
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden rounded-2xl border border-white/10"
        style={{ background: '#0f0f1a' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <DialogTitle className="text-base font-bold">
              {t('components.pwaInstallGuide.title')}
            </DialogTitle>
            <p className="text-xs text-white/50 mt-0.5">
              {platform === 'ios'
                ? t('components.pwaInstallGuide.subtitleIos')
                : t('components.pwaInstallGuide.subtitleAndroid')}
            </p>
          </div>
        </div>

        {/* Trigger context banner */}
        {triggerBanner && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            {triggerBanner}
          </div>
        )}

        {/* Steps */}
        <div className="px-5 pb-2 flex flex-col gap-2">
          {steps.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveStep(i)}
                className="flex items-start gap-3 text-left w-full rounded-xl px-3 py-3 transition-all duration-200"
                style={{
                  background: active
                    ? 'rgba(17,97,254,0.1)'
                    : done ? 'rgba(0,196,125,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? 'rgba(17,97,254,0.3)' : done ? 'rgba(0,196,125,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  transform: active ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                {/* Step circle */}
                <div
                  className="flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: done
                      ? 'rgba(0,196,125,0.15)'
                      : active ? 'rgba(17,97,254,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${done ? '#00c47d' : active ? '#1161FE' : 'rgba(255,255,255,0.1)'}`,
                    color: done ? '#00c47d' : active ? '#1161FE' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {done ? <CheckIcon /> : step.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: active ? 'white' : done ? '#00c47d' : 'rgba(255,255,255,0.5)' }}
                  >
                    {step.title}
                  </div>
                  {/* Expand description only on active step */}
                  <div
                    className="text-xs leading-relaxed overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: active ? 60 : 0,
                      opacity: active ? 1 : 0,
                      color: 'rgba(255,255,255,0.5)',
                      marginTop: active ? 2 : 0,
                    }}
                  >
                    {step.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveStep(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeStep ? 20 : 6,
                height: 6,
                background: i <= activeStep ? '#1161FE' : 'rgba(255,255,255,0.12)',
              }}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 px-5 pb-5">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => setActiveStep(activeStep - 1)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {t('components.pwaInstallGuide.back')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (activeStep < steps.length - 1) {
                setActiveStep(activeStep + 1);
              } else {
                onOpenChange(false);
              }
            }}
            className="flex-[2] rounded-xl py-3 text-sm font-bold text-white transition-all"
            style={{
              background: activeStep === steps.length - 1
                ? 'linear-gradient(135deg, #1161FE, #8b5cf6)'
                : '#1161FE',
              boxShadow: '0 0 20px rgba(17,97,254,0.3)',
            }}
          >
            {activeStep === steps.length - 1
              ? t('components.pwaInstallGuide.done')
              : t('components.pwaInstallGuide.next')}
          </button>
        </div>

        {/* iOS Safari note */}
        {platform === 'ios' && (
          <p className="text-center text-xs text-white/30 pb-4 px-5">
            {t('components.pwaInstallGuide.iosSafariNote')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Install FAB ───────────────────────────────────────────────────────────────

/**
 * Floating pill button that appears on mobile when the app is not yet installed.
 * Triggers the PwaInstallGuide on iOS/Android-without-prompt, or the native
 * Chromium prompt on Android Chrome (via the provided callback).
 */
interface PwaInstallFabProps {
  /** Call the native Chromium install prompt (from usePwaInstall) if available */
  onNativePrompt?: () => Promise<boolean>;
  /** Open the manual guide sheet */
  onOpenGuide: () => void;
  /** Whether the native Chromium prompt is available */
  canNativePrompt: boolean;
}

export function PwaInstallFab({ onNativePrompt, onOpenGuide, canNativePrompt }: PwaInstallFabProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(false);

  const isInstalled = isStandalone();
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (isInstalled || !isMobile) return;

    // Delay appearance so it doesn't clash with page load
    const showTimer = setTimeout(() => setVisible(true), 2500);

    // Periodic pulse to catch attention
    const pulseInterval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    }, 9000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(pulseInterval);
    };
  }, [isInstalled, isMobile]);

  if (!visible || isInstalled) return null;

  const handleClick = async () => {
    if (canNativePrompt && onNativePrompt) {
      const accepted = await onNativePrompt();
      if (accepted) return;
    }
    onOpenGuide();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('components.pwaInstallGuide.fabLabel')}
      className="fixed z-50 flex items-center gap-2 rounded-full text-white font-bold text-sm transition-all"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        right: 16,
        height: 44,
        padding: '0 18px 0 14px',
        background: 'linear-gradient(135deg, #1161FE, #8b5cf6)',
        boxShadow: pulse
          ? '0 0 0 6px rgba(17,97,254,0.25), 0 4px 20px rgba(17,97,254,0.5)'
          : '0 4px 20px rgba(17,97,254,0.4)',
        transform: pulse ? 'scale(1.05)' : 'scale(1)',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        animation: 'pwa-fab-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    >
      {/* Download arrow icon */}
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 2v10M9 12l-4-4M9 12l4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 15h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {t('components.pwaInstallGuide.fabLabel')}
      <style>{`
        @keyframes pwa-fab-in {
          from { opacity: 0; transform: translateY(12px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </button>
  );
}
