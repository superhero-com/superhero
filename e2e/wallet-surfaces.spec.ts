import { test, expect, Page } from '@playwright/test';
import { addVirtualAuthenticator } from './helpers/webauthn';
import { forceBrowserTab, forceStandalone } from './helpers/display-mode';

/**
 * Which way in you get, per surface.
 *
 * The passkey wallet is a third kind of account next to "connect the extension"
 * and "connect the wallet app": self-custody, created in-page, with its BIP39
 * seed DERIVED from a platform passkey's PRF output rather than transcribed by
 * the user. It exists on both the website and the installed PWA, but the other
 * ways in do not, and the split is not cosmetic:
 *
 *  1. Passkey — BOTH surfaces. Nothing is typed, nothing redirects.
 *  2. Import an existing wallet (seed phrase / private key) — PWA ONLY. In a
 *     browser tab the answer to "I already have a wallet" is Connect, which
 *     hands signing to the extension or wallet app and never sees the secret.
 *  3. Connect an external wallet — WEB ONLY. That handoff is a redirect, and a
 *     redirect out of an installed PWA does not come back cleanly, which is
 *     exactly why the app takes the key directly instead.
 *  4. Chat — PWA ONLY. It derives a Nostr identity from the wallet seed and
 *     keeps key material in client storage; a browser tab has no durable store
 *     for it (Safari's 7-day ITP eviction, "clear browsing data"), and losing
 *     that key silently loses the ability to decrypt your own history.
 *
 * Every one of these fails INVISIBLY when it regresses — an option that should
 * not be there works right up until the user needs the key back, and an option
 * that vanished just looks like a shorter list. Hence pinning them here, both
 * directions, on the real surfaces rather than in a unit test of the predicate.
 *
 * These tests need a virtual authenticator (headless Chromium has none, so the
 * Passkey card would render disabled) and a dev server whose VITE_WEBAUTHN_RP_ID
 * matches its origin — see playwright.config.ts.
 */

/** Open whichever entry point this surface offers, without asserting where it lands. */
async function clickConnect(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i })
    .filter({ visible: true }).first().click();
}

/**
 * The inline onboarding overlay's first screen.
 *
 * Anchored on the screen's own copy rather than its "Set up your wallet"
 * heading: Radix renders a second, screen-reader-only copy of the dialog title,
 * and being 1px rather than `display: none` it satisfies a visibility filter
 * too — so any role query for the heading is a strict-mode violation.
 */
const chooseScreen = (page: Page) => page.getByText(/your keys stay on this device, encrypted/i);
const importOption = (page: Page) => page.getByRole('button', { name: /import an existing wallet/i });

test.describe('the passkey wallet is offered on both surfaces', () => {
  test('a browser tab lists Passkey in the connect modal, ready to use', async ({ page }) => {
    await forceBrowserTab(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    const modal = page.getByRole('dialog');
    const passkey = modal.getByRole('button', { name: /^passkey/i });

    await expect(passkey).toBeVisible();
    // Enabled, not merely present: the card renders disabled with "Not available
    // on this device/browser" wherever no platform authenticator exists, and a
    // regression that hid the wallet again would look exactly like that.
    await expect(passkey).toBeEnabled();
    await expect(passkey).not.toContainText(/not available/i);

    await auth.dispose();
  });

  test('the installed app opens onboarding straight onto the passkey option', async ({ page }) => {
    await forceStandalone(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    await expect(chooseScreen(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with passkey/i })).toBeEnabled();

    await auth.dispose();
  });
});

test.describe('importing an existing wallet is PWA-only', () => {
  test('the installed app offers Import', async ({ page }) => {
    await forceStandalone(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    await expect(chooseScreen(page)).toBeVisible();
    await expect(importOption(page)).toBeVisible();

    await auth.dispose();
  });

  test('a browser tab reaches the same screen with no way to paste a secret', async ({ page }) => {
    // Same screen, one surface apart — reached in a tab by tapping Passkey with
    // no vault on the device, which hands off to this overlay. Asserting the
    // screen is present before asserting the absence is what stops this passing
    // vacuously on a screen that never rendered.
    await forceBrowserTab(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);
    await page.getByRole('dialog').getByRole('button', { name: /^passkey/i }).click();

    await expect(chooseScreen(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with passkey/i })).toBeVisible();
    await expect(importOption(page)).toHaveCount(0);

    await auth.dispose();
  });
});

test.describe('connecting an external wallet is web-only', () => {
  test('a browser tab offers the Superhero Wallet handoff', async ({ page }) => {
    await forceBrowserTab(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    await expect(page.getByRole('dialog').getByText(/superhero wallet/i).first()).toBeVisible();

    await auth.dispose();
  });

  test('the installed app never offers it — Connect goes to the in-page wallet', async ({ page }) => {
    // The redirect that does not come back. Connect must not open the modal at
    // all here, so this asserts the routing, not just the absence of a card.
    await forceStandalone(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    await expect(chooseScreen(page)).toBeVisible();
    await expect(page.getByText(/browser extension or mobile app/i)).toHaveCount(0);

    await auth.dispose();
  });
});

test.describe('chat is PWA-only', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the installed app shows Chat in the footer', async ({ page }) => {
    await forceStandalone(page);
    await page.goto('/');

    await expect(page.getByRole('link', { name: /^chat$/i })).toBeVisible();
  });

  test('a mobile browser tab does not', async ({ page }) => {
    // The unsafe direction: a tab has no durable store for the Nostr key.
    await forceBrowserTab(page);
    await page.goto('/');

    // Anchor on a sibling item so this cannot pass because the footer is missing.
    await expect(page.getByRole('link', { name: /^home$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^chat$/i })).toHaveCount(0);
  });
});

