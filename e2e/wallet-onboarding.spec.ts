import {
  test, expect, Page, Locator,
} from '@playwright/test';

/**
 * Inline-wallet onboarding — visual-regression baselines (design track DESIGN-05).
 *
 * Every step is captured at an iPhone-13 and a desktop viewport and compared to a
 * committed `toHaveScreenshot` baseline, so a stray token/spacing/button change can
 * no longer silently regress the look. Baselines are the Linux ones generated in the
 * Docker e2e image (`npm run test:e2e:update-snapshots`); regenerate there after any
 * intentional visual change.
 *
 * Non-deterministic regions (the generated recovery phrase, the two verify-word
 * prompts, the recovery code, the first account address) are masked so they don't
 * flip the baseline every run. The transient `creating` (Argon2id) step is a
 * sub-second loader with no stable frame, so it is intentionally not baselined.
 *
 * The onboarding overlay is reached through its real entry point — the Connect
 * Wallet button — not a standalone route. There is no public /wallet-onboarding
 * route; in an installed PWA the button opens this inline flow, so the test forces
 * standalone display-mode (see `forceStandalone`) and clicks Connect Wallet. The
 * overlay is a `fixed inset-0` takeover portalled to <body>, so the captured frame
 * is the same one users see. Driving it here does not enable wallet signing / custody.
 *
 * Set SNAP_DIR=<before|after> to instead write raw per-step PNGs to
 * design/screenshots/<dir>/ (used to produce before/after review montages); in that
 * mode no baseline comparison runs.
 */

const { SNAP_DIR } = process.env;

const VIEWPORTS = [
  { name: 'iphone-13', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

// Make `isStandalone()` (src/utils/displayMode.ts) report an installed PWA by
// stubbing the `(display-mode: standalone)` media query — Playwright can't emulate
// display-mode natively. Runs before the app bundle so ConnectWalletButton reads it
// as standalone on first render and routes Connect Wallet to inline onboarding.
async function forceStandalone(page: Page) {
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

// Open the inline onboarding overlay through the app's real entry point.
async function openOnboarding(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i })
    .filter({ visible: true }).first().click();
}

// A valid BIP-39 phrase (all-`abandon` + `about`) so the import path reaches the
// passphrase step deterministically without depending on generated state.
const GOLDEN_MNEMONIC = 'abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon abandon abandon about';

// 5 words / >=20 chars -> assessPassphrase() rates it "Strong".
const PASSPHRASE = 'correct horse battery staple extra';

async function settle(page: Page) {
  // Let the step's entrance animation finish and fonts load so the frame is stable.
  await page.evaluate(() => (document as Document).fonts.ready);
  await page.waitForTimeout(450);
}

async function snap(page: Page, vp: string, name: string, mask: Locator[] = []) {
  await settle(page);
  if (SNAP_DIR) {
    await page.screenshot({ path: `design/screenshots/${SNAP_DIR}/${name}--${vp}.png` });
  } else {
    await expect(page).toHaveScreenshot(`${name}--${vp}.png`, { mask });
  }
}

VIEWPORTS.forEach((vp) => {
  test.describe(`wallet-onboarding @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.beforeEach(async ({ page }) => { await forceStandalone(page); });

    test('create path — choose -> done -> exists', async ({ page }) => {
      await openOnboarding(page);

      // choose
      await page.getByText('Set up your wallet').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'choose');

      // create-show — mask the generated 12-word grid
      await page.getByRole('button', { name: 'Create a new wallet' }).click();
      await page.getByText('Write down your recovery phrase').waitFor({ state: 'visible' });
      const tiles = await page.locator('div.grid.grid-cols-3 > div').allInnerTexts();
      const words = tiles.map((t) => t.replace(/^\s*\d+\s*/, '').trim());
      await snap(page, vp.name, 'create-show', [page.locator('div.grid.grid-cols-3')]);

      // create-verify — mask the two (randomly chosen) word prompts + inputs
      await page.getByRole('button', { name: "I've written them down" }).click();
      await page.getByText('Confirm your backup').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'create-verify', [
        page.locator('label[for="vw0"]'), page.locator('#vw0'),
        page.locator('label[for="vw1"]'), page.locator('#vw1'),
      ]);
      // Type the requested words to advance. Sequential (not Promise.all): the two
      // fields are React-controlled, so concurrent fills race and corrupt each other.
      const fillWord = async (n: number) => {
        const label = await page.locator(`label[for="vw${n}"]`).innerText();
        const idx = Number(label.match(/\d+/)?.[0]) - 1;
        await page.locator(`#vw${n}`).fill(words[idx]);
      };
      await fillWord(0);
      await fillWord(1);

      // passphrase
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByText('Set a passphrase').waitFor({ state: 'visible' });
      await page.locator('input[type="password"]').nth(0).fill(PASSPHRASE);
      await page.locator('input[type="password"]').nth(1).fill(PASSPHRASE);
      await snap(page, vp.name, 'passphrase');

      // creating (Argon2id) -> protect. No baseline for the transient loader.
      await page.getByRole('button', { name: 'Create wallet' }).click();
      await page.getByText('Unlock with this device').waitFor({ state: 'visible', timeout: 40_000 });
      // Headless has no platform authenticator -> the "passphrase is enough" branch.
      await snap(page, vp.name, 'protect');

      // recovery — mask the one-time code
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByText('Save your recovery code').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'recovery', [page.locator('p.font-mono')]);

      // done — mask the derived address
      await page.locator('#recovery-saved').check();
      await page.getByRole('button', { name: 'Finish setup' }).click();
      await page.getByText('Wallet ready').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'done', [page.locator('p.font-mono')]);

      // exists — the vault now persists; reopening onboarding lands on the unlock
      // hand-off. The account was never adopted (we didn't click "Open wallet"),
      // so the Connect Wallet button is still present to reopen the overlay.
      await page.reload();
      await page.getByRole('button', { name: /connect wallet/i })
        .filter({ visible: true }).first().click();
      await page.getByText('Wallet already set up').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'exists');
    });

    test('import path — choose -> import-enter', async ({ page }) => {
      await openOnboarding(page);
      await page.getByText('Set up your wallet').waitFor({ state: 'visible' });

      await page.getByRole('button', { name: 'Import an existing wallet' }).click();
      await page.getByText('Import your wallet').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'import-enter');

      // Scope to the overlay's phrase field by placeholder — a bare `textarea`
      // selector is ambiguous now that the flow starts from `/`, where the feed
      // post-composer's textarea is also in the document.
      await page.getByPlaceholder('word1 word2 word3 …').fill(GOLDEN_MNEMONIC);
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByText('Set a passphrase').waitFor({ state: 'visible' });
      await snap(page, vp.name, 'import-passphrase');
    });
  });
});
