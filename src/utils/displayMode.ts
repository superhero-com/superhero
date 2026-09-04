/**
 * Display-mode detection for the PWA install affordance.
 *
 * There is no cross-browser "is this installable / is this installed" API.
 * These helpers only answer three narrow questions:
 *   - is the app already running standalone (installed)?
 *   - is this iOS/iPadOS Safari (or an iOS WebKit-backed browser), which has
 *     no `beforeinstallprompt` and must fall back to hand-authored
 *     Share -> Add to Home Screen instructions?
 *   - is this a mobile device at all, as opposed to a desktop that happens to
 *     have the app installed?
 *
 * All of them guard every access to `window`/`navigator`, so they also answer
 * in a plain Node test environment.
 */

/** True when the app is already running as an installed / standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaStandalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;

  // iOS-specific signal. Required because iOS does not reliably reflect the
  // `display-mode: standalone` media query on older versions.
  const iosStandalone = typeof navigator !== 'undefined'
    && (navigator as unknown as { standalone?: boolean }).standalone === true;

  return Boolean(mediaStandalone) || iosStandalone;
}

/**
 * True for iPhone/iPad/iPod Safari, plus the iPadOS 13+ case which reports
 * as a desktop Mac but exposes multi-touch. Mirrors the inline detector in
 * `index.html` (`ios-webkit` class) — keep both in sync if this changes.
 */
export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Android/Windows-Phone/Kindle mobile tells. iOS is covered by isIOSWebKit(). */
const MOBILE_UA_RE = /Android|webOS|BlackBerry|IEMobile|Opera Mini|Silk|Mobile/i;

/**
 * True on a phone or tablet, false on a desktop.
 *
 * Deliberately a *device* test, not a viewport test: a desktop window dragged
 * narrow is still a desktop, and a phone held in landscape is still a phone
 * (an iPhone 13 is 844px wide that way, past any sane mobile breakpoint). So
 * `useIsMobile()` — a `max-width` media query — is the wrong tool here even
 * though it is the repo's usual one.
 *
 * The user agent is the primary signal; `(pointer: coarse) and (hover: none)`
 * is the fallback for touch-first browsers that have trimmed their UA.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  if (isIOSWebKit()) return true;
  if (MOBILE_UA_RE.test(navigator.userAgent || '')) return true;

  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse) and (hover: none)').matches;
}
