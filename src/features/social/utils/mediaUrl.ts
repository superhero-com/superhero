/**
 * Mirrors superhero-api `isValidMediaUrl` (src/social/utils/content-parser.util.ts):
 * the indexer drops any post media entry that fails this check, so the composer
 * applies the same rule before a link is written on-chain.
 */
export const MAX_POST_MEDIA = 5;

const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];
const MEDIA_HOSTS = ['imgur.com', 'giphy.com', 'youtube.com', 'vimeo.com'];

export function normalizeMediaUrl(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const path = parsed.pathname.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const hasExtension = MEDIA_EXTENSIONS.some((ext) => path.endsWith(ext));
  const fromMediaHost = MEDIA_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (!hasExtension && !fromMediaHost) return null;
  return parsed.toString();
}

export function isVideoMediaUrl(url: string): boolean {
  try {
    return /\.(mp4|webm|mov)$/i.test(new URL(url).pathname);
  } catch {
    return /\.(mp4|webm|mov)$/i.test(url);
  }
}
