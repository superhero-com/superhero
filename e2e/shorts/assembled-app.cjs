// Loads main.tsx/App and the real route tree. Public API/media are the owned
// assembled services; no widget, hook, route, feed response or player is mocked.
const assert = require('node:assert/strict');
const { join } = require('node:path');

exports.assembledApp = async ({ page, origin, id, expect, errors, changeVisibility, notify }) => {
  const reads = [], sockets = [];
  const response = value => {
    const url = new URL(value.url());
    if (url.origin === origin && url.pathname.startsWith('/api/shorts')) reads.push({ path: url.pathname, status: value.status() });
  };
  const socket = value => {
    if (value.url().includes('/shorts/socket.io')) value.on('framereceived', frame => sockets.push(String(frame.payload)));
  };
  page.on('response', response); page.on('websocket', socket);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(origin + '/shorts');
    await expect(page.locator('.sv-toolbar')).toBeVisible({ timeout: 45000 });
    assert.equal(await page.evaluate(async () => (await import('/src/config.ts')).CONFIG.NETWORK), 'ae_uat');
    const video = page.locator('.sv-slide:not([inert]) video');
    const playable = async () => expect.poll(() => video.evaluateAll(elements => {
      const v = elements[0]; return !!v && !v.paused && v.readyState >= 2 && v.videoWidth > 0 && v.currentTime > 0;
    }), { timeout: 20000 }).toBe(true);
    await playable();
    await expect(page.locator('.sv-slide:not([inert]) .sv-creator-identity')).toHaveCount(1);
    assert.ok(reads.some(read => read.path === '/api/shorts/feed' && read.status === 200));
    await expect.poll(() => sockets.some(frame => frame.startsWith('40/shorts,')), { timeout: 10000 }).toBe(true);
    await page.getByRole('button', { name: 'Save Short', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unsave Short', exact: true })).toBeVisible();
    async function mode(name) {
      await page.locator('.sv-discover').click();
      const dialog = page.getByRole('dialog', { name: 'Discover Shorts' });
      await dialog.getByRole('button', { name, exact: true }).click();
      await dialog.getByRole('button', { name: 'Close topics' }).click();
    }
    await mode('saved'); await playable();
    assert.ok(reads.some(read => read.path === '/api/shorts/feed/state' && read.status === 200));
    await page.reload(); await playable();
    await expect(page.locator('.sv-discover')).toHaveText('Saved');
    await page.getByRole('button', { name: 'Unsave Short', exact: true }).click();
    await expect(page.locator('.sv-slide video')).toHaveCount(0);
    await mode('following');
    await expect(page.locator('.sv-empty').getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    assert.ok(!reads.some(read => read.path === '/api/shorts/feed/following'), 'guest does not request another account’s Following');
    await mode('recent'); await playable();
    await page.getByRole('button', { name: 'Pause video', exact: true }).click();
    await page.evaluate(() => { window.__refreshedShortsVideo = document.querySelector('.sv-slide:not([inert]) video'); });
    const before = reads.filter(read => read.path === '/api/shorts/feed/state').length;
    await notify();
    await expect.poll(() => reads.filter(read => read.path === '/api/shorts/feed/state').length, { timeout: 10000 }).toBeGreaterThan(before);
    assert.equal(await page.evaluate(() => window.__refreshedShortsVideo === document.querySelector('.sv-slide:not([inert]) video') && window.__refreshedShortsVideo.paused), true);
    await page.getByRole('button', { name: 'Play video', exact: true }).click(); await playable();
    try {
      await changeVisibility(false);
      await expect(page.locator('.sv-slide video')).toHaveCount(0, { timeout: 10000 });
      assert.equal(await page.evaluate(() => window.__refreshedShortsVideo.paused && !window.__refreshedShortsVideo.hasAttribute('src')), true);
    } finally { await changeVisibility(true); }
    // Refresh explicitly discovers new/returned candidates; the loaded-window
    // event refresh never pulls the viewer back to the start of the catalog.
    await page.getByRole('button', { name: 'Refresh Shorts feed' }).click(); await playable();
    await page.evaluate(() => { window.__oldShortsVideo = document.querySelector('.sv-slide:not([inert]) video'); });
    await page.getByRole('button', { name: 'Creator studio', exact: true }).click();
    await expect(page).toHaveURL(origin + '/shorts/studio');
    await expect(page.getByText('Connect using the wallet button in the Studio navigation to see your account.')).toBeVisible();
    assert.equal(await page.evaluate(() => window.__oldShortsVideo.paused && !window.__oldShortsVideo.hasAttribute('src')), true);
    await page.getByRole('link', { name: 'Back to Shorts', exact: true }).click(); await playable();
    await page.goto(origin + '/shorts?short=' + id); await playable();
    const pagesBefore = reads.filter(read => read.path === '/api/shorts/feed').length;
    await page.getByRole('link', { name: 'Back to feed', exact: true }).click();
    await expect.poll(() => reads.filter(read => read.path === '/api/shorts/feed').length, { timeout: 10000 }).toBeGreaterThan(pagesBefore);
    await expect(page.locator('.sv-empty')).toHaveCount(0); await playable();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      // The app's global layout transition can outlive setViewportSize. Check
      // the actual available viewport, not just the absence of page overflow.
      await expect.poll(async () => {
        const box = await page.locator('.shorts-watching').boundingBox();
        const left = width < 1024 ? 0 : 256;
        return !!box && Math.abs(box.x - left) < 1 && Math.abs(box.width - (width - left)) < 1;
      }, { timeout: 5000 }).toBe(true);
      await playable(); await expect(page.locator('.sv-empty')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Pause video', exact: true })).toBeVisible();
      const identity = page.locator('.sv-slide:not([inert]) .sv-creator-identity');
      await expect(identity).toBeVisible();
      assert.equal(await identity.evaluate(element => element.scrollWidth > element.clientWidth + 1), false, 'full creator identity fits');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, `shorts-app-${width}.png`) });
    }
    assert.deepEqual(errors, []);
  } catch (error) {
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-app-failure.png') }).catch(() => {});
    error.message += '\n' + JSON.stringify({ errors, reads, body: await page.locator('body').innerText().catch(() => '') });
    throw error;
  } finally { page.off('response', response); page.off('websocket', socket); }
};
