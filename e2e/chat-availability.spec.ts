import { test, expect, Page } from '@playwright/test';

/**
 * Chat availability — the deploy-config contract, end to end.
 *
 * Chat "dark ships": `InboxView` returns `<ChatUnavailableNotice />` before
 * rendering anything when `isChatRelayConfigured()` is false, i.e. when
 * `NOSTR_RELAY_URLS` is empty. That gate sits ABOVE the "New chat" button, so a
 * missing relay presents to the user as "the button is gone", not as an error —
 * exactly how the production outage looked.
 *
 * Two properties are asserted, and the second is the one that bites:
 *
 *  1. The relay reaches the client as runtime config (`__SUPERCONFIG__`), not as
 *     an unsubstituted `$NOSTR_RELAY_URLS` placeholder.
 *  2. The same relay origin reaches the CSP `connect-src`.
 *
 * They must come from the SAME source. `server/index.cjs` derives both from the
 * runtime env var, so setting only the build-time `VITE_NOSTR_RELAY_URLS` yields
 * a bundle that knows the relay and a CSP that forbids it — the UI renders
 * perfectly and every socket dies at connect time. Hence: configure the
 * container's runtime env, never just the build arg.
 *
 * Run against the Express server (which does the injection), not `npm run dev`:
 *
 *   npm run build
 *   NOSTR_RELAY_URLS=wss://relay.superhero.chat NODE_ENV=production PORT=4178 \
 *     node server/index.cjs
 *   CHAT_BASE_URL=http://localhost:4178 npx playwright test e2e/chat-availability.spec.ts
 */

const BASE = process.env.CHAT_BASE_URL || 'http://localhost:4178';

/** The relay the deployment is expected to advertise. */
const EXPECTED_RELAY = process.env.CHAT_EXPECTED_RELAY || 'wss://relay.superhero.chat';

async function gotoChat(page: Page) {
  await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' });
  // The inbox is a lazy route behind a Suspense boundary.
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * The raw runtime injection.
 *
 * NOTE this is NOT the same as "the relays chat will use". The relay has a
 * built-in default (`COMMON_CONFIG.NOSTR_RELAY_URLS`), so a deployment that sets
 * no env var serves `''` here and still has chat enabled from the bundle. Use
 * this only to assert the substitution contract (no `$PLACEHOLDER` leaking
 * through); use the rendered UI to decide whether chat is actually on.
 */
async function injectedRelayValue(page: Page): Promise<string | undefined> {
  return page.evaluate(
    // eslint-disable-next-line no-underscore-dangle
    () => (window as unknown as { __SUPERCONFIG__?: Record<string, string> })
      .__SUPERCONFIG__?.NOSTR_RELAY_URLS,
  );
}

/** The CSP `connect-src` list served with the chat route. */
async function connectSrc(page: Page): Promise<string> {
  const response = await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' });
  const csp = response?.headers()['content-security-policy'] ?? '';
  return /connect-src ([^;]*)/.exec(csp)?.[1] ?? '';
}

test.describe('chat deploy configuration', () => {
  test('never serves an unsubstituted $PLACEHOLDER', async ({ page }) => {
    // The production bug this file exists for: envsubst not running leaves a
    // literal '$NOSTR_RELAY_URLS' in the HTML. `isPlaceholder()` in config.ts
    // discards it, so chat silently falls back to the built-in default — fine
    // today, but it means a deployment that MEANT to repoint the relay would be
    // ignored without any signal. Fail loudly instead.
    await gotoChat(page);
    const injected = await injectedRelayValue(page);

    expect(injected ?? '', 'envsubst did not run — $NOSTR_RELAY_URLS leaked to the client')
      .not.toMatch(/^\$/);
  });

  test('permits the chat relay in the CSP connect-src', async ({ page }) => {
    // The UI can look perfect and still fail at connect time if the header does
    // not permit the socket. server/index.cjs allows CHAT_RELAY_ALLOWLIST
    // unconditionally plus anything from NOSTR_RELAY_URLS, so the default relay
    // must always be present.
    const allowed = await connectSrc(page);

    expect(allowed, 'no CSP connect-src served').not.toBe('');
    expect(allowed).toContain(new URL(EXPECTED_RELAY).origin);
  });
});

test.describe('chat entry points', () => {
  test.beforeEach(async ({ page }) => {
    await gotoChat(page);
  });

  test('does NOT show the unavailable notice', async ({ page }) => {
    // Chat is on by default now, so the notice appearing means the relay default
    // was lost — the exact regression this guards.
    await expect(page.getByText(/chat is unavailable|not available/i)).toHaveCount(0);
  });

  test('shows the "New chat" button', async ({ page }) => {
    // The affordance the user reported missing. It lives below the relay gate in
    // InboxView, so its presence proves the gate opened. Note it renders
    // `disabled` until a wallet is connected (`disabled={!activeAccount}`), which
    // is correct — you cannot start a DM without an identity to send from.
    await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible();
  });

  test('gates the "New chat" button on having an account', async ({ page }) => {
    // No wallet in a fresh browser context, so the button must be present but
    // disabled rather than absent — the user can see chat exists and what to do
    // about it. Clicking is covered by the wallet-onboarding suite, which has a
    // funded account; asserting the dialog here would require the whole
    // onboarding flow and would be testing the wallet, not the relay config.
    await expect(page.getByRole('button', { name: /new chat/i })).toBeDisabled();
  });

  test('renders the inbox tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /all/i }).first()).toBeVisible();
  });
});

