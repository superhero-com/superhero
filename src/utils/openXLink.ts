/**
 * Helpers for opening X (Twitter) links so that, on mobile, we first try the
 * native app via its deep link and only fall back to the universal web link if
 * the app is not installed.
 *
 * Why: on iOS, opening `https://x.com/...` from inside a web/in-app context
 * tends to open the Safari in-app browser (or a blocked pop-up). Trying the
 * `twitter://` deep link first hands off to the installed X app; if that fails
 * we fall back to the universal link so desktop and app-less users still work.
 */

/** Deep link that opens the native X/Twitter compose screen. */
export function buildXComposeDeepLink(text: string): string {
  return `twitter://post?message=${encodeURIComponent(text)}`;
}

/** Universal web intent URL used as the fallback (and on desktop). */
export function buildXComposeWebLink(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

/**
 * Attempt a deep link and fall back to a universal web link if the app does not
 * take over the page within a short window. On desktop we skip the deep link
 * and open the web link directly in a new tab.
 */
function openWithDeepLinkFallback(deepLink: string, webLink: string): void {
  if (typeof window === 'undefined') return;

  // Desktop (or no app): open the universal link in a new tab as before.
  if (!isMobileUserAgent()) {
    window.open(webLink, '_blank', 'noopener,noreferrer');
    return;
  }

  let handedOff = false;

  // If the native app opens, the page is backgrounded — cancel the fallback.
  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      handedOff = true;
      window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };

  const fallbackTimer = window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (handedOff) return;
    // Universal link keeps us out of the iOS in-app Safari browser and still
    // opens the native app when it is installed.
    window.location.href = webLink;
  }, 1200);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  try {
    window.location.href = deepLink;
  } catch {
    window.clearTimeout(fallbackTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    window.location.href = webLink;
  }
}

/**
 * Open the X compose screen with the given text. Tries the mobile app deep link
 * first and falls back to the universal web intent link.
 */
export function openXComposeIntent(text: string): void {
  openWithDeepLinkFallback(buildXComposeDeepLink(text), buildXComposeWebLink(text));
}