/**
 * The manifest `inlineSignerIndex` reads (features/wallet/manifest-store.ts).
 * Cleartext by design — public addresses and indices only — and it is the single
 * test deciding "in-page signer vs the delegated relay", so its contents are the
 * real proof that a created wallet is one this device will sign for.
 */
async function inlineManifest(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('wallet.inlineManifest');
    return raw ? JSON.parse(raw) as { accounts: { index: number; address: string }[] } : null;
  });
}

test.describe('the passkey wallet can actually be created', () => {
  // One ceremony, no seed screen, a sealed vault at the end. The PRF extension
  // is what makes that possible — the BIP39 seed is derived from its output — so
  // skip rather than fail where the virtual authenticator cannot offer it.
  ([
    // `viaModal` is the entry path, not a detail: in a tab Connect opens the
    // modal and the overlay is reached through its Passkey card, while in the
    // app Connect opens the overlay directly. Stated per surface rather than
    // sniffed at runtime — a locator count taken before the dialog renders is
    // zero, which silently skips the click and fails much further down.
    { name: 'the installed app', force: forceStandalone, viaModal: false },
    { name: 'a browser tab', force: forceBrowserTab, viaModal: true },
  ] as const).forEach((surface) => {
    test(`${surface.name}: a passkey ceremony produces a signable wallet, nothing transcribed`, async ({ page }) => {
      test.setTimeout(120_000);

      await surface.force(page);
      const auth = await addVirtualAuthenticator(page);
      test.skip(!auth.prf, 'this Chrome build has no PRF virtual authenticator');
      await clickConnect(page);

      if (surface.viaModal) {
        await page.getByRole('dialog').getByRole('button', { name: /^passkey/i }).click();
      }

      await expect(chooseScreen(page)).toBeVisible();
      await expect(await inlineManifest(page)).toBeNull();

      await page.getByRole('button', { name: /continue with passkey/i }).click();

      // Argon2id runs between the ceremony and the next screen.
      await expect(page.getByRole('heading', { name: /save your recovery code/i }))
        .toBeVisible({ timeout: 90_000 });
      await expect(page.getByText(/^[0-9A-F]{4}(-[0-9A-F]{4}){5,}$/)).toBeVisible();

      // Nothing was transcribed: the seed is recoverable from the passkey, so
      // the twelve-word backup and its verify step are skipped entirely.
      await expect(page.getByText(/write .*down|recovery phrase.*below/i)).toHaveCount(0);

      // The wallet is real, and it is one this device signs for: an entry here
      // is exactly what makes `inlineSignerIndex` return an index instead of
      // handing the account to the external-wallet relay. The browser-tab case
      // is the regression guard for that — the signer used to refuse outside an
      // installed PWA, so a wallet created here signed with a key it did not
      // hold.
      const manifest = await inlineManifest(page);
      expect(manifest?.accounts).toHaveLength(1);
      expect(manifest?.accounts[0]).toMatchObject({ index: 0 });
      expect(manifest?.accounts[0].address).toMatch(/^ak_[1-9A-HJ-NP-Za-km-z]{40,}$/);

      await auth.dispose();
    });
  });
});
