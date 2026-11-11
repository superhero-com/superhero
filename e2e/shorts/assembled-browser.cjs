// Optional browser consumer of the assembled edge. Media/player code is real;
// identity/follow widgets are replaced to avoid unrelated wallet/chain traffic.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { join, isAbsolute } = require('node:path');
const { readFile, mkdir } = require('node:fs/promises');
const { assembledApp } = require('./assembled-app.cjs');
const { assembledFeed } = require('./assembled-feed.cjs');
const { assembledCreator } = require('./assembled-creator.cjs');
const { walletModule } = require('./assembled-wallet.cjs');

exports.assembledBrowser = async (t, { id, api, port, releasePin, uploadOrigin, changeVisibility, notify, creator, outsider, verifyRevoked, upload, social, adaptive = false }) => {
  const root = join(__dirname, '../..');
  assert.match(releasePin, /^[a-f0-9]{64}$/);
  if (uploadOrigin) assert.equal(new URL(uploadOrigin).hostname, '127.0.0.1');
  assert.equal(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).name, 'superhero');
  const requireWeb = createRequire(join(root, 'package.json'));
  const { createServer } = await import(pathToFileURL(requireWeb.resolve('vite')).href);
  const { chromium, expect } = requireWeb('@playwright/test');
  const { default: tailwind } = await import(pathToFileURL(join(root, 'tailwind.config.js')).href);
  // Vite's optional import.meta.env access reads its env object rather than an
  // individual define. Keep the actual global SDK on the fixture's testnet.
  process.env.VITE_NETWORK = 'ae_uat';
  if (port) process.env.VITE_SUPERHERO_API_URL = `http://127.0.0.1:${port}`;
  const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {ShortsViewer} from '/src/features/shorts/shorts-viewer.tsx?assembled-player';
