import { useTranslation } from 'react-i18next';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { AeButton } from '@/components/ui/ae-button';
import { useAeSdk, useWalletConnect } from '@/hooks';
import { isPlatformAuthenticatorAvailable } from '@/features/wallet/webauthn';
import chromeLogoUrl from '@/svg/brands/chrome-logo.svg';
import firefoxLogoUrl from '@/svg/brands/firefox-logo.svg';
import Favicon from '@/svg/favicon.svg?react';

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

const PasskeyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="21" cy="19" r="3" fill="currentColor" opacity="0.7" />
    <path d="M21 22v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const WalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="2" y="7" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M2 12h24" stroke="currentColor" strokeWidth="2" />
    <circle cx="20" cy="18" r="2" fill="currentColor" />
  </svg>
);

const ConnectWalletModal = ({ onClose, onConnected }: Props) => {
  const { t } = useTranslation();
  const { connectWallet, connectingWallet } = useWalletConnect();
  const { activeAccount } = useAeSdk();
  const device = useMemo(() => getDeviceInfo(), []);

  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const connectRequestedRef = useRef(false);
  const didAdvanceRef = useRef(false);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setPasskeyAvailable);
  }, []);

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

  const handlePasskey = useCallback(async () => {
    setPasskeyError(null);
    setPasskeyLoading(true);
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: import.meta.env.VITE_WEBAUTHN_RP_ID || 'superhero.com',
          userVerification: 'required',
          extensions: { prf: {} } as unknown as AuthenticationExtensionsClientInputs,
        },
      });
      if (!credential) throw new Error('No credential returned');
      connectRequestedRef.current = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
        setPasskeyError(t('common.modals.onboarding.passkeyCancelled', { defaultValue: 'Cancelled. Try again or use your wallet.' }));
      } else if (msg.includes('no passkey factor')) {
        setPasskeyError(t('common.modals.onboarding.passkeyNotEnrolled', { defaultValue: 'No passkey found. Connect your wallet first to set one up.' }));
      } else {
        setPasskeyError(t('common.modals.onboarding.passkeyError', { defaultValue: 'Passkey failed. Try your wallet instead.' }));
      }
    } finally {
      setPasskeyLoading(false);
    }
  }, [t]);

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

  return (
    <div className="text-foreground p-2 sm:p-0">

      {/* Header */}
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

      {/* Two primary options */}
      <div className="grid grid-cols-1 gap-3 mb-4">

        {/* Passkey */}
        <button
          type="button"
          onClick={passkeyAvailable ? handlePasskey : undefined}
          disabled={passkeyLoading || !passkeyAvailable}
          className={[
            'relative flex items-center gap-4 w-full rounded-2xl p-4 text-left border-0 transition-all duration-200 cursor-pointer',
            passkeyAvailable
              ? 'bg-gradient-to-r from-purple-600/15 to-blue-600/10 border border-purple-500/30 hover:from-purple-600/25 hover:to-blue-600/20 hover:border-purple-500/50'
              : 'bg-white/[0.03] border border-white/10 opacity-50 cursor-not-allowed',
          ].join(' ')}
          style={{ outline: 'none' }}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.15))' }}
          >
            <span className="text-purple-400"><PasskeyIcon /></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                {t('common.modals.onboarding.passkeyTitle', { defaultValue: 'Passkey' })}
              </span>
              {passkeyAvailable && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}
                >
                  {t('common.modals.onboarding.recommended', { defaultValue: 'Recommended' })}
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {passkeyAvailable
                ? t('common.modals.onboarding.passkeyDesc', { defaultValue: 'Face ID, Touch ID or device PIN — instant, no password' })
                : t('common.modals.onboarding.passkeyUnavailable', { defaultValue: 'Not available on this device/browser' })}
            </p>
          </div>
          <div className="shrink-0 text-white/30">
            {passkeyLoading ? (
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="10" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </button>

        {passkeyError && (
          <p className="text-xs text-amber-400 px-1 -mt-1">{passkeyError}</p>
        )}

        {/* Wallet */}
        <button
          type="button"
          onClick={() => setShowWalletOptions((v) => !v)}
          className="relative flex items-center gap-4 w-full rounded-2xl p-4 text-left border-0 transition-all duration-200 cursor-pointer bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20"
          style={{ outline: 'none' }}
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
            <p className="text-xs text-white/50 mt-0.5">
              {device.isMobile
                ? t('common.modals.onboarding.walletDescMobile', { defaultValue: 'Connect with the Superhero Wallet app' })
                : t('common.modals.onboarding.walletDescDesktop', { defaultValue: 'Browser extension or mobile app' })}
            </p>
          </div>
          <div
            className="shrink-0 text-white/30 transition-transform duration-200"
            style={{ transform: showWalletOptions ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>
      </div>

      {/* Wallet options (expanded) */}
      {showWalletOptions && (
        <div
          className="rounded-2xl border border-white/10 mb-4 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
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
              {connectingWallet
                ? t('common.buttons.connecting')
                : t('common.buttons.connectWalletDex')}
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

      {/* Terms */}
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
    </div>
  );
};

export default ConnectWalletModal;
