import React, {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { AeButton } from '@/components/ui/ae-button';
import { useAeSdk, useWalletConnect } from '@/hooks';
import chromeLogoUrl from '@/svg/brands/chrome-logo.svg';
import firefoxLogoUrl from '@/svg/brands/firefox-logo.svg';
import Favicon from '@/svg/favicon.svg?react';

type Props = {
  onClose: () => void;
  onConnected?: (address: string) => void;
};

const ChromeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src={chromeLogoUrl} className={className} alt="Chrome" />
);
const FirefoxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src={firefoxLogoUrl} className={className} alt="Firefox" />
);

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

// Mirror the connect-wallet flow: show only the detected browser's extension, but for unknown
// desktop browsers (e.g. Safari) offer both Chrome and Firefox rather than a misleading
// Chrome-only path.
function getExtensionLinks(device: ReturnType<typeof getDeviceInfo>, t: TFunction) {
  const chrome = { label: t('common.modals.connectWallet.getExtensionChrome'), href: 'https://chrome.google.com/webstore/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne', Icon: ChromeIcon };
  const firefox = { label: t('common.modals.connectWallet.getExtensionFirefox'), href: 'https://addons.mozilla.org/en-US/firefox/addon/superhero-wallet/', Icon: FirefoxIcon };
  if (device.isChromeFamily) return [chrome];
  if (device.isFirefox) return [firefox];
  return [chrome, firefox];
}

const OnboardingModal = ({ onClose, onConnected }: Props) => {
  const { t } = useTranslation();
  const { connectWallet, connectingWallet } = useWalletConnect();
  const { activeAccount } = useAeSdk();
  const device = useMemo(() => getDeviceInfo(), []);
  const connectRequestedRef = useRef(false);
  const didAdvanceRef = useRef(false);

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

  async function handleConnect() {
    connectRequestedRef.current = true;
    didAdvanceRef.current = false;
    const connectedAccount = await connectWallet();
    if (!connectedAccount) return;
    advanceAfterConnect(connectedAccount);
  }

  return (
    <div className="text-foreground p-2 sm:p-0">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Favicon className="w-8 h-8" />
          <h2 className="text-xl font-bold text-white/95">{t('common.modals.onboarding.title')}</h2>
        </div>
        <p className="text-sm text-white/50">
          {t('common.modals.onboarding.subtitle')}
        </p>
      </div>

      {/* Step 1 - Extension/Wallet App */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1161FE]/20 text-[#1161FE] text-sm font-bold border border-[#1161FE]/30">
            1
          </span>
          <span className="text-sm font-semibold text-white/80">
            {device.isMobile ? t('common.modals.onboarding.stepWalletApp') : t('common.modals.onboarding.stepExtension')}
          </span>
        </div>

        {device.isMobile ? (
          /* Mobile: show wallet app download */
          <div className="ml-10">
            <a
              href={device.isIOS ? APP_LINKS.walletIos : APP_LINKS.walletAndroid}
              target="_blank"
              rel="noreferrer"
              className="no-underline flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Smartphone className="w-5 h-5 text-white/60 shrink-0" />
              <span className="text-sm text-white/90 font-medium">
                {device.isIOS ? t('common.modals.connectWallet.downloadAppStore') : t('common.modals.connectWallet.downloadGooglePlay')}
              </span>
            </a>
          </div>
        ) : (
          /* Desktop: show browser extension(s) */
          <div className="ml-10">
            {getExtensionLinks(device, t).map((ext) => (
              <a
                key={ext.href}
                href={ext.href}
                target="_blank"
                rel="noreferrer"
                className="no-underline flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                {ext.Icon && <ext.Icon className="w-6 h-6 shrink-0" />}
                <span className="text-sm text-white/90 font-medium">{ext.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 - Connect Wallet */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1161FE]/20 text-[#1161FE] text-sm font-bold border border-[#1161FE]/30">
            2
          </span>
          <span className="text-sm font-semibold text-white/80">
            {t('common.buttons.connectWallet')}
          </span>
        </div>
        <div className="ml-10">
          <AeButton
            variant="default"
            className="uppercase tracking-wide !bg-[#1161FE] text-white hover:!bg-[#0f53df] w-full rounded-xl"
            onClick={handleConnect}
            loading={connectingWallet}
            disabled={connectingWallet}
          >
            {connectingWallet ? t('common.buttons.connecting') : t('common.buttons.connectWalletDex')}
          </AeButton>
        </div>
      </div>

      {/* Divider with "or" */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/40 uppercase">{t('common.modals.onboarding.or')}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Download full app */}
      <div className="text-center">
        <p className="text-xs text-white/50 mb-3">
          {t('common.modals.onboarding.downloadAppHint')}
        </p>
        <div className="flex flex-row items-center justify-center gap-3">
          <a
            href={APP_LINKS.appStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-2.5 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] no-underline"
          >
            <Smartphone className="w-4 h-4 text-white/60" />
            <div className="text-left">
              <span className="block text-[10px] text-white/40 leading-none">{t('common.modals.onboarding.downloadOn')}</span>
              <span className="block text-[12px] font-semibold text-white/90 leading-tight">App Store</span>
            </div>
          </a>
          <a
            href={APP_LINKS.playStore}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-2.5 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] no-underline"
          >
            <Smartphone className="w-4 h-4 text-white/60" />
            <div className="text-left">
              <span className="block text-[10px] text-white/40 leading-none">{t('common.modals.onboarding.getItOn')}</span>
              <span className="block text-[12px] font-semibold text-white/90 leading-tight">Google Play</span>
            </div>
          </a>
        </div>
      </div>

      {/* Terms */}
      <div className="mt-5 text-center text-[11px] text-white/40 leading-relaxed">
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
    </div>
  );
};

export default OnboardingModal;
