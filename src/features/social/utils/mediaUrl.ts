/**
 * A stricter subset of superhero-api `isValidMediaUrl` (src/social/utils/content-parser.util.ts),
 * so a link that passes here is never dropped by the indexer. Its extensionless allowance for
 * Imgur/Giphy/YouTube/Vimeo is left out on purpose: those are page links that `<img>` and
 * `<video>` cannot render.
 */
export const MAX_POST_MEDIA = 4; // what the feed grid shows; the indexer keeps 5

const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];

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
  if (!MEDIA_EXTENSIONS.some((ext) => path.endsWith(ext))) return null;
  // The CSP's upgrade-insecure-requests loads it over https anyway; store what actually loads.
  parsed.protocol = 'https:';
  return parsed.toString();
}

export function isVideoMediaUrl(url: string): boolean {
  try {
    return /\.(mp4|webm|mov)$/i.test(new URL(url).pathname);
  } catch {
    return /\.(mp4|webm|mov)$/i.test(url);
  }
}