test.describe('chat dark-ship (relay explicitly blanked)', () => {
  // The guard against this suite passing vacuously. Chat is on by default, so
  // "off" is now an explicit act: run a server with NOSTR_RELAY_URLS set to the
  // empty string, which config.ts honours via EMPTY_MEANS_OFF.
  //
  //   NOSTR_RELAY_URLS= NODE_ENV=production PORT=4179 node server/index.cjs
  //   CHAT_DARK_BASE_URL=http://localhost:4179 npx playwright test …
  const DARK_BASE = process.env.CHAT_DARK_BASE_URL;

  test.skip(!DARK_BASE, 'set CHAT_DARK_BASE_URL to a deployment with NOSTR_RELAY_URLS=""');

  test('hides the entry points', async ({ page }) => {
    await page.goto(`${DARK_BASE}/chat`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByRole('button', { name: /new chat/i })).toHaveCount(0);
  });
});

test.describe('relay config has a single source', () => {
  test('every relay the client is told about is permitted by the CSP', async ({ page }) => {
    // The drift guard, and the reason this file runs in CI.
    //
    // The client's relay list and the CSP connect-src are produced by different
    // code paths (src/config.ts vs server/index.cjs). If a deployment sets
    // NOSTR_RELAY_URLS to a relay the server does not fold into connect-src, the
    // client gains a relay the header forbids: chat renders, then every socket is
    // blocked. That failure is invisible in a screenshot, so assert it directly.
    const allowed = await connectSrc(page);

    // Whatever the deployment injected, plus the built-in default that ships in
    // the bundle — every one of them must be allowed.
    const injected = (await injectedRelayValue(page)) ?? '';
    const relays = [...new Set([...injected.split(','), EXPECTED_RELAY])]
      .map((s) => s.trim())
      .filter((s) => s.startsWith('wss://') || s.startsWith('ws://'));

    const missing = relays.filter((r) => !allowed.includes(new URL(r).origin));

    expect(
      missing,
      `relays the client may dial but the CSP forbids: ${missing.join(', ')}`
      + ' — sockets will be blocked at runtime. Add the origin to'
      + ' CHAT_RELAY_ALLOWLIST in server/index.cjs, or set NOSTR_RELAY_URLS on the'
      + ' container so relayConnectOrigins() picks it up.',
    ).toEqual([]);
  });
});
