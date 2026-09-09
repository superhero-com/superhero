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
// `/index.html` is the literal-document entry point: it used to be served by express.static
// ahead of the CSP route handlers, returning the SPA with no header at all — an attacker who
// walked a wallet user in through it got the application without the custody-boundary control.
// The DeFi and get-AE routes are here because they mount third-party SDKs whose network origins
// live inside the dependency rather than in our source, so a source-level allowlist review
// cannot see them; only a walk under the real header can.
const ROUTES = [
  '/', '/index.html',
  '/trends', '/trends/tokens', '/trends/create',
  '/wallet', '/invite', '/chat',
  '/defi/swap', '/defi/pool', '/defi/bridge', '/get-ae',
  '/voting', '/faq', '/terms',
];

// Percent-encoded spellings of the same document. `req.path` keeps the escapes while
// serve-static decodes before resolving, so before the decode fix these reached express.static
// and returned the SPA with no CSP header and raw `__CSP_NONCE__` placeholders — the bypass
// `/index.html` above was meant to close, reopened by one encoded character.
const ENCODED_DOCUMENT_PATHS = ['/index%2Ehtml', '/index%2ehtml', '/index.htm%6C'];

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

  // Header assertion, separate from the violation walk above. A route can raise zero violations
  // simply because it carries no policy at all — which is exactly how `/index.html` passed while
  // bypassing enforcement. Assert the header itself on the raw response, per route.
  ROUTES.forEach((route) => {
    test(`serves an enforcing CSP and a substituted nonce at ${route}`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(200);

      const headers = response.headers();
      const csp = headers['content-security-policy'];
      expect(csp, `no enforcing Content-Security-Policy at ${route}`).toBeTruthy();
      expect(
        headers['content-security-policy-report-only'],
        `${route} fell back to report-only`,
      ).toBeUndefined();
      expect(csp).toContain("require-trusted-types-for 'script'");
      expect(csp).toContain('trusted-types superhero-dom default');
      // Scoped to script-src on purpose: `style-src 'unsafe-inline'` is deliberate (Radix and
      // the chart libs write inline styles), but an inline *script* escape hatch would undo
      // the nonce entirely.
      const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
      expect(scriptSrc, `no script-src at ${route}`).toBeTruthy();
      expect(scriptSrc).not.toContain('unsafe-inline');
      expect(scriptSrc).not.toContain('unsafe-eval');

      // The nonce must actually reach the document: an unsubstituted `__CSP_NONCE__` means the
      // response skipped the render path, and every inline script would be blocked (or, as in
      // the bypass, not gated at all).
      const body = await response.text();
      expect(body, `${route} served raw __CSP_NONCE__ placeholders`).not.toContain('__CSP_NONCE__');
      const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
      expect(nonce, `no nonce in the CSP header at ${route}`).toBeTruthy();
      expect(body, `header nonce absent from the document at ${route}`).toContain(
        `nonce="${nonce}"`,
      );
    });
  });

  ENCODED_DOCUMENT_PATHS.forEach((route) => {
    test(`serves an enforcing CSP at the encoded path ${route}`, async ({ playwright, baseURL }) => {
      // A context with no baseURL of its own: resolving a relative path against one runs it
      // through the URL parser, which normalises `%2E` back to `.` and would test the wrong
      // path. Passing the absolute URL keeps the escape intact.
      const api = await playwright.request.newContext();
      const response = await api.get(`${baseURL}${route}`);
      const csp = response.headers()['content-security-policy'];
      expect(csp, `no Content-Security-Policy at ${route}`).toBeTruthy();

      const body = await response.text();
      expect(body, `${route} served raw __CSP_NONCE__ placeholders`).not.toContain('__CSP_NONCE__');
      await api.dispose();
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

  // React builds every <script> element it renders by parsing a literal into a scratch <div>
  // and lifting out the first child, so the element factory itself hits the `default` policy.
  // A drop there leaves the div empty and React's `removeChild(div.firstChild)` throws
  // `parameter 1 is not of type 'Node'`, unmounting the app on every route with JSON-LD
  // (src/seo/Head.tsx). The route walk cannot pin this: it needs live data on a detail page.
  test('lets React build a <script> element under the default policy', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('#root').waitFor({ state: 'visible' });

    // A BARE string, exactly as react-dom writes it — that is what routes through `default`.
    const outcome = await page.evaluate(() => {
      const scratch = document.createElement('div');
      try {
        scratch.innerHTML = '<script></script>';
      } catch (err) {
        return `THREW: ${(err as Error).message}`;
      }
      return scratch.firstChild ? 'built' : 'DROPPED';
    });

    expect(outcome).toBe('built');
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