import '/src/features/shorts/shorts.css';
import '/src/features/shorts/shorts-viewer.css';
const root=createRoot(document.getElementById('root'));
const short={id:${JSON.stringify(id)},title:'Browser playback fixture',creator:'Owned test creator',topic:'Art',duration:2.2,status:'active',cid:'owned',bytes:1,publicationStatus:'published',likes:0,views:0,liked:false,mine:false,moderation:'approved'};
const noop=()=>{};
window.fixture={render(patch={}){root.render(React.createElement(MemoryRouter,null,React.createElement('div',{className:'shorts-app shorts-watching',style:{left:0}},React.createElement(ShortsViewer,{feed:[short],topics:['All','Art'],topic:'All',onTopic:noop,onLike:noop,onReport:noop,onStudio:noop,onUpload:noop,busy:false,suspended:false,ready:true,...patch}))));}};
window.fixture.render();
`;
  let browser, page, edgeOrigin, closed = false;
  const errors = [], requests = [], sources = new Set();
  const vite = await createServer({ root, configFile: join(root, 'vite.config.ts'),
    // Only this ephemeral fixture chooses its service at runtime; product code
    // still uses its normal compiled, validated streaming-origin setting.
    define: {
      'import.meta.env.VITE_SHORTS_STREAM_URL': 'window.__streamOrigin',
      'import.meta.env.ENABLE_SHORTS': JSON.stringify('true'),
      'import.meta.env.VITE_SHORTS_API_URL': 'window.location.origin',
      'import.meta.env.VITE_SUPERHERO_API_URL': 'window.location.origin',
      'import.meta.env.VITE_NETWORK': JSON.stringify('ae_uat'),
      // Pin the parent fixture's intended release independently of HTTP config.
      'import.meta.env.VITE_SHORTS_RELEASE_HASH': JSON.stringify(releasePin),
    },
    css: { postcss: { plugins: [requireWeb('tailwindcss')({ ...tailwind,
      content: tailwind.content.map(pattern => join(root, pattern)),
    }), requireWeb('autoprefixer')()] } },
    server: { host: '127.0.0.1', port: port || 0, strictPort: !!port, open: false,
      proxy: { '/api': { target: api, rewrite: path => path.replace(/^\/api/, '') },
        '/shorts/socket.io': { target: api, ws: true }, '/socket.io': { target: api, ws: true } },
    },
    plugins: [{ name: 'assembled-player-fixture', enforce: 'pre',
      resolveId(name, importer) {
        if (name === '/assembled-player.tsx') return '\0assembled-player.tsx';
        if (name === '/assembled-wallet.ts') return '\0assembled-wallet.ts';
        if (importer?.endsWith('/shorts-viewer.tsx?assembled-player') && ['./shorts-creator', './shorts-follow'].includes(name)) return '\0assembled-identity';
      },
      load(name) {
        if (name === '\0assembled-player.tsx') return entry;
        if (name === '\0assembled-wallet.ts') return walletModule;
        if (name === '\0assembled-identity') return 'import React from "react"; export const ShortsCreator=({address})=>React.createElement("span",null,address); export const ShortsCreatorAvatar=()=>null; export const ShortsFollow=()=>null;';
      },
      configureServer(server) { server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__assembled-player') return next();
        try {
          const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#08090d}</style></head><body><div id="root"></div><script type="module" src="/assembled-player.tsx"></script></body></html>';
          res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml('/__assembled-player', html));
        } catch (error) { next(error); }
      }); },
    }],
  });
  async function close() {
    if (closed) return; closed = true;
    await browser?.close(); await vite.close();
  }
  t.after(close);
  await vite.listen();
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  async function playable() {
    try {
      await page.waitForFunction(() => {
        const video = document.querySelector('video');
        return video && !video.paused && video.readyState >= 2 && video.videoWidth > 0 && video.currentTime > 0;
      }, undefined, { timeout: 15000 });
    } catch {
      const state = await page.evaluate(() => {
        const video = document.querySelector('video');
        return { text: document.body.innerText.slice(0, 1500), media: video && {
          paused: video.paused, ready: video.readyState, width: video.videoWidth, time: video.currentTime,
          error: video.error?.code, source: video.currentSrc.startsWith('blob:') ? 'blob' : 'other',
        } };
      });
      assert.fail(JSON.stringify({ state, errors, requests }));
    }
    await expect(page.locator('.sv-video-error')).toHaveCount(0);
  }
  async function fresh() { await page.reload(); await playable(); }
  async function createContext(edgeBase) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      await context.addInitScript(value => { window.__streamOrigin = value; }, edgeBase);
      await context.addInitScript(() => {
        // Observe actual MediaSource ownership without replacing the player.
        const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
        const sources = new Set(); window.__shortsMediaSources = sources;
        URL.createObjectURL = value => {
          const url = create(value); if (value instanceof MediaSource) sources.add(url); return url;
        };
        URL.revokeObjectURL = url => { sources.delete(url); revoke(url); };
      });
      await context.routeWebSocket('**/*', socket => {
        if (new URL(socket.url()).host === new URL(origin).host) socket.connectToServer();
        else socket.close();
      });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if ([origin, edgeBase, uploadOrigin].includes(url.origin)) return route.continue();
        // App's global SDK polls the node even for a guest. Like the assembled
        // API, use controlled read-only chain observations; never contact a node.
        if (route.request().method() === 'GET' && url.hostname === 'testnet.aeternity.io') {
          if (url.pathname === '/v3/status') return route.fulfill({ json: {
            network_id: 'ae_uat', node_version: '7.3.0', top_block_height: 100,
            protocols: [{ version: 6, effective_at_height: 0 }],
          } });
          if (url.pathname === '/v3/generations/current') return route.fulfill({ json: { key_block: { height: 100 }, micro_blocks: [] } });
          if (/^\/v3\/accounts\/ak_[a-zA-Z0-9]+$/.test(url.pathname)) return route.fulfill({ json: { id: url.pathname.split('/').at(-1), balance: '100000000000000000000', nonce: 0, payable: true } });
        }
        return route.abort();
      });
      return context;
  }
  return {
    origin,
    async runJourneys(edge, withCatalog) {
      await t.test('the actual web player switches original-derived quality with audio and preserves playback controls', () => this.connect(edge));
      await t.test('public app navigation and live feed updates', () => this.application());
      await t.test('creator Studio, resumable upload and connected Following', () => this.creator());
      await t.test('public catalog paging and bounded video elements', () => withCatalog(ids => this.multiple(ids)));
    },
    async connect(edgeBase) {
      edgeOrigin = edgeBase;
      browser = await chromium.launch({ headless: true });
      const context = await createContext(edgeBase);
      page = await context.newPage();
      page.on('pageerror', error => errors.push(error.stack || error.message));
      page.on('request', request => { if (request.url().startsWith(edgeBase)) requests.push(new URL(request.url()).pathname); });
      await page.goto(origin + '/__assembled-player'); await playable();
      sources.add(await page.locator('video').getAttribute('src'));
      assert.ok([...sources].every(src => src?.startsWith('blob:')), 'real MediaSource URLs');
      assert.ok(requests.some(path => path.endsWith('.m4s')), 'browser decodes real segments');
      assert.ok(!requests.some(path => path.endsWith('/video.mp4')), 'no full MP4 fallback');
      if (adaptive) {
        const chooseQuality = async label => {
          await page.getByRole('button', { name: 'Playback settings' }).click();
          await page.getByRole('menuitemradio', { name: new RegExp('^' + label) }).click();
        };
        await chooseQuality('High quality');
        await page.waitForFunction(() => document.querySelector('video')?.videoWidth === 1080, undefined, { timeout: 15000 });
        await expect(page.locator('video')).toHaveJSProperty('videoHeight', 1920);
        assert.ok(requests.some(path => /\/amain-segment-\d+\.m4s$/.test(path)), 'actual adaptive audio is fetched');
        await chooseQuality('Data Saver');
        await page.waitForFunction(() => { const video = document.querySelector('video'); return video && video.videoWidth > 0 && video.videoWidth <= 360; }, undefined, { timeout: 15000 });
        await playable();
        await chooseQuality('High quality');
        await page.waitForFunction(() => document.querySelector('video')?.videoWidth === 1080, undefined, { timeout: 15000 });
        await playable();
      }
      await page.getByRole('button', { name: 'Pause video', exact: true }).click();
      await expect(page.locator('video')).toHaveJSProperty('paused', true);
      await page.getByRole('button', { name: 'Playback settings' }).click();
      await page.getByRole('menuitem', { name: 'Video details and report' }).click();
      await expect(page.getByRole('dialog', { name: 'Short details' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('video')).toHaveJSProperty('paused', true);
      await page.getByRole('button', { name: 'Play video', exact: true }).click(); await playable();
      await page.getByRole('button', { name: 'Playback settings' }).click();
      await page.getByRole('menuitem', { name: 'Video details and report' }).click();
      await expect(page.locator('video')).toHaveJSProperty('paused', true);
      await page.keyboard.press('Escape'); await playable();
      // Route removal must release the MediaSource, including the old element.
      await page.evaluate(() => { window.removedVideo = document.querySelector('video'); window.fixture.render({ feed: [] }); });
      await expect(page.locator('video')).toHaveCount(0);
      assert.equal(await page.evaluate(() => window.removedVideo.hasAttribute('src')), false);
      assert.equal(await page.evaluate(() => window.removedVideo.paused), true);
      await page.evaluate(() => window.fixture.render()); await playable();
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await expect(page.getByRole('button', { name: 'Pause video', exact: true })).toBeVisible();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        if (process.env.SHORTS_TEST_BROWSER_OUTPUT) {
          assert.ok(isAbsolute(process.env.SHORTS_TEST_BROWSER_OUTPUT));
          await mkdir(process.env.SHORTS_TEST_BROWSER_OUTPUT, { recursive: true });
          await page.screenshot({ path: join(process.env.SHORTS_TEST_BROWSER_OUTPUT, `hls-browser-${width}.png`) });
        }
      }
      // One dropped session request must have a usable retry, with the retry
      // returning to the real edge rather than a successful mock response.
      await page.evaluate(() => window.fixture.render({ feed: [] }));
      await expect(page.locator('video')).toHaveCount(0);
      await page.route(`${edgeBase}/videos/${id}/playback`, route => route.abort(), { times: 1 });
      await page.evaluate(() => window.fixture.render());
      await expect(page.getByText('This Short couldn’t load.')).toBeVisible();
      await page.getByRole('button', { name: 'Try again', exact: true }).click(); await playable();
      assert.deepEqual(errors, []);
    },
    async denied() {
      // A new session must not expose already buffered media after a takedown.
      await page.reload();
      await expect(page.getByText('This Short couldn’t load.')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('video')).toHaveJSProperty('paused', true);
      const before = requests.filter(path => path.endsWith('.m4s')).length;
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByText('This Short couldn’t load.')).toBeVisible();
      assert.equal(requests.filter(path => path.endsWith('.m4s')).length, before);
    },
    async application() {
      try { await assembledApp({ page, origin, id, expect, errors, changeVisibility, notify }); }
      finally {
        // Later withdrawal/reorg scenarios retain the isolated player contract,
        // even when an application assertion fails.
        await page.goto(origin + '/__assembled-player'); await playable();
      }
    },
    async multiple(ids) {
      try { await assembledFeed({ page, origin, ids, expect, errors, changeVisibility, notify }); }
      finally { await page.goto(origin + '/__assembled-player'); await playable(); }
    },
    async creator() {
      await assembledCreator({ context: await createContext(edgeOrigin), origin, creator, outsider, id, expect, verifyRevoked, upload, social });
    },
    async restored() { await fresh(); assert.deepEqual(errors, []); },
    async pause() {
      const video = page.locator('video');
      if (!(await video.evaluate(element => element.paused))) await page.getByRole('button', { name: 'Pause video', exact: true }).click();
      await expect(video).toHaveJSProperty('paused', true);
    },
    async generation(sourceKey) {
      const issued = page.waitForResponse(response => new URL(response.url()).pathname === `/videos/${id}/playback` && response.status() === 200);
      await fresh();
      const result = await (await issued).json();
      const token = new URL(result.manifest, edgeOrigin).searchParams.get('token');
      assert.equal(token?.split('.')[0], 'v3'); assert.equal(token.split('.')[2], sourceKey);
    },
    close,
  };
};
