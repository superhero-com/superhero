import isFQDN from 'is-fqdn';
import configs from '../configs';

export function createDeepLinkUrl({ type, callbackUrl, ...params }: Record<string, string>) {
  const url = new URL(`${configs.wallet.url}/${type}`);
  if (callbackUrl) {
    url.searchParams.set('x-success', callbackUrl);
    url.searchParams.set('x-cancel', callbackUrl);
  }
  Object.entries(params)
    .filter(([, v]) => v != null)
    .forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}
