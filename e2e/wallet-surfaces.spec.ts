import { test, expect, Page } from '@playwright/test';
import { addVirtualAuthenticator } from './helpers/webauthn';
import { forceBrowserTab, forceStandalone } from './helpers/display-mode';

/**
 * One sign-in modal, three cards, on both surfaces — and what the middle card means.
 *
 * The passkey wallet is a third kind of account next to "connect the extension"
 * and "connect the wallet app": self-custody, created in-page, with its BIP39
 * seed DERIVED from a platform passkey's PRF output rather than transcribed by
 * the user. The modal that offers it is the same on the website and in the
 * installed PWA: Passkey, Superhero Wallet, AI agent. The only thing that
 * differs is what the wallet card does, and the difference is not cosmetic:
 *
 *  1. Passkey — BOTH surfaces, and the tap on the card runs the ceremony.
 *  2. Wallet card in the installed app — IMPORT (seed phrase / private key),
 *     straight onto the field. The connect handoff is a redirect, and a
 *     redirect out of an installed PWA does not come back cleanly.
 *  3. Wallet card in a browser tab — CONNECT the extension or wallet app,
 *     which signs; this page never sees a secret. No import on the web.
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

/** The three cards, in the one modal both surfaces share. */
const modal = (page: Page) => page.getByRole('dialog');
const passkeyCard = (page: Page) => modal(page).getByRole('button', { name: /^passkey/i });
const walletCard = (page: Page) => modal(page).getByTestId('wallet-option');
const agentCard = (page: Page) => modal(page).getByRole('button', { name: /onboard your ai agent/i });

/** The import flow's first screen — the phrase field, no choice screen before it. */
const importScreen = (page: Page) => page.getByRole('heading', { name: /import your wallet/i })
  .filter({ visible: true });

test.describe('one sign-in modal, three cards, on both surfaces', () => {
  ([
    { name: 'a browser tab', force: forceBrowserTab },
    { name: 'the installed app', force: forceStandalone },
  ] as const).forEach((surface) => {
    test(`${surface.name}: Connect opens the modal with Passkey, Wallet and Agent`, async ({ page }) => {
      // The PWA used to skip this modal and open the onboarding overlay's own
      // choice screen instead — a second, different set of options in front of
      // the same three. Same modal, same cards, same order, everywhere now.
      await surface.force(page);
      const auth = await addVirtualAuthenticator(page);
      await clickConnect(page);

      await expect(passkeyCard(page)).toBeVisible();
      await expect(walletCard(page)).toBeVisible();
      await expect(agentCard(page)).toBeVisible();
      // No onboarding overlay behind or in front of it.
      await expect(chooseScreen(page)).toHaveCount(0);

      // Enabled, not merely present: the passkey card renders disabled with "Not
      // available on this device/browser" wherever no platform authenticator
      // exists, and a regression that hid the wallet again would look like that.
      await expect(passkeyCard(page)).toBeEnabled();
      await expect(passkeyCard(page)).not.toContainText(/not available/i);

      await auth.dispose();
    });
  });
});

test.describe('the wallet card is the one thing that differs', () => {
  test('a browser tab: it expands, under its own header, into Connect', async ({ page }) => {
    await forceBrowserTab(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    await expect(walletCard(page)).toContainText(/connect/i);
    await walletCard(page).click();

    const connect = modal(page).getByRole('button', { name: /connect wallet/i });
    await expect(connect).toBeVisible();
    // Under the wallet card, above the agent card — not appended after the list.
    const walletY = (await walletCard(page).boundingBox())!.y;
    const connectY = (await connect.boundingBox())!.y;
    const agentY = (await agentCard(page).boundingBox())!.y;
    expect(connectY).toBeGreaterThan(walletY);
    expect(connectY).toBeLessThan(agentY);
    // And no way to paste a secret on the web.
    await expect(importScreen(page)).toHaveCount(0);
    await expect(importOption(page)).toHaveCount(0);

    await auth.dispose();
  });

  test('the installed app: it opens the import flow straight onto the phrase field', async ({ page }) => {
    // The connect handoff is a redirect that does not come back cleanly from an
    // installed app, so here the card imports instead — and goes directly to
    // the field, with no choice screen in between.
    await forceStandalone(page);
    const auth = await addVirtualAuthenticator(page);
    await clickConnect(page);

    await expect(walletCard(page)).toContainText(/import/i);
    await walletCard(page).click();

    await expect(importScreen(page)).toBeVisible();
    await expect(chooseScreen(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /connect wallet/i })).toHaveCount(0);

    // Back returns to the modal, not to a choice screen the user never saw.
    await page.getByRole('button', { name: /go back/i }).click();
    await expect(walletCard(page)).toBeVisible();
    await expect(importScreen(page)).toHaveCount(0);

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
    { name: 'the installed app', force: forceStandalone },
    { name: 'a browser tab', force: forceBrowserTab },
  ] as const).forEach((surface) => {
    test(`${surface.name}: tapping Passkey runs the ceremony and produces a signable wallet`, async ({ page }) => {
      test.setTimeout(120_000);

      await surface.force(page);
      const auth = await addVirtualAuthenticator(page);
      test.skip(!auth.prf, 'this Chrome build has no PRF virtual authenticator');
      await clickConnect(page);
      await expect(await inlineManifest(page)).toBeNull();

      // The tap on the card IS the choice: no second screen asking passkey vs
      // phrase vs import, no second tap. Straight into the ceremony.
      await passkeyCard(page).click();
      // Argon2id runs between the ceremony and the next screen. The choice
      // screen must not have appeared along the way.
      await expect(chooseScreen(page)).toHaveCount(0);
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
