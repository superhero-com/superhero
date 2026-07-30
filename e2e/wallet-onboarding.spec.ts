import {
  test, expect, Page, TestInfo,
} from '@playwright/test';

/**
 * Inline-wallet onboarding — mobile screenshot baseline (design loop DESIGN-01/05).
 * Capture-only: screenshots are attached to the Playwright HTML report so the design
 * team can review each step; the test only fails on HTTP errors, matching
 * `screenshots.spec.ts`. This walks the deterministic steps (the create-verify step
 * needs the freshly-generated words, so it's out of scope for a stable baseline).
 *
 * The flow lives behind the /wallet-onboarding dev route and is design-scope only —
 * it does not exercise or enable wallet signing / custody.
 */

// iPhone-class portrait viewport — the onboarding is a PWA/mobile takeover.
const MOBILE = { width: 375, height: 812 };

// A valid BIP-39 phrase (all-`abandon` + `about`) so the import path reaches the
// passphrase step deterministically without depending on generated state.
const GOLDEN_MNEMONIC = 'abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon abandon abandon about';

async function attach(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot();
  await testInfo.attach(`wallet-onboarding--${name}.png`, { body, contentType: 'image/png' });
}

test.describe('wallet-onboarding screenshots @ mobile', () => {
  test.use({ viewport: MOBILE });

  test('create path — choose + show-phrase', async ({ page }, testInfo) => {
    const response = await page.goto('/wallet-onboarding');
    expect(response?.status(), '/wallet-onboarding should return HTTP 200').toBe(200);
    await page.getByText('Set up your wallet').waitFor({ state: 'visible' });
    await attach(page, testInfo, 'choose');

    await page.getByText('Create a new wallet').click();
    await page.getByText('Write down your recovery phrase').waitFor({ state: 'visible' });
    await attach(page, testInfo, 'create-show');
  });

  test('import path — enter + passphrase', async ({ page }, testInfo) => {
    const response = await page.goto('/wallet-onboarding');
    expect(response?.status(), '/wallet-onboarding should return HTTP 200').toBe(200);
    await page.getByText('Set up your wallet').waitFor({ state: 'visible' });

    await page.getByText('Import an existing wallet').click();
    await page.getByText('Import your wallet').waitFor({ state: 'visible' });
    await attach(page, testInfo, 'import-enter');

    await page.locator('textarea').fill(GOLDEN_MNEMONIC);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Set a passphrase').waitFor({ state: 'visible' });
    await attach(page, testInfo, 'passphrase');
  });
});
