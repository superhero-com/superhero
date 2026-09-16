import React, {
  Suspense, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { AeButton } from '@/components/ui/ae-button';
import { useAeSdk, useWalletConnect } from '@/hooks';
import PasskeyConnectCard from '@/components/PasskeyConnectCard';
import AgentOnboardCard from '@/components/AgentOnboardCard';
import { isStandalone } from '@/utils/displayMode';
import chromeLogoUrl from '@/svg/brands/chrome-logo.svg';
import firefoxLogoUrl from '@/svg/brands/firefox-logo.svg';
import Favicon from '@/svg/favicon.svg?react';

/**
 * The one sign-in modal, on every surface.
 *
 * Three cards, same design in a browser tab and in the installed app: Passkey,
 * Superhero Wallet, AI agent. Only the wallet card's meaning changes with the
 * surface, and the change is the whole reason it changes:
 *
 *  - Web: CONNECT. The extension or the wallet app signs; this page never sees
 *    a secret. Expanding the card shows the connect button and where to get
 *    the extension / app, inside the card, under its own header.
 *  - Installed app (PWA): IMPORT. The connect handoff is a redirect out of the
 *    app that does not come back cleanly, so the app takes the seed phrase or
 *    private key directly and signs in-page. Tapping the card opens the import
 *    flow at the phrase field — no second choice screen in between.
 *
 * Both modals (`connect-wallet`, `onboarding`) render this; they were copies.
 */

// Lazy: bip39/argon2 must not enter the modal's chunk. Warmed on the first
// render of the PWA wallet card so the tap feels immediate.
const loadWalletOnboarding = () => import('@/features/wallet/components/WalletOnboarding');
const WalletOnboarding = React.lazy(loadWalletOnboarding);

type Props = {
  onClose: () => void;
  onConnected?: (address: string) => void;
};

const APP_LINKS = {
  appStore: 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846',
  playStore: 'https://play.google.com/store/apps/details?id=com.superhero.apps',
  walletIos: 'https://apps.apple.com/us/app/superhero-wallet/id1502786641',
  walletAndroid: 'https://play.google.com/store/apps/details?id=com.superhero.cordova',
} as const;

function getDeviceInfo() {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobi/i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);
  const isChromeFamily = (
    /Chrome\//i.test(ua) || /Chromium\//i.test(ua)
  ) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua);
  return {
    isAndroid, isIOS, isMobile, isFirefox, isChromeFamily,
  };
}

const WalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="2" y="7" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M2 12h24" stroke="currentColor" strokeWidth="2" />
    <circle cx="20" cy="18" r="2" fill="currentColor" />
  </svg>
);

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

