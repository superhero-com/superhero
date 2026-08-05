import { test, expect, Page } from '@playwright/test';

/**
 * Profile Send / Receive (ZIX-561).
 *
 * The pair is an installed-PWA surface, so every test forces standalone
 * display-mode the same way `wallet-onboarding.spec.ts` does — Playwright cannot
 * emulate `display-mode` natively.
 *
 * The connected account is seeded through `account:activeAccount`, the storage
 * key behind `activeAccountAtom` (`getOnInit: true`, so it is read on the first
 * render). That gives a logged-in profile without driving a wallet; it is enough
 * to render and open both sheets. It is NOT enough to broadcast a transaction —
 * signing still needs a real wallet, and this suite deliberately stops short of
 * it.
 *
 * Set SNAP_DIR=<dir> to write raw PNGs to design/screenshots/<dir>/ for review
 * montages; otherwise the tests only assert behaviour and attach captures to the
 * HTML report.
 */

const { SNAP_DIR } = process.env;

const ACCOUNT = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';
const OTHER = 'ak_2VvB4fFu7BQoJvDs2gyLRcUxAKf6oQBFCLyCyLquTG7Nhtd6Ry';

async function prepare(page: Page, { standalone = true, account = ACCOUNT } = {}) {
  await page.addInitScript(
    ({ isStandalone, activeAccount }) => {
      window.localStorage.setItem('onboarding:skip', 'true');
      if (activeAccount) {
        window.localStorage.setItem('account:activeAccount', JSON.stringify(activeAccount));
      }
      if (!isStandalone) return;
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
    },
    { isStandalone: standalone, activeAccount: account },
  );
}

async function openProfile(page: Page, address: string) {
  await page.goto(`/users/${address}`);
  await page.locator('#root').waitFor({ state: 'visible' });
  await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible' });
}

async function capture(page: Page, testInfo: any, name: string) {
  await page.evaluate(() => (document as Document).fonts.ready);
  await page.waitForTimeout(400);
  const body = await page.screenshot({ type: 'png' });
  if (SNAP_DIR) {
    await page.screenshot({ path: `design/screenshots/${SNAP_DIR}/${name}.png` });
  }
  await testInfo.attach(`${name}.png`, { body, contentType: 'image/png' });
}

test.describe('profile send/receive @ mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('own profile offers both actions and opens each sheet', async ({ page }, testInfo) => {
    await prepare(page);
    await openProfile(page, ACCOUNT);

    const send = page.getByTestId('profile-send-button');
    const receive = page.getByTestId('profile-receive-button');
    await expect(send).toBeVisible();
    await expect(receive).toBeVisible();
    await capture(page, testInfo, 'profile-actions');

    await receive.click();
    await expect(page.getByTestId('qr-code')).toBeVisible();
    // The QR must carry the account itself — a wrong payload is invisible to
    // the eye but sends someone else's funds nowhere.
    await expect(page.getByText(ACCOUNT).first()).toBeVisible();
    await capture(page, testInfo, 'receive-sheet');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('qr-code')).toBeHidden();

    await send.click();
    const recipient = page.getByLabel('Recipient');
    await expect(recipient).toBeVisible();
    // Opened from your own profile the recipient starts empty — this is
    // "send to anyone", not "send to yourself".
    await expect(recipient).toHaveValue('');
    await expect(page.getByTestId('send-submit')).toBeDisabled();
    await capture(page, testInfo, 'send-sheet');

    await recipient.fill(OTHER);
    await page.getByLabel(/Amount \(AE\)/).fill('1');
    await capture(page, testInfo, 'send-sheet-filled');
  });

  test("someone else's profile pre-addresses Send and hides Receive", async ({ page }) => {
    await prepare(page);
    await openProfile(page, OTHER);

    await expect(page.getByTestId('profile-send-button')).toBeVisible();
    await expect(page.getByTestId('profile-receive-button')).toHaveCount(0);

    await page.getByTestId('profile-send-button').click();
    await expect(page.getByLabel('Recipient')).toHaveValue(OTHER);
  });

  test('a plain browser tab shows neither action', async ({ page }) => {
    await prepare(page, { standalone: false });
    await openProfile(page, ACCOUNT);

    await expect(page.getByTestId('profile-send-button')).toHaveCount(0);
    await expect(page.getByTestId('profile-receive-button')).toHaveCount(0);
  });

  test('a signed-out PWA shows neither action', async ({ page }) => {
    await prepare(page, { account: '' });
    await openProfile(page, ACCOUNT);

    await expect(page.getByTestId('profile-send-button')).toHaveCount(0);
    await expect(page.getByTestId('profile-receive-button')).toHaveCount(0);
  });
});

test.describe('profile send/receive @ desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('renders the action pair beside the profile header', async ({ page }, testInfo) => {
    await prepare(page);
    await openProfile(page, ACCOUNT);

    await expect(page.getByTestId('profile-send-button')).toBeVisible();
    await expect(page.getByTestId('profile-receive-button')).toBeVisible();
    await capture(page, testInfo, 'profile-actions-desktop');
  });
});
