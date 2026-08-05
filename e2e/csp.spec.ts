import { test, expect } from '@playwright/test';

/**
 * Enforcing CSP + Trusted Types soak.
 *
 * Runs against the production Express server (server/index.cjs), which is the only path that
 * emits the enforcing `Content-Security-Policy` header — `script-src 'strict-dynamic' 'nonce-…'`
 * (no unsafe-inline) plus `require-trusted-types-for 'script'; trusted-types superhero-dom`.
 * Each route attaches a `securitypolicyviolation` listener before the document loads and fails
 * on any *enforced* violation, so this is the re-runnable gate that replaces a manual soak — no
 * report sink was ever wired, so there is no violation telemetry to read instead.
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
    });
  });
});
