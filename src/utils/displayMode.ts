/**
 * Display-mode detection for the PWA install affordance.
 *
 * There is no cross-browser "is this installable / is this installed" API.
 * These helpers only answer two narrow questions:
 *   - is the app already running standalone (installed)?
 *   - is this iOS/iPadOS Safari (or an iOS WebKit-backed browser), which has
 *     no `beforeinstallprompt` and must fall back to hand-authored
 *     Share -> Add to Home Screen instructions?
 *
 * Both guard every access for SSR (`src/entry-server.tsx` renders this app
 * without a `window`/`navigator`).
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
