import {
  test, expect, devices, Page,
} from '@playwright/test';

/**
 * The sign prompt must be usable while the Send sheet is open behind it.
 *
 * This drives the reported path end to end in a real browser: onboard a real
 * inline wallet, open the profile Send sheet, enter an address and an amount,
 * press Send, and then actually USE the confirmation prompt. Playwright's
 * actionability checks are the point — `click()` and `fill()` hit-test the
 * element, so a prompt that paints on top while being dead to input (the bug)
 * fails here, where a jsdom test cannot see it at all.
 *
 * The node is stubbed at the HTTP layer: a spend needs a nonce and a height
 * before it can be signed, and the prompt appears BEFORE anything is
 * broadcast. Stubbing keeps the test offline-deterministic and guarantees no
 * transaction can ever leave it.
 *
 * Set SNAP_DIR=<dir> to also write raw PNGs to design/screenshots/<dir>/.
 */

const { SNAP_DIR } = process.env;

// A real, checksum-valid address (the one on the ticket that opened this
// feature). A merely well-shaped `ak_…` is not enough: the app accepts it but
// the SDK rejects it while decoding, before a signature is ever requested.
const RECIPIENT = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';
const PASSPHRASE = 'correct horse battery staple extra';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...IPHONE } = devices['iPhone 13'];

// `isStandalone()` is the sole inline-wallet gate and Playwright cannot emulate
// display-mode, so stub the media query before the bundle loads.
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

/**
 * The freshly onboarded account is empty and unknown to the chain, so the node's
 * own answer for it would fail the balance check and the nonce lookup before a
 * signature is ever requested. Fund exactly that one account read; every other
 * node/middleware call goes to the real testnet.
 */
async function fundAccount(page: Page, address: string) {
  await page.route(
    (url) => url.pathname === `/v3/accounts/${address}`,
    (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: address, balance: '1000000000000000000000', nonce: 3, kind: 'basic',
      }),
    }),
  );
}

/** Nothing may be broadcast: the prompt is reached before any POST. */
async function blockBroadcast(page: Page) {
  await page.route(
    (url) => url.pathname.endsWith('/v3/transactions'),
    (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()),
  );
}

/** Real onboarding, create path. Returns the address the wallet derived. */
async function onboardInlineWallet(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i })
    .filter({ visible: true }).first().click();

  await page.getByText('Set up your wallet').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Create a new wallet' }).click();
  await page.getByText('Write down your recovery phrase').waitFor({ state: 'visible' });

  const tiles = await page.locator('div.grid.grid-cols-3 > div').allInnerTexts();
  const words = tiles.map((t) => t.replace(/^\s*\d+\s*/, '').trim());

  await page.getByRole('button', { name: "I've written them down" }).click();
  await page.getByText('Confirm your backup').waitFor({ state: 'visible' });
  // Sequential: both fields are React-controlled and concurrent fills race.
  for (let n = 0; n < 2; n += 1) {
    // eslint-disable-next-line no-await-in-loop
    const label = await page.locator(`label[for="vw${n}"]`).innerText();
    const idx = Number(label.match(/\d+/)?.[0]) - 1;
    // eslint-disable-next-line no-await-in-loop
    await page.locator(`#vw${n}`).fill(words[idx]);
  }

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Set a passphrase').waitFor({ state: 'visible' });
  await page.locator('input[type="password"]').nth(0).fill(PASSPHRASE);
  await page.locator('input[type="password"]').nth(1).fill(PASSPHRASE);

  // Argon2id — slow on purpose.
  await page.getByRole('button', { name: 'Create wallet' }).click();
  await page.getByText('Unlock with this device').waitFor({ state: 'visible', timeout: 60_000 });

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Save your recovery code').waitFor({ state: 'visible' });
  await page.locator('#recovery-saved').check();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await page.getByText('Wallet ready').waitFor({ state: 'visible' });

  const address = (await page.locator('p.font-mono.text-emerald-400').innerText()).trim();
  await page.getByRole('button', { name: 'Open wallet' }).click();

  // Connect it the same way `profile-send-receive.spec.ts` does — through
  // `account:activeAccount`, the storage key behind `activeAccountAtom`. The
  // encrypted vault and the cleartext manifest onboarding just wrote are what
  // make this a real INLINE account rather than a delegated one, and they
  // survive the reload on their own.
  await page.evaluate((activeAccount) => {
    window.localStorage.setItem('onboarding:skip', 'true');
    window.localStorage.setItem('account:activeAccount', JSON.stringify(activeAccount));
  }, address);

  return address;
}

test.describe('sign prompt over the Send sheet @ mobile PWA', () => {
  test.use(IPHONE);

  test('the confirmation prompt is usable while Send stays open', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await forceStandalone(page);
    await blockBroadcast(page);

    const address = await onboardInlineWallet(page);
    expect(address).toMatch(/^ak_/);
    await fundAccount(page, address);

    await page.goto(`/users/${address}`);
    await page.getByTestId('profile-send-button').click();

    await page.getByLabel('Recipient').fill(RECIPIENT);
    await page.getByLabel(/Amount \(AE\)/).fill('0.5');
    await page.getByTestId('send-submit').click();

    // The Send sheet deliberately stays mounted behind the prompt — that is what
    // put a Radix modal between the user and the confirmation in the first place.
    const prompt = page.getByText('Confirm this transaction');
    await expect(prompt).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('send-submit')).toBeVisible();

    const shot = await page.screenshot({ type: 'png' });
    await testInfo.attach('sign-prompt-over-send-sheet.png', { body: shot, contentType: 'image/png' });
    if (SNAP_DIR) {
      await page.screenshot({ path: `design/screenshots/${SNAP_DIR}/sign-prompt-over-send-sheet.png` });
    }

    // The regression, stated as behaviour: the controls answer a real pointer.
    // `click()` hit-tests — it resolves what is actually at those coordinates —
    // so a prompt painted on top of a sheet that has taken `pointer-events` away
    // from <body> fails here exactly the way a thumb does.
    const promptDialog = page.locator('[role="dialog"]')
      .filter({ hasText: 'Confirm this transaction' });
    const secret = promptDialog.locator('#wallet-unlock-secret');

    await secret.click({ timeout: 10_000 });
    await expect(secret).toBeFocused();
    await secret.fill(PASSPHRASE);
    await expect(secret).toHaveValue(PASSPHRASE);

    // Cancel settles the request and hands the sheet back, still usable. Scoped
    // to the prompt — the sheet has a Cancel of its own, disabled while signing.
    await promptDialog.getByRole('button', { name: /^Cancel$/ }).click({ timeout: 10_000 });
    await expect(prompt).toBeHidden();
    await expect(page.getByLabel('Recipient')).toHaveValue(RECIPIENT);
  });
});
