const assert = require('node:assert/strict');
const { join } = require('node:path');

// Observe actual transport frames and HTTP responses without substituting either.
exports.observeSocial = page => {
  const events = [], sockets = [];
  let stateReads = 0;
  const socket = value => {
    if (new URL(value.url()).pathname !== '/socket.io/') return;
    const record = { closed: false, probed: false }; sockets.push(record);
    value.on('close', () => { record.closed = true; });
    value.on('framereceived', frame => {
      const text = String(frame.payload);
      if (text === '3probe') record.probed = true;
      if (!text.startsWith('42[')) return;
      const [event, data] = JSON.parse(text.slice(2));
      if (event === 'social-graph-updated') events.push(data);
    });
  };
  const response = value => {
    if (new URL(value.url()).pathname === '/api/shorts/feed/following/state' && value.status() === 200) stateReads++;
  };
  page.on('websocket', socket); page.on('response', response);
  return { events, sockets, reads: () => stateReads,
    close: () => { page.off('websocket', socket); page.off('response', response); } };
};

exports.assembledSocialLive = async ({ page, expect, social, creator, outsider, playable, empty, observed }) => {
  const accounts = [outsider.address, creator.address];
  await expect.poll(() => observed.sockets.some(socket => socket.probed && !socket.closed)).toBe(true);
  await page.getByRole('button', { name: 'Pause video', exact: true }).click();
  await page.evaluate(() => { window.__socialPausedVideo = document.querySelector('.sv-slide:not([inert]) video'); });
  const before = observed.reads(), start = observed.events.length;
  await social.notifyOther();
  await social.notify(accounts);
  await expect.poll(observed.reads, { timeout: 10000 }).toBeGreaterThan(before);
  assert.ok(observed.events.slice(start).length > 0);
  assert.ok(observed.events.slice(start).every(event => event.network === social.graph.network && event.contract === social.graph.contract));
  assert.equal(await page.evaluate(() => window.__socialPausedVideo === document.querySelector('.sv-slide:not([inert]) video') && window.__socialPausedVideo.paused), true,
    'unchanged social invalidation preserves the paused player');

  // These changes travel through the real gateway, PostgreSQL listener, browser
  // socket and Following state/revision reads. Do not press the Refresh button.
  await social.edge(outsider.address, creator.address, 'follow', false);
  await social.notify(accounts); await empty();
  await social.edge(outsider.address, creator.address, 'follow', true);
  await social.notify(accounts); await playable();
  await social.edge(creator.address, outsider.address, 'block', true);
  await social.notify(accounts); await empty();
  await social.edge(creator.address, outsider.address, 'block', false);
  await social.notify(accounts); await playable();

  const recoveryStart = observed.events.length, connections = observed.sockets.length;
  await social.interruptListener(async () => {
    await social.edge(outsider.address, creator.address, 'follow', false);
    await social.notify(accounts);
  });
  await empty();
  await expect.poll(() => observed.events.slice(recoveryStart).some(event => !event.accounts)).toBe(true);
  assert.equal(observed.sockets.length, connections, 'database listener recovery keeps the browser transport connected');
  await social.edge(outsider.address, creator.address, 'follow', true);
  await social.notify(accounts); await playable();

  const socketCount = observed.sockets.length;
  await social.disconnect();
  await social.edge(outsider.address, creator.address, 'follow', false);
  await social.notify(accounts);
  await expect.poll(() => observed.sockets.length, { timeout: 10000 }).toBeGreaterThan(socketCount);
  await empty();
  await social.edge(outsider.address, creator.address, 'follow', true);
  await social.notify(accounts); await playable();
  assert.equal(await page.evaluate(() => window.__ownedWalletState.signed), 0);
  assert.equal(await page.evaluate(() => window.__ownedWalletState.transactions), 0);
  if (process.env.SHORTS_TEST_BROWSER_OUTPUT) await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, 'shorts-following-live.png') });
};
