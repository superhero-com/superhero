const assert = require('node:assert/strict');
const { join } = require('node:path');
const { assembledFollowing } = require('./assembled-following.cjs');
const { assembledUpload } = require('./assembled-upload.cjs');

exports.assembledCreator = async ({ context, origin, creator, outsider, id, expect, verifyRevoked, upload, social }) => {
  // Only this fresh browser context receives the disposable keys. Product
  // providers, wallet detection, routes, auth endpoints and Studio remain real.
  await context.addInitScript(keys => {
    window.__ownedWalletKeys = keys;
    addEventListener('DOMContentLoaded', () => { import('/assembled-wallet.ts'); }, { once: true });
  }, [creator.secretKey, outsider.secretKey]);
  const page = await context.newPage(), errors = [], reads = [], logouts = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === origin && (url.pathname.startsWith('/api/shorts') || url.pathname.startsWith('/api/social-graph'))) {
      reads.push({ path: url.pathname, status: response.status() });
      if (url.pathname === '/api/shorts/auth/logout') logouts.push(response.status());
    }
  });
  page.on('dialog', dialog => dialog.accept());
  const identity = () => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('account:activeAccount') || 'null'); } catch { return null; }
  });
  const session = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('shorts:creator-session') || 'null'));
  const signed = () => page.evaluate(() => window.__ownedWalletState.signed);
  try {
    await page.goto(origin + '/shorts/studio');
    await expect(page.locator('.ss-sidebar')).toBeVisible({ timeout: 45000 });
    await page.waitForFunction(() => window.__ownedWalletState?.ready);
    await page.locator('.ss-sidebar').getByRole('button', { name: /connect wallet/i }).click();
    await page.getByTestId('wallet-option').click();
    await page.getByRole('dialog').getByRole('button', { name: /^connect wallet$/i }).click();
    await expect.poll(identity, { timeout: 15000 }).toBe(creator.address);
    await expect(page.getByRole('button', { name: 'Open Studio', exact: true })).toBeVisible();
    assert.equal(await signed(), 0, 'connecting the wallet does not authenticate private Studio data');

    // A rejected access signature must not create a session or fetch private data.
    await page.evaluate(() => { window.__ownedWalletState.reject = true; });
    await page.getByRole('button', { name: 'Open Studio', exact: true }).click();
    await expect.poll(signed).toBe(1);
    await expect(page.getByRole('button', { name: 'Open Studio', exact: true })).toBeEnabled();
    assert.equal(await session(), null);
    assert.ok(!reads.some(r => r.path === '/api/shorts/studio/summary' && r.status === 200));

    await page.evaluate(() => { window.__ownedWalletState.reject = false; });
    await page.getByRole('button', { name: 'Open Studio', exact: true }).click();
    await expect.poll(async () => (await session())?.address).toBe(creator.address);
    await expect(page.locator('.ss-main').getByText('Owned fixture', { exact: true }).first()).toBeVisible();
    assert.equal(await signed(), 2);
    const original = await session();
    for (const path of ['content', 'analytics']) {
      await page.locator('.ss-sidebar').getByRole('link', { name: new RegExp('^' + path + '$', 'i') }).click();
      await expect(page).toHaveURL(origin + '/shorts/studio/' + path);
      if (path === 'content') await expect(page.getByRole('region', { name: 'Content library' }).getByText('Owned fixture', { exact: true })).toBeVisible();
      if (path === 'analytics') await expect(page.getByRole('region', { name: 'Performance chart' })).toBeVisible();
      await expect(page.locator('.ss-data-error')).toHaveCount(0);
    }
    assert.equal(await signed(), 2, 'Studio routes share one verified creator session');
    await page.reload();
    await expect.poll(identity, { timeout: 15000 }).toBe(creator.address);
    await expect.poll(async () => page.evaluate(() => window.__ownedWalletState?.connected || 0)).toBe(1);
    await expect(page.getByRole('region', { name: 'Performance chart' })).toBeVisible();
    assert.equal((await session())?.token, original.token, 'reload preserves the current tab session');
    assert.equal(await signed(), 0, 'reload reconnects without another access signature');
    const verifiedBeforeUpload = reads.filter(r => r.path === '/api/shorts/auth/verify').length;
    if (upload) await assembledUpload({ page, origin, expect, ...upload });
    assert.equal(reads.filter(r => r.path === '/api/shorts/auth/verify').length, verifiedBeforeUpload);
    assert.equal(await signed(), 0, 'upload uses the existing creator session without another signature');

    // Real RPC address notification must clear private state and revoke access.
    await page.evaluate(() => window.__ownedWalletState.select(1));
    await expect.poll(identity).toBe(outsider.address);
    await expect.poll(session).toBe(null);
    await expect(page.getByRole('button', { name: 'Open Studio', exact: true })).toBeVisible();
    await expect.poll(() => logouts.filter(status => status === 200).length).toBeGreaterThan(0);
    await verifyRevoked(original.token);
    await page.getByRole('button', { name: 'Open Studio', exact: true }).click();
    await expect.poll(async () => (await session())?.address).toBe(outsider.address);
    await page.locator('.ss-sidebar').getByRole('link', { name: /^content$/i }).click();
    await expect(page.getByRole('region', { name: 'Content library' })).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.ss-main').getByText('Owned fixture', { exact: true })).toHaveCount(0);
    assert.ok(reads.some(r => r.path === '/api/shorts/studio/content' && r.status === 200));
    const denied = await page.evaluate(async id => {
      const token = JSON.parse(sessionStorage.getItem('shorts:creator-session')).token;
      return (await fetch('/api/shorts/studio/video/' + id, { headers: { Authorization: 'Bearer ' + token } })).status;
    }, id);
    assert.equal(denied, 404, 'another wallet cannot open creator-only details');

    // An old wallet reply must not open Studio after a different account became
    // active, even though the signature itself is cryptographically valid.
    await page.evaluate(() => window.__ownedWalletState.select(0));
    await expect.poll(identity).toBe(creator.address); await expect.poll(session).toBe(null);
    const verifies = reads.filter(r => r.path === '/api/shorts/auth/verify').length;
    await page.evaluate(() => { window.__ownedWalletState.hold = true; });
    await page.getByRole('button', { name: 'Open Studio', exact: true }).click();
    await page.waitForFunction(() => typeof window.__ownedWalletState.release === 'function');
    await page.evaluate(() => window.__ownedWalletState.select(1));
    await expect.poll(identity).toBe(outsider.address);
    await page.evaluate(() => { window.__ownedWalletState.hold = false; window.__ownedWalletState.release(); });
    await expect(page.getByRole('button', { name: 'Open Studio', exact: true })).toBeEnabled();
    assert.equal(await session(), null);
    assert.equal(reads.filter(r => r.path === '/api/shorts/auth/verify').length, verifies, 'late signature is rejected before API session creation');
    assert.equal(await page.evaluate(() => window.__ownedWalletState.transactions), 0);
    if (social) await assembledFollowing({ page, origin, creator, outsider, id, expect, identity, social });
    assert.deepEqual(errors, []);
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-creator-switched.png') });
  } catch (error) {
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-creator-failure.png') }).catch(() => {});
    // Never put session tokens or disposable key material in diagnostics.
    error.message += '\n' + JSON.stringify({ errors, reads, body: await page.locator('body').innerText().catch(() => '') });
    throw error;
  } finally { await context.close(); }
};
