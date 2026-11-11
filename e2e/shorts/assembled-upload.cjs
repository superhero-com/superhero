// The actual creator form and recovery hooks drive every upload/publication
// request. Only scanner approval and the external signer observation are fixtures.
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { stat } = require('node:fs/promises');

exports.assembledUpload = async ({ page, origin, expect, input, startWorker, approve, queued, confirm, startPlayback, retire }) => {
  const partCount = Math.ceil((await stat(input)).size / 1048576);
  const title = 'Browser upload recovery fixture';
  const creates = [], parts = [], finishes = [], publications = [];
  const observe = request => {
    const url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'POST') return;
    if (url.pathname === '/api/shorts/uploads') creates.push(url.pathname);
    if (/\/uploads\/[^/]+\/parts\/[^/]+\/complete$/.test(url.pathname)) parts.push(url.pathname);
    if (/\/uploads\/[^/]+\/finish$/.test(url.pathname)) finishes.push(url.pathname);
    if (/^\/api\/shorts\/[^/]+\/publish$/.test(url.pathname)) publications.push(url.pathname);
  };
  page.on('request', observe);
  let id, stopWorker, finishAccepted = false;
  const overlay = page.getByRole('region', { name: 'Publishing your Short', exact: true });
  async function fill() {
    await expect(page.getByLabel('Video file', { exact: true })).toBeEnabled();
    await page.getByLabel('Video file', { exact: true }).setInputFiles(input);
    await page.getByRole('button', { name: 'Next: Details', exact: true }).click();
    await page.locator('#short-title').fill(title);
    await page.getByRole('combobox', { name: 'Main topic', exact: true }).selectOption('Art');
    await page.getByRole('checkbox', { name: 'I have the rights to publish this video and its audio.', exact: true }).check();
    assert.equal(await page.evaluate(() => {
      const field = document.querySelector('#short-rights').getBoundingClientRect();
      const footer = document.querySelector('.su-action-bar').getBoundingClientRect();
      return field.bottom <= footer.top && document.documentElement.scrollWidth <= innerWidth;
    }), true, 'rights checkbox stays reachable above the fixed footer');
    await page.getByRole('button', { name: 'Next: Review', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Your Short', exact: true })).toContainText(title);
  }
  try {
    await page.locator('.ss-sidebar').getByRole('link', { name: 'Create Short', exact: true }).click();
    await fill();
    // The server accepts the part; all three bounded completion retries lose their response.
    await page.route('**/api/shorts/uploads/*/parts/0/complete', async route => {
      const response = await route.fetch(); assert.equal(response.status(), 201);
      id = new URL(route.request().url()).pathname.split('/')[4];
      await route.abort();
    }, { times: 3 });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(overlay.getByRole('heading', { name: 'Let’s try that again' })).toBeVisible();
    assert.ok(id); assert.equal(creates.length, 1); assert.equal(parts.length, 3); assert.equal(finishes.length, 0);

    // Reselecting identical content after reload resumes the saved part, and a
    // lost finish acknowledgement reads the accepted job instead of enqueueing again.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.reload(); await fill();
    await page.route('**/api/shorts/uploads/*/finish', async route => {
      const response = await route.fetch(); assert.equal(response.status(), 202);
      finishAccepted = true; await route.abort();
    }, { times: 1 });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect.poll(() => finishAccepted).toBe(true);
    await expect(overlay.getByRole('heading', { name: 'Preparing your Short', exact: true })).toBeVisible();
    stopWorker = await startWorker();
    await expect(overlay.getByRole('heading', { name: 'Your Short is awaiting review', exact: true })).toBeVisible({ timeout: 45000 });
    await expect(overlay).toContainText('Your upload is saved. It will stay private until approved.');
    await expect(overlay.getByRole('alert')).toHaveCount(0);
    assert.equal(creates.length, 1); assert.equal(parts.length, partCount + 2); assert.equal(new Set(parts).size, partCount); assert.equal(finishes.length, 1);
    assert.equal(publications.length, 0, 'pending review does not submit a publication');
    assert.equal(await page.evaluate(async id => (await fetch('/api/shorts/playback/' + id)).status, id), 404);
    await stopWorker(); stopWorker = undefined;

    await approve(id);
    await overlay.getByRole('button', { name: 'Back to review', exact: true }).click();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(overlay.getByRole('heading', { name: 'Publishing your Short', exact: true })).toBeVisible();
    await queued(id);
    assert.equal(publications.length, 1, 'one approved publication intent');
    await expect(overlay.getByRole('link', { name: 'Watch & share', exact: true })).toHaveCount(0);

    // Reload while the signer observation is still pending. The same video and
    // journal must be reused; this cannot create another publication intent.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload(); await fill();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(overlay.getByRole('heading', { name: 'Publishing your Short', exact: true })).toBeVisible();
    await confirm(id);
    await expect(overlay.getByRole('heading', { name: 'Your Short is published.', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(overlay).toContainText('Your link is ready to share. Playback may still be preparing.');
    assert.equal(creates.length, 1); assert.equal(parts.length, partCount + 2); assert.equal(new Set(parts).size, partCount); assert.equal(finishes.length, 1); assert.equal(publications.length, 1);
    assert.equal(await page.evaluate(() => window.__ownedWalletState.transactions), 0);
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-upload-published.png') });
    await startPlayback();
    await overlay.getByRole('link', { name: 'Watch & share', exact: true }).click();
    await expect(page).toHaveURL(origin + '/shorts?short=' + id);
    await expect(page.getByRole('button', { name: 'Pause video', exact: true })).toBeVisible({ timeout: 30000 });
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && !video.paused && video.readyState >= 2 && video.videoWidth > 0 && video.currentTime > 0;
    });
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-upload-playing.png') });
  } finally {
    page.off('request', observe);
    await stopWorker?.();
    if (id) await retire(id);
  }
  await page.goto(origin + '/shorts/studio/content');
  await expect(page.getByRole('region', { name: 'Content library' })).toHaveAttribute('aria-busy', 'false');
};
