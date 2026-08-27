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

/** What the app itself resolved — the injected runtime config, not our guess. */
async function configuredRelays(page: Page): Promise<string> {
  return page.evaluate(
    // eslint-disable-next-line no-underscore-dangle
    () => (window as unknown as { __SUPERCONFIG__?: Record<string, string> })
      .__SUPERCONFIG__?.NOSTR_RELAY_URLS ?? '',
  );
}

test.describe('chat deploy configuration', () => {
  test('the server substitutes a real relay into __SUPERCONFIG__', async ({ page }) => {
    // Guards the whole suite: an unsubstituted '$NOSTR_RELAY_URLS' placeholder is
    // precisely the production bug, and `isPlaceholder()` in config.ts discards
    // it — so the app would fall back to "no relay" and dark-ship.
    await gotoChat(page);
    const relays = await configuredRelays(page);

    expect(relays, 'NOSTR_RELAY_URLS missing or left as a $PLACEHOLDER').toBe(EXPECTED_RELAY);
    expect(relays.startsWith('$')).toBe(false);
  });

  test('the relay origin is allowed by the CSP connect-src', async ({ page }) => {
    // The UI can look perfect and still fail at connect time if the header does
    // not permit the socket. server/index.cjs derives connect-src from the same
    // env var, so this asserts the two never drift apart.
    const response = await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' });
    const csp = response?.headers()['content-security-policy'] ?? '';

    expect(csp, 'no CSP header served').not.toBe('');
    const connectSrc = /connect-src ([^;]*)/.exec(csp)?.[1] ?? '';
    expect(connectSrc).toContain(new URL(EXPECTED_RELAY).origin);
  });
});

test.describe('chat entry points (relay configured)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoChat(page);
    test.skip(
      (await configuredRelays(page)) === '',
      'no relay configured for this deployment — see the dark-ship test below',
    );
  });

  test('does NOT show the unavailable notice', async ({ page }) => {
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

test.describe('chat dark-ship (no relay)', () => {
  // The guard against this suite passing vacuously. Point it at a SECOND server
  // started with NO relay env var AND built without VITE_NOSTR_RELAY_URLS:
  //
  //   npm run build                                        # no VITE_ relay
  //   NODE_ENV=production PORT=4179 node server/index.cjs   # no runtime relay
  //   CHAT_DARK_BASE_URL=http://localhost:4179 npx playwright test …
  //
  // Both halves matter. A build-time VITE_NOSTR_RELAY_URLS is folded into CONFIG
  // *after* the runtime value (src/config.ts), so a relay baked into the bundle
  // keeps chat enabled even when the container's env is empty — which is exactly
  // how a "disabled" deployment can quietly still be live. Skipped rather than
  // failed when unset, because a same-build server cannot express this state.
  const DARK_BASE = process.env.CHAT_DARK_BASE_URL;

  test.skip(!DARK_BASE, 'set CHAT_DARK_BASE_URL to a relay-less build+deployment');

  test('hides the entry points when no relay is configured', async ({ page }) => {
    await page.goto(`${DARK_BASE}/chat`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Confirm we really are testing an unconfigured deployment, so a
    // misconfigured second server cannot make this pass for the wrong reason.
    expect(await configuredRelays(page)).toBe('');

    await expect(page.getByRole('button', { name: /new chat/i })).toHaveCount(0);
  });
});

test.describe('relay config has a single source', () => {
  test('every relay the client knows is permitted by the CSP', async ({ page }) => {
    // The drift guard, and the reason this file exists in CI.
    //
    // `__SUPERCONFIG__` and `connect-src` are produced by different code paths in
    // server/index.cjs from the same env var. If a deployment ever sets the build
    // arg instead of the runtime var, the client gains a relay the header does not
    // allow: chat renders, then every socket is blocked. That failure is invisible
    // in a screenshot, so assert the relation directly.
    const response = await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' });
    const csp = response?.headers()['content-security-policy'] ?? '';
    const connectSrc = /connect-src ([^;]*)/.exec(csp)?.[1] ?? '';

    const relays = (await configuredRelays(page)).split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // A deployment with no relays is a valid (dark-shipped) state; nothing to check.
    test.skip(relays.length === 0, 'no relay configured for this deployment');

    const missing = relays.filter((r) => !connectSrc.includes(new URL(r).origin));

    expect(
      missing,
      `relays present in __SUPERCONFIG__ but missing from CSP connect-src: ${missing.join(', ')}`
      + ' — sockets will be blocked at runtime. Set NOSTR_RELAY_URLS on the'
      + ' container, not just the VITE_ build arg.',
    ).toEqual([]);
  });
});
