const assert = require('node:assert/strict');
const { join } = require('node:path');
const { observeSocial, assembledSocialLive } = require('./assembled-social-live.cjs');

exports.assembledFollowing = async ({ page, origin, creator, outsider, id, expect, identity, social }) => {
  const requests = [], relationships = [];
  const observed = observeSocial(page);
  const response = async value => {
    const url = new URL(value.url());
    if (url.origin === origin && url.pathname === '/api/social-graph/relationship' && value.status() === 200) {
      relationships.push(await value.json().catch(() => ({})));
    }
    if (url.origin === origin && url.pathname === '/api/shorts/feed/following') {
      const item = { address: url.searchParams.get('address'), status: value.status(), ids: [] };
      requests.push(item);
      item.ids = (await value.json().catch(() => ({}))).items?.map(short => short.id) || [];
    }
  };
  page.on('response', response);
  const empty = async () => {
    await expect(page.locator('.sv-empty').getByRole('heading', { name: 'No Shorts in this feed yet' })).toBeVisible();
    await expect(page.locator('.sv-slide video')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__shortsMediaSources.size)).toBe(0);
  };
  const playable = async () => {
    await expect.poll(() => page.locator('.sv-slide:not([inert]) video').evaluateAll(elements => {
      const video = elements[0]; return !!video && !video.paused && video.videoWidth > 0 && video.currentTime > 0;
    }), { timeout: 20000 }).toBe(true);
    await expect(page.locator('.sv-slide:not([inert])').getByText('Owned fixture', { exact: true })).toBeVisible();
  };
  const refresh = async () => {
    const before = requests.length;
    await page.getByRole('button', { name: 'Refresh Shorts feed' }).click();
    await expect.poll(() => requests.length, { timeout: 15000 }).toBeGreaterThan(before);
  };
  try {
    await page.goto(origin + '/shorts');
    await expect.poll(identity).toBe(outsider.address);
    assert.equal(await page.evaluate(async () => (await import('/src/config.ts')).API_BASE_URL), origin);
    // Prime the shared profile relationship cache before the indexed follow.
    await playable();
    await expect.poll(() => relationships.some(item => item.from === outsider.address && item.to === creator.address && item.a_follows_b === false)).toBe(true);
    await page.locator('.sv-discover').click();
    const dialog = page.getByRole('dialog', { name: 'Discover Shorts' });
    await dialog.getByRole('button', { name: 'following', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close topics' }).click();
    await empty();
    await social.edge(outsider.address, creator.address, 'follow', true);
    await refresh(); await playable();
    assert.ok(requests.some(item => item.address === outsider.address && item.status === 200 && item.ids.includes(id)));

    // Exercise both blocking directions through the production projection writer.
    // The explicit UI refresh is intentional: the global graph socket is not in
    // this hosted Shorts fixture, so this does not claim social live-bus coverage.
    for (const [from, to] of [[outsider.address, creator.address], [creator.address, outsider.address]]) {
      await social.edge(from, to, 'block', true);
      await refresh(); await empty();
      await social.edge(from, to, 'block', false);
      await refresh(); await playable();
    }
    await social.edge(outsider.address, creator.address, 'follow', false);
    await refresh(); await empty();
    await social.edge(outsider.address, creator.address, 'follow', true);
    await refresh(); await playable();

    const beforeSwitch = requests.length;
    await page.evaluate(() => window.__ownedWalletState.select(0));
    await expect.poll(identity).toBe(creator.address);
    await expect.poll(() => requests.slice(beforeSwitch).some(item => item.address === creator.address && item.status === 200 && item.ids.length === 0)).toBe(true);
    await empty();
    await page.evaluate(() => window.__ownedWalletState.select(1));
    await expect.poll(identity).toBe(outsider.address); await playable();
    assert.ok(requests.some(item => item.address === creator.address && item.status === 200 && item.ids.length === 0));

    await social.rebuilding(true);
    await page.reload();
    await expect(page.locator('.sv-empty').getByRole('heading', { name: 'Couldn’t load Shorts' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.sv-slide video')).toHaveCount(0);
    assert.ok(requests.some(item => item.status === 503));
    await social.rebuilding(false);
    await refresh(); await playable();
    assert.equal(await page.evaluate(() => window.__ownedWalletState.signed), 0, 'public Following needs no creator-access signature');
    assert.equal(await page.evaluate(() => window.__ownedWalletState.transactions), 0);
    if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-following-connected.png') });
    if (social.notify) await assembledSocialLive({ page, expect, social, creator, outsider, playable, empty, observed });
  } finally {
    observed.close();
    page.off('response', response);
    await social.rebuilding(false);
    for (const [from, to] of [[outsider.address, creator.address], [creator.address, outsider.address]]) await social.edge(from, to, 'block', false);
    await social.edge(outsider.address, creator.address, 'follow', false);
  }
};
