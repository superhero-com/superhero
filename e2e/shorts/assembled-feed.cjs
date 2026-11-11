// Actual App with a paged, owned catalog. Chain observations are controlled;
// feed responses, policy changes, browser decoding and source cleanup are real.
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { writeFile } = require('node:fs/promises');

exports.assembledFeed = async ({ page, origin, ids, expect, errors, changeVisibility, notify }) => {
  const pages = [], reads = [], media = [], failures = [], retries = [], measurements = [];
  // Deterministic backpressure at each playback boundary; successful responses
  // still come from the real edge, origin, workers and IPFS package.
  const backpressure = new Map([
    ['playback', 429], ['index.m3u8', 503], ['init.mp4', 429], ['segment-000.m4s', 503],
  ].map(([file, status]) => [`/videos/${ids[0]}/${file}`, {
    status, sentAt: null, lastSentAt: null, retriedAt: null,
    // React StrictMode can cancel the first session request during its initial
    // mount probe. Reject both so the live request still exercises backoff.
    remaining: file === 'playback' ? 2 : 1,
  }]));
  const throttle = async route => {
    const path = new URL(route.request().url()).pathname;
    // Select one actual rendition per kind so audio and parallel renditions cannot satisfy its retry.
    const key = path.replace(/\/(?:v\d+|amain)-(init\.mp4|segment-000\.m4s)$/, '/$1');
    const value = backpressure.get(key);
    if (value && value.asset && value.asset !== path) return route.fallback();
    if (value) value.asset = path;
    if (!value) return route.fallback();
    if (value.remaining === 0) {
      if (value.retriedAt === null) value.retriedAt = Date.now();
      return route.fallback();
    }
    value.remaining -= 1;
    value.lastSentAt = Date.now();
    if (value.sentAt === null) value.sentAt = value.lastSentAt;
    return route.fulfill({ status: value.status, body: '', headers: {
      'Retry-After': '2', 'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': 'Retry-After',
    } });
  };
  await page.route('**/videos/**', throttle);
  const response = value => {
    const url = new URL(value.url());
    if (value.status() >= 400 && (url.pathname.startsWith('/api/shorts') || url.pathname.startsWith('/videos/')))
      failures.push({ path: url.pathname, status: value.status(), retryAfter: value.headers()['retry-after'] });
    if (url.origin !== origin) return;
    if (url.pathname === '/api/shorts/feed' && value.status() === 200) pages.push(url.searchParams.get('cursor'));
    if (url.pathname === '/api/shorts/feed/state') reads.push(value.status());
    if (/^\/api\/shorts\/[^/]+\/playback$/.test(url.pathname) && value.status() === 201)
      value.json().then(body => measurements.push({ id: url.pathname.split('/')[3], views: body.views, accepted: body.accepted })).catch(() => {});
  };
  const request = value => { const url = new URL(value.url()); if (url.pathname.startsWith('/videos/')) media.push(url.pathname); };
  page.on('response', response); page.on('request', request);
  const active = page.locator('.sv-slide:not([inert])');
  async function at(id) {
    await expect(active).toHaveAttribute('data-short-id', id);
    // The player must recover bounded backpressure without asking the viewer
    // to press Retry. Real edge and origin admission limits remain unchanged.
    const state = () => active.evaluate(element => {
      const video = element.querySelector('video');
      if (element.querySelector('.sv-video-error')) return 'error';
      return video && !video.paused && video.readyState >= 2 && video.videoWidth > 0 && video.currentTime > 0 ? 'playing' : 'loading';
    });
    await expect.poll(state, { timeout: 25000 }).not.toBe('loading');
    assert.equal(await state(), 'playing', 'bounded playback failures should recover automatically');
    await expect.poll(() => active.locator('video').evaluateAll(elements => {
      const v = elements[0]; return !!v && !v.paused && v.readyState >= 2 && v.videoWidth > 0 && v.currentTime > 0;
    }), { timeout: 25000 }).toBe(true);
    const resources = await page.evaluate(() => {
      const videos = [...document.querySelectorAll('.sv-slide video')];
      return { mounted: videos.length, attached: videos.filter(v => v.hasAttribute('src')).length,
        playing: videos.filter(v => !v.paused).length, sources: window.__shortsMediaSources.size };
    });
    assert.ok(resources.mounted <= 5, JSON.stringify(resources));
    assert.ok(resources.attached <= 3 && resources.sources <= 3, JSON.stringify(resources));
    assert.equal(resources.playing, 1, 'only the current video may play');
  }
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(origin + '/shorts');
    await expect(page.locator('.sv-discover')).toHaveText('Recent', { timeout: 30000 });
    await at(ids[0]);
    await expect.poll(() => measurements.some(value => value.id === ids[0] && value.accepted && value.views >= 1), { timeout: 10000 }).toBe(true);
    for (const [path, value] of backpressure) {
      assert.ok(value.sentAt !== null && value.retriedAt !== null, `expected recovery for ${path}`);
      assert.ok(value.retriedAt - value.lastSentAt >= 1950, `Retry-After ignored for ${path}`);
    }
    await expect(page.getByRole('button', { name: 'Previous Short', exact: true })).toBeDisabled();
    assert.equal(pages.length, 1); assert.equal(pages[0], null);
    await expect.poll(() => [...new Set(media.filter(path => path.endsWith('/playback')))].length).toBe(2);
    await page.evaluate(() => { window.__firstFeedVideo = document.querySelector('.sv-slide:not([inert]) video'); });
    await page.getByRole('button', { name: 'Next Short', exact: true }).click(); await at(ids[1]);
    await page.getByRole('region', { name: 'Shorts video feed' }).focus();
    await page.keyboard.press('ArrowDown'); await at(ids[2]);
    await page.keyboard.press('ArrowUp'); await at(ids[1]);
    for (let i = 2; i <= 18; i++) {
      await page.keyboard.press('ArrowDown'); await at(ids[i]);
    }
    if (pages.length < 2) {
      // A failed background refresh suspends look-ahead. At the current page's
      // end the real UI provides Retry; it must resume the continuation rather
      // than lose the loaded window or silently restart at the catalog head.
      await page.keyboard.press('ArrowDown'); await at(ids[19]);
      const status = page.locator('.sv-page-status');
      if (await status.getByRole('button', { name: 'Try again', exact: true }).count()) {
        retries.push({ kind: 'page' });
        await status.getByRole('button', { name: 'Try again', exact: true }).click();
      }
      await expect(page.locator('.sv-navigation span')).toHaveText('20 / 25', { timeout: 10000 });
      await page.getByRole('button', { name: 'Previous Short', exact: true }).click(); await at(ids[18]);
    }
    await expect(page.locator('.sv-navigation span')).toHaveText('19 / 25');
    assert.equal(pages.length, 2, 'one continuation, no repeated head/page fetch');
    assert.ok(pages[1]);
    assert.equal(await page.evaluate(() => !window.__firstFeedVideo.isConnected && window.__firstFeedVideo.paused && !window.__firstFeedVideo.hasAttribute('src')), true);
    await active.getByRole('button', { name: 'Pause video', exact: true }).click();
    await page.evaluate(() => { window.__currentFeedVideo = document.querySelector('.sv-slide:not([inert]) video'); });
    let before = reads.length;
    await notify();
    await expect.poll(() => reads.length, { timeout: 10000 }).toBeGreaterThan(before + 1);
    assert.equal(await page.evaluate(() => window.__currentFeedVideo === document.querySelector('.sv-slide:not([inert]) video') && window.__currentFeedVideo.paused), true);
    // Removing an earlier candidate changes the active item's index. Reconcile
    // the scroll position without replacing it or overriding explicit pause.
    before = reads.length;
    await changeVisibility(false, ids[1]);
    await expect(page.locator('.sv-navigation span')).toHaveText('18 / 24');
    assert.ok(reads.length > before);
    assert.equal(await active.getAttribute('data-short-id'), ids[18]);
    assert.equal(await page.evaluate(() => window.__currentFeedVideo === document.querySelector('.sv-slide:not([inert]) video') && window.__currentFeedVideo.paused), true);
    await active.getByRole('button', { name: 'Play video', exact: true }).click(); await at(ids[18]);
    for (let i = 19; i < ids.length; i++) {
      await page.getByRole('button', { name: 'Next Short', exact: true }).click(); await at(ids[i]);
    }
    await expect(page.getByRole('button', { name: 'Next Short', exact: true })).toBeDisabled();
    await expect(page.locator('.sv-navigation span')).toHaveText('24 / 24');
    assert.equal(pages.length, 2);
    assert.ok(media.some(path => path.endsWith('.m4s')));
    assert.ok(!media.some(path => path.endsWith('/video.mp4')));
    // A removed current clip cannot keep playing out of view; a remaining clip is
    // selected through the real refreshed catalog, not a synthetic component prop.
    await page.evaluate(() => { window.__removedFeedVideo = document.querySelector('.sv-slide:not([inert]) video'); });
    await changeVisibility(false, ids.at(-1));
    await at(ids[0]);
    assert.equal(await page.evaluate(() => window.__removedFeedVideo.paused && !window.__removedFeedVideo.hasAttribute('src')), true);
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-multi-feed.png') });
    await page.getByRole('button', { name: 'Creator studio', exact: true }).click();
    await expect(page).toHaveURL(origin + '/shorts/studio');
    await expect.poll(() => page.evaluate(() => window.__shortsMediaSources.size)).toBe(0);
    assert.deepEqual(errors, []);
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await writeFile(join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-multi-result.json'), JSON.stringify({ pages: pages.length, failures, retries, backpressure: [...backpressure] }, null, 2));
  } catch (error) {
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-multi-failure.png') }).catch(() => {});
    const diagnostic = { message: error.message, pages, reads, errors, failures, retries, backpressure: [...backpressure], body: await page.locator('body').innerText().catch(() => '') };
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await writeFile(join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-multi-failure.json'), JSON.stringify(diagnostic, null, 2));
    error.message += '\n' + JSON.stringify(diagnostic);
    throw error;
  } finally {
    page.off('response', response); page.off('request', request);
    await page.unroute('**/videos/**', throttle);
  }
};
