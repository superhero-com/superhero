import isFQDN from 'is-fqdn';
import { CONFIG } from '../config';
import { get } from 'lodash-es';

export function toURL(url: string) {
  return new URL(url.includes('://') ? url : `https://${url}`);
}

export function validateTipUrl(urlStr: string) {
  try {
    const url = toURL(urlStr);
    return ['http:', 'https:'].includes(url.protocol) && isFQDN(url.hostname);
  } catch {
    return false;
  }
}

export function createDeepLinkUrl({ type, callbackUrl, ...params }: Record<string, string>) {
  const url = new URL(`${CONFIG.WALLET_URL}/${type}`);
  if (callbackUrl) {
    url.searchParams.set('x-success', callbackUrl);
    url.searchParams.set('x-cancel', callbackUrl);
  }
  Object.entries(params)
    .filter(([, v]) => v != null)
    .forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return url.toString();
}

function getTwitterAccountUrl(url: string) {
  const match = url.match(/https:\/\/twitter.com\/[a-zA-Z0-9_]+/g);
  return match ? match[0] : false;
}

export function urlStatus(tipUrl: string | null | undefined, verifiedUrls: string[], blacklistedUrls: string[]) {
  if (!tipUrl) return 'default';
  const twitterProfile = getTwitterAccountUrl(tipUrl);
  const url = (twitterProfile as string) || tipUrl;
  if (blacklistedUrls?.some((u) => url.includes(u))) return 'blacklisted';
  if (verifiedUrls?.includes(url)) return 'verified';
  if (validateTipUrl(url) && url.startsWith('http:')) return 'not-secure';
  return 'not-verified';
}