const OnboardingModal = ({ onClose, onConnected }: Props) => {
  const { t } = useTranslation();
  const { connectWallet, connectingWallet } = useWalletConnect();
  const { activeAccount, addStaticAccount } = useAeSdk();
  const device = useMemo(() => getDeviceInfo(), []);
  // Read once: display mode does not change within the life of the modal, and a
  // card that swapped meaning mid-flow would move a control out from under the user.
  const [pwa] = useState(isStandalone);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const connectRequestedRef = useRef(false);
  const didAdvanceRef = useRef(false);

  useEffect(() => { if (pwa) loadWalletOnboarding().catch(() => {}); }, [pwa]);

  const advanceAfterConnect = useCallback((account: string) => {
    if (didAdvanceRef.current) return;
    didAdvanceRef.current = true;
    connectRequestedRef.current = false;
    onClose();
    onConnected?.(account);
  }, [onClose, onConnected]);

  useEffect(() => {
    if (!connectRequestedRef.current || !activeAccount) return;
    advanceAfterConnect(activeAccount);
  }, [activeAccount, advanceAfterConnect]);

  const handleWalletConnect = useCallback(async () => {
    connectRequestedRef.current = true;
    didAdvanceRef.current = false;
    const connectedAccount = await connectWallet();
    if (!connectedAccount) return;
    advanceAfterConnect(connectedAccount);
  }, [connectWallet, advanceAfterConnect]);

  const extensionLinks = useMemo(() => {
    const chrome = {
      label: t('common.modals.connectWallet.getExtensionChrome'),
      href: 'https://chrome.google.com/webstore/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne',
      logo: chromeLogoUrl,
    };
    const firefox = {
      label: t('common.modals.connectWallet.getExtensionFirefox'),
      href: 'https://addons.mozilla.org/en-US/firefox/addon/superhero-wallet/',
      logo: firefoxLogoUrl,
    };
    if (device.isChromeFamily) return [chrome];
    if (device.isFirefox) return [firefox];
    return [chrome, firefox];
  }, [device, t]);

  let walletSubtitle: string;
  if (pwa) {
    walletSubtitle = t('common.modals.onboarding.walletDescImport', { defaultValue: 'Import your seed phrase or private key' });
  } else if (device.isMobile) {
    walletSubtitle = t('common.modals.onboarding.walletDescMobile', { defaultValue: 'Connect with the Superhero Wallet app' });
  } else {
    walletSubtitle = t('common.modals.onboarding.walletDescDesktop', { defaultValue: 'Connect the browser extension or mobile app' });
  }

  return (
    <div className="text-foreground p-2 sm:p-0">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Favicon className="w-8 h-8" />
          <h2 className="text-xl font-bold text-white/95">
            {t('common.modals.onboarding.title', { defaultValue: 'Connect to Superhero' })}
          </h2>
        </div>
        <p className="text-sm text-white/50">
          {t('common.modals.onboarding.subtitleV2', { defaultValue: 'Choose how you want to sign in' })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {/* 1. Passkey — unlock where a vault has one, create where there is none. */}
        <PasskeyConnectCard onConnected={advanceAfterConnect} />

        {/* 2. Superhero Wallet — connect (web) or import (installed app). The
            expansion lives INSIDE this card so it opens under its own header,
            not under whichever card happens to be last in the list. */}
        <div
          className="rounded-2xl border border-white/10 overflow-hidden transition-all duration-200"
          style={{ background: walletExpanded ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.03)' }}
        >
          <button
            type="button"
            data-testid="wallet-option"
            onClick={() => (pwa ? setImportOpen(true) : setWalletExpanded((v) => !v))}
            aria-expanded={pwa ? undefined : walletExpanded}
            className="relative flex items-center gap-4 w-full p-4 text-left border-0 transition-all duration-200 cursor-pointer hover:bg-white/[0.03]"
            style={{ outline: 'none', background: 'transparent' }}
          >
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
              style={{ background: 'rgba(59,130,246,0.12)' }}
            >
              <span className="text-blue-400"><WalletIcon /></span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-white text-sm">
                {t('common.modals.onboarding.walletTitle', { defaultValue: 'Superhero Wallet' })}
              </span>
              <p className="text-xs text-white/50 mt-0.5">{walletSubtitle}</p>
            </div>
            <Chevron rotated={walletExpanded} />
          </button>

          {walletExpanded && !pwa && (
            <div className="border-t border-white/[0.06]">
              <div className="p-4 border-b border-white/[0.06]">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-semibold">
                  {t('common.modals.onboarding.alreadyHaveWallet', { defaultValue: 'Already have a wallet' })}
                </p>
                <AeButton
                  variant="default"
                  className="uppercase tracking-wide !bg-[#1161FE] text-white hover:!bg-[#0f53df] w-full rounded-xl"
                  onClick={handleWalletConnect}
                  loading={connectingWallet}
                  disabled={connectingWallet}
                >
                  {connectingWallet ? t('common.buttons.connecting') : t('common.buttons.connectWalletDex')}
                </AeButton>
              </div>

              <div className="p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-semibold">
                  {device.isMobile
                    ? t('common.modals.onboarding.getApp', { defaultValue: 'Get the app' })
                    : t('common.modals.onboarding.getExtension', { defaultValue: 'Get the extension' })}
                </p>
                {device.isMobile ? (
                  <a
                    href={device.isIOS ? APP_LINKS.walletIos : APP_LINKS.walletAndroid}
                    target="_blank"
                    rel="noreferrer"
                    className="no-underline flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Smartphone className="w-5 h-5 text-white/50 shrink-0" />
                    <span className="text-sm text-white/80 font-medium">
                      {device.isIOS
                        ? t('common.modals.connectWallet.downloadAppStore')
                        : t('common.modals.connectWallet.downloadGooglePlay')}
                    </span>
                  </a>
                ) : (
                  <div className="flex flex-col gap-1">
                    {extensionLinks.map((ext) => (
                      <a
                        key={ext.href}
                        href={ext.href}
                        target="_blank"
                        rel="noreferrer"
                        className="no-underline flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <img src={ext.logo} className="w-5 h-5 shrink-0" alt="" />
                        <span className="text-sm text-white/80 font-medium">{ext.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 pb-4 border-t border-white/[0.06] pt-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-semibold">
                  {t('common.modals.onboarding.fullApp', { defaultValue: 'Full Superhero App' })}
                </p>
                <div className="flex gap-2">
                  <a
                    href={APP_LINKS.appStore}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 transition-all hover:bg-white/[0.08] no-underline"
                  >
                    <Smartphone className="w-4 h-4 text-white/50 shrink-0" />
                    <div className="text-left min-w-0">
                      <span className="block text-[10px] text-white/40 leading-none">
                        {t('common.modals.onboarding.downloadOn')}
                      </span>
                      <span className="block text-[11px] font-semibold text-white/80 leading-tight">App Store</span>
                    </div>
                  </a>
                  <a
                    href={APP_LINKS.playStore}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 transition-all hover:bg-white/[0.08] no-underline"
                  >
                    <Smartphone className="w-4 h-4 text-white/50 shrink-0" />
                    <div className="text-left min-w-0">
                      <span className="block text-[10px] text-white/40 leading-none">
                        {t('common.modals.onboarding.getItOn')}
                      </span>
                      <span className="block text-[11px] font-semibold text-white/80 leading-tight">Google Play</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. AI agent — expandable setup guide */}
        <AgentOnboardCard />
      </div>

      <div className="text-center text-[11px] text-white/40 leading-relaxed">
        {t('common.modals.connectWallet.agreePrefix')}
        {' '}
        <Link to="/terms" className="no-underline text-[var(--primary-color)] hover:opacity-90">
          {t('common.layout.termsOfUse')}
        </Link>
        {' '}
        {t('common.modals.connectWallet.and')}
        {' '}
        <Link to="/privacy" className="no-underline text-[var(--primary-color)] hover:opacity-90">
          {t('common.layout.privacyPolicy')}
        </Link>
        .
      </div>

      {/* PWA import flow. A full-screen layer above this modal (it is its own
          Radix dialog); `entry="import"` opens it on the phrase field and Back
          from there returns here. Adopting the address installs the in-page
          signer through `makeSigner`, since import wrote it into the manifest. */}
      {importOpen && (
        <Suspense fallback={null}>
          <WalletOnboarding
            entry="import"
            onCancel={() => setImportOpen(false)}
            onComplete={(_record, address) => {
              setImportOpen(false);
              if (address) {
                addStaticAccount(address);
                advanceAfterConnect(address);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default OnboardingModal;
