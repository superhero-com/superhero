import { configs } from '../configs';
import { IS_MOBILE, SETTINGS } from './constants';

export function createDeepLinkUrl({ type, callbackUrl, ...params }: Record<string, string>) {
  const isIosMobileBrowser = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    && window.navigator.userAgent.includes('Mobi');
  const baseUrl = isIosMobileBrowser ? 'superhero://' : `${configs.wallet.url}/`;
  const url = new URL(type, baseUrl);
  if (callbackUrl) {
    url.searchParams.set('x-success', callbackUrl);
    url.searchParams.set('x-cancel', callbackUrl);
  }
  Object.entries(params)
    .filter(([, v]) => v != null)
    .forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}


export const openDeepLink = ({
  type,
  target = '_self',
  windowFeatures,
  ...params
}: {
  type: string;
  successUrl?: string;
  cancelUrl?: string;
  [key: string]: string;
}) => {
  // Build the deep link URL (superhero://)
  const deepLink = new URL(`superhero://${type}`);
  // Build the fallback web URL
  const webUrl = new URL(`${SETTINGS.wallet.url}/${type}`);
  Object.entries(params)
    .filter(([, value]: any) => ![undefined, null].includes(value))
    .forEach(([name, value]: any) => {
      deepLink.searchParams.set(name, String(value));
      webUrl.searchParams.set(name, String(value));
    });

  
  
  if (!IS_MOBILE) {
    window.open(webUrl.toString(), target, windowFeatures);
    return;
  }

  const fallbackTimeout = setTimeout(() => {
    // App didn't open — redirect to web wallet
    window.open(webUrl.toString(), target);
  }, 1500);

  // If the app opens, the page loses focus — cancel the fallback
  window.addEventListener('blur', () => clearTimeout(fallbackTimeout), { once: true });

  // Try to open the deep link
  window.open(deepLink.toString(), '_self', windowFeatures);
};