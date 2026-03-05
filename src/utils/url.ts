import { configs } from '../configs';

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
