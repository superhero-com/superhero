import React, { useMemo } from 'react';
import { AeButton } from '@/components/ui/ae-button';
import { useWalletConnect } from '@/hooks';
import chromeLogoUrl from '@/svg/brands/chrome-logo.svg';
import firefoxLogoUrl from '@/svg/brands/firefox-logo.svg';
import Favicon from '@/svg/favicon.svg?react';

type Props = { onClose: () => void };

const ChromeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src={chromeLogoUrl} className={className} alt="Chrome" />
);
const FirefoxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src={firefoxLogoUrl} className={className} alt="Firefox" />
);

function getInstallItems() {
  const ua = navigator.userAgent || '';

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobi/i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);
  const isChromeFamily = (/Chrome\//i.test(ua) || /Chromium\//i.test(ua)) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua);

  const LINKS = {
    chrome: 'https://chrome.google.com/webstore/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne',
    firefox: 'https://addons.mozilla.org/en-US/firefox/addon/superhero-wallet/',
    android: 'https://play.google.com/store/apps/details?id=com.superhero.cordova',
    ios: 'https://apps.apple.com/us/app/superhero-wallet/id1502786641',
  } as const;

  if (isMobile) {
    const item = isAndroid
      ? { label: 'Download from Google Play', href: LINKS.android }
      : { label: 'Download from App Store', href: LINKS.ios };
    return { kind: 'mobile' as const, title: 'Get the wallet app:', items: [item as any] };
  }

  // Desktop logic: show only the detected browser; otherwise show both
  if (isChromeFamily) {
    return { kind: 'desktop' as const, title: 'Get the browser extension', items: [{ label: 'Get extension for Chrome', href: LINKS.chrome, Icon: ChromeIcon }] };
  }
  if (isFirefox) {
    return { kind: 'desktop' as const, title: 'Get the browser extension', items: [{ label: 'Get extension for Firefox', href: LINKS.firefox, Icon: FirefoxIcon }] };
  }
  return {
    kind: 'desktop' as const,
    title: 'Get the browser extension',
    items: [
      { label: 'Get extension for Chrome', href: LINKS.chrome, Icon: ChromeIcon },
      { label: 'Get extension for Firefox', href: LINKS.firefox, Icon: FirefoxIcon },
    ],
  };
}

export default function ConnectWalletModal({ onClose }: Props) {
  const { connectWallet, connectingWallet } = useWalletConnect();

  const install = useMemo(() => getInstallItems(), []);

  async function handleConnect() {
    await connectWallet();
    onClose();
  }

  return (
    <div className="text-foreground p-2 sm:p-0 text-center sm:text-left">
      <div className="flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 justify-center w-full sm:w-auto">
          <Favicon className="w-8 h-8" />
          <div className="text-lg font-semibold">Superhero Wallet</div>
        </div>
        <AeButton
          variant="default"
          className="uppercase tracking-wide !bg-[#1161FE] text-white hover:!bg-[#0f53df] w-full sm:w-auto rounded-full"
          onClick={handleConnect}
          loading={connectingWallet}
          disabled={connectingWallet}
        >
          {connectingWallet ? 'Connecting…' : 'CONNECT WALLET'}
        </AeButton>
      </div>

      <div className="mt-6 sm:mt-10 text-center sm:text-left">
        <div className="text-base font-medium mb-2">{install.title}</div>
        <div className={`grid gap-2 ${install.items.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {install.items.map(({ label, href, Icon }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="no-underline">
              <div className="flex items-center justify-center sm:justify-between gap-3 px-3 py-4 sm:py-3 rounded-lg hover:bg-white/10 transition-colors text-center sm:text-left">
                <div className="flex items-center gap-3 min-w-0 justify-center sm:justify-start w-full">
                  {Icon ? <span className="hidden sm:inline-block"><Icon className="w-7 h-7 shrink-0" /></span> : null}
                  <span className="text-base sm:text-lg text-foreground font-semibold truncate">{label}</span>
                </div>
                <svg className="hidden sm:block w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7"/>
                  <path d="M7 7h10v10"/>
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}


