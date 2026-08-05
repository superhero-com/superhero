import { test, expect } from '@playwright/test';

/**
 * Enforcing CSP + Trusted Types soak.
 *
 * Runs against the production Express server (server/index.cjs), which is the only path that
 * emits the enforcing `Content-Security-Policy` header — `script-src 'strict-dynamic' 'nonce-…'`
 * (no unsafe-inline) plus `require-trusted-types-for 'script'` and the two named Trusted Types
 * policies, `trusted-types superhero-dom default`.
 * Each route attaches a `securitypolicyviolation` listener before the document loads and fails
 * on any *enforced* violation, so this is the re-runnable gate that replaces a manual soak — no
 * report sink was ever wired, so there is no violation telemetry to read instead.
 *
 * Two things enforcement breaks that a violation listener alone CANNOT see, both covered below:
 *
 *   1. A `default` policy whose `createHTML` drops markup returns normally, so no violation
 *      event fires and the UI just silently loses content. Caught by the console tripwire.
 *   2. TrustedScriptURL sinks (`serviceWorker.register`) THROW instead of reporting, and they
 *      sit behind a permission prompt no route walk reaches. Caught by its own test.
 *
 * See playwright.csp.config.ts for the server wiring; run with `npm run test:e2e:csp`.
 */

// Routes chosen to exercise the audited DOM sinks and the full script surface under the header:
// home + feed (linkify, jdenticon/multiavatar avatars), trends (token identicons), the wallet
// landing (two **bold** i18n sinks in src/views/Wallet.tsx), and static copy routes.
const ROUTES = ['/', '/trends', '/wallet', '/faq', '/terms'];

type CspViolation = {
  directive: string;
  blockedURI: string;
  sample: string;
  source: string;
};

// Registered as an init script so it is attached before any page script runs on every load.
function recordCspViolations(): void {
  const store = window as Window & { cspViolationLog?: CspViolation[] };
  store.cspViolationLog = [];
  document.addEventListener('securitypolicyviolation', (event) => {
    // Only enforced blocks matter; a report-only header would carry disposition 'report'.
    if (event.disposition && event.disposition !== 'enforce') return;
    store.cspViolationLog!.push({
      directive: event.effectiveDirective || event.violatedDirective,
      blockedURI: event.blockedURI,
      sample: event.sample || '',
      source: `${event.sourceFile || ''}:${event.lineNumber || 0}`,
    });
  });
}

test.describe('enforcing CSP + Trusted Types', () => {
  ROUTES.forEach((route) => {
    test(`raises zero violations at ${route}`, async ({ page }) => {
      await page.addInitScript(recordCspViolations);

      // The `default` policy blanks any markup reaching an un-audited sink and warns; that drop
      // fires no violation event, so this console line is the only evidence it happened.
      const drops: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('[trusted-types] dropped markup')) drops.push(msg.text());
      });

      await page.goto(route, { waitUntil: 'load' });
      await page.locator('#root').waitFor({ state: 'visible' });
      // Let the SPA hydrate and run its client-side sink writes under the header.
      await page.waitForTimeout(3000);

      // The entry module is nonce-gated: had CSP blocked it, React would never mount and #root
      // would stay empty — a failure that emits no violation event of its own.
      await expect(page.locator('#root'), `app failed to mount at ${route}`).not.toBeEmpty();

      const violations = await page.evaluate(
        () => (window as Window & { cspViolationLog?: CspViolation[] }).cspViolationLog ?? [],
      );
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect(drops, `default policy silently dropped markup at ${route}`).toEqual([]);
    });
  });

  // Regression guard. `ServiceWorkerContainer.register()` takes a TrustedScriptURL, so under
  // `require-trusted-types-for 'script'` a policy that implements only `createHTML` makes it
  // throw outright — killing web push for every user who granted permission. The route walk
  // above cannot see this: register() only runs after Notification.requestPermission() resolves
  // granted. Exercise the real sink directly instead.
  test('registers the push service worker without a Trusted Types throw', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('#root').waitFor({ state: 'visible' });

    // Deliberately a BARE string, not a minted one: that routes through the `default` policy,
    // which is the path that threw. The production call site in notification-feed-client.ts
    // mints via `superhero-dom`, whose createScriptURL is the same function — so proving the
    // implicit path works proves the explicit one does too.
    const outcome = await page.evaluate(async () => {
      try {
        await navigator.serviceWorker.register('/notifications-sw.js', { scope: '/' });
        return 'registered';
      } catch (err) {
        return `THREW: ${(err as Error).name}: ${(err as Error).message}`;
      }
    });

    expect(outcome).toBe('registered');
  });

  // The other half of the same guard: a cross-origin script URL must still be refused, so the
  // createScriptURL added above is a real boundary and not a pass-through.
  test('refuses a cross-origin script URL', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('#root').waitFor({ state: 'visible' });

    const outcome = await page.evaluate(async () => {
      try {
        await navigator.serviceWorker.register('https://evil.example/sw.js', { scope: '/' });
        return 'registered';
      } catch (err) {
        return `THREW: ${(err as Error).message}`;
      }
    });

    expect(outcome).toContain('trusted-types');
  });
});
