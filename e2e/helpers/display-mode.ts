import type { Page } from '@playwright/test';

/**
 * Display-mode control for e2e.
 *
 * Several surfaces branch on `isStandalone()` (src/utils/displayMode.ts) — the
 * inline wallet's Connect routing, the wallet-import option, the chat entry
 * points. Playwright cannot emulate `display-mode: standalone` natively, so the
 * media query is stubbed instead.
 *
 * `addInitScript` runs before the app bundle, so the very first render already
 * reads the forced value. That matters: `WalletOnboarding` snapshots the mode
 * into state at mount, and a value that only landed after hydration would be
 * read as "browser tab" whatever this said.
 */

/** Make `isStandalone()` report an installed PWA for the life of the page. */
export async function forceStandalone(page: Page) {
  await page.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => (
      query.includes('display-mode: standalone')
        ? ({
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; },
        } as unknown as MediaQueryList)
        : orig(query)
    );
  });
}

/**
 * Make `isStandalone()` report a plain browser tab.
 *
 * Chromium is already not standalone, so this asserts the baseline rather than
 * changing it — but it also clears `navigator.standalone`, the iOS signal, so a
 * test that emulates an iPhone user agent cannot accidentally read as installed.
 * Pairing it with `forceStandalone` also makes each test say which surface it is
 * about instead of leaving one of the two cases implicit.
 */
export async function forceBrowserTab(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', {
      value: false,
      configurable: true,
    });
  });
}
