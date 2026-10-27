const AVATAR_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const AVATAR_IMAGE_HOSTS = ['imgur.com', 'giphy.com', 'ipfs.io'];

/**
 * Mirrors the API avatar link rules: https, no port, an image file or a known
 * image host, at most 200 characters once stored.
 */
export function isValidAvatarUrl(value: string): boolean {
  if (!value || !/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.port || url.username || url.password) return false;
    const stored = `${url.host}${url.pathname}${url.search}`;
    if (stored.length > 200 || stored.includes(':')) return false;
    if (url.pathname === '/' || !url.pathname) return false;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    return AVATAR_IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext))
      || AVATAR_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
