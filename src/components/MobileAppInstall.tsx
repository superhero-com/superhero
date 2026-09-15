/**
 * The one "get the mobile app" surface, in two shells.
 *
 * `MobileAppCard` is the expandable card in the connect modal. It is built to
 * the same shape as the Superhero Wallet and AI agent cards beside it — icon
 * tile, title, subtitle, chevron, body under a divider — so it reads as one of
 * the ways in rather than a banner bolted to the bottom of the list.
 *
 * `MobileAppInstallDialog` puts that same body in a dialog. The floating
 * "Install app" affordance opens it instead of running a PWA install, because
 * the store build is the one we want people on. The PWA is not removed: it is
 * the secondary line at the bottom of the dialog.
 *
 * Both stores are always offered. Branching on the user agent was wrong twice
 * over: this renders on desktop, where the iOS check is false for everyone and
 * sent Mac users to Google Play; and someone on a phone may be installing for
 * a different device anyway.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';

import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';

/** The Superhero social app, not the wallet. */
export const APP_STORE_URL = 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.superhero.apps';

const ICON_TILE_BG = 'rgba(34,211,238,0.12)';

const Chevron = ({ rotated }: { rotated: boolean }) => (
  <div
    className="shrink-0 text-white/30 transition-transform duration-200"
    style={{ transform: rotated ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const AppIconTile = () => (
  <div
    className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
    style={{ background: ICON_TILE_BG }}
  >
    <Smartphone className="w-5 h-5 text-cyan-300" />
  </div>
);

/**
 * Both store links, side by side. Two lines each — the small "Download on" /
 * "Get it on" line above the store name — so the name itself never has to
 * carry a long localised sentence and get clipped.
 */
const StoreLinks = () => {
  const { t } = useTranslation();
  const stores = [
    {
      key: 'ios',
      href: APP_STORE_URL,
      caption: t('common.modals.onboarding.downloadOn', { defaultValue: 'Download on' }),
      name: 'App Store',
      label: t('common.modals.connectWallet.downloadAppStore'),
    },
    {
      key: 'android',
      href: PLAY_STORE_URL,
      caption: t('common.modals.onboarding.getItOn', { defaultValue: 'Get it on' }),
      name: 'Google Play',
      label: t('common.modals.connectWallet.downloadGooglePlay'),
    },
  ];

  return (
    <div className="flex gap-2">
      {stores.map((store) => (
        <a
          key={store.key}
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={store.label}
          className="flex-1 min-w-0 inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 transition-all hover:bg-white/[0.08] no-underline"
        >
          <Smartphone className="w-4 h-4 text-white/50 shrink-0" />
          <span className="text-left min-w-0">
            <span className="block text-[10px] text-white/40 leading-none">{store.caption}</span>
            <span className="block text-[11px] font-semibold text-white/80 leading-tight truncate">
              {store.name}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
};

/**
 * The body shared by the card and the dialog: the section label, both store
 * links, and whatever secondary action the caller wants under them.
 */
const MobileAppBody = ({ secondary }: { secondary?: React.ReactNode }) => {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-semibold">
        {t('common.views.landing.pwaInstall.getMobileApp', { defaultValue: 'Get the mobile app' })}
      </p>
      <StoreLinks />
      {secondary}
    </>
  );
};

/**
 * Expandable card for the connect modal. Collapsed by default like the wallet
 * and agent cards, so the list stays scannable.
 */
export const MobileAppCard = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden transition-all duration-200"
      style={{ background: expanded ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.03)' }}
    >
      <button
        type="button"
        data-testid="mobile-app-option"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="relative flex items-center gap-4 w-full p-4 text-left border-0 transition-all duration-200 cursor-pointer hover:bg-white/[0.03]"
        style={{ outline: 'none', background: 'transparent' }}
      >
        <AppIconTile />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-white text-sm">
            {t('common.modals.onboarding.mobileAppTitle', { defaultValue: 'Download the mobile app' })}
          </span>
          <p className="text-xs text-white/50 mt-0.5">
            {t('common.modals.onboarding.mobileAppDesc', {
              defaultValue: 'The smoothest way to use Superhero, and the safer place for chat.',
            })}
          </p>
        </div>
        <Chevron rotated={expanded} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-4 border-t border-white/[0.06]">
          <MobileAppBody />
        </div>
      )}
    </div>
  );
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Secondary path: install the web app. Omitted where there is nothing to
   * offer — no captured install prompt and no hand-written iOS instructions —
   * rather than showing a button that does nothing.
   */
  onInstallWebApp?: () => void;
};

/**
 * The same body as the card, in a dialog. This is what the floating
 * "Install app" button opens.
 */
export const MobileAppInstallDialog = ({ open, onOpenChange, onInstallWebApp }: DialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden rounded-2xl border border-white/10"
        style={{ background: '#0f0f1a' }}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <AppIconTile />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold text-white">
              {t('common.modals.onboarding.mobileAppTitle', { defaultValue: 'Download the mobile app' })}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 mt-0.5">
              {t('common.modals.onboarding.mobileAppDesc', {
                defaultValue: 'The smoothest way to use Superhero, and the safer place for chat.',
              })}
            </DialogDescription>
          </div>
        </div>

        <div className="px-5 pb-5">
          <MobileAppBody
            secondary={onInstallWebApp ? (
              <button
                type="button"
                onClick={onInstallWebApp}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
              >
                {t('common.views.landing.pwaInstall.installWebAppInstead', {
                  defaultValue: 'Install the web app instead',
                })}
              </button>
            ) : undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileAppCard;
