/* The subresource guard 404s anything that must not receive the SPA document. Both directions
 * matter equally: a miss re-opens the un-evictable-service-worker path this rule exists to close,
 * and a false positive turns a live route into a 404 that no route-walk would trace back here. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
const { decodedPath, isSubresourceRequest } = require('../subresource.cjs');

/** How index.cjs calls it: the decoded path plus whatever `Sec-Fetch-Dest` arrived. */
const guard = (rawPath, dest) => isSubresourceRequest(decodedPath(rawPath), dest);

describe('requests that must 404', () => {
  it('catches subresource extensions with no Sec-Fetch-Dest at all', () => {
    // curl and older browsers send no hint, so the extension has to carry these.
    expect(guard('/missing-chunk.js')).toBe(true);
    expect(guard('/assets/gone.mjs')).toBe(true);
    expect(guard('/app.css')).toBe(true);
    expect(guard('/bundle.js.map')).toBe(true);
    expect(guard('/fonts/inter.woff2')).toBe(true);
    expect(guard('/fonts/inter.ttf')).toBe(true);
  });

  it.each([
    '/qa-missing.png', '/images/missing.jpg', '/images/missing.jpeg', '/missing.svg',
    '/missing.webp', '/missing.avif', '/favicon.ico', '/whitepaper.pdf',
    '/missing.mp4', '/missing.mp3', '/manifest.webmanifest', '/robots.txt',
    '/sitemap.xml', '/sitemap/0.xml', '/sitemap-posts.xml',
  ])('does not return an HTML shell for a missing static resource: %s', (path) => {
    // Existing files are served before this guard. Only missing assets reach it.
    expect(guard(path)).toBe(true);
    expect(guard(path, 'document')).toBe(true);
  });

  it('matches the extension case-insensitively', () => {
    expect(guard('/Vendor.JS')).toBe(true);
  });

  it('sees through percent-escapes, which serve-static resolves but a literal match would not', () => {
    expect(guard('/missing%2Ejs')).toBe(true);
    expect(guard('/missing%2Epng')).toBe(true);
  });

  it('catches an extensionless request the browser labels as a subresource', () => {
    // The half that matters most: a deleted worker's update fetch. Served HTML, the browser
    // rejects it on MIME grounds and the old worker stays active forever; a 404 unregisters it.
    expect(guard('/chat-offline-sw', 'serviceworker')).toBe(true);
    expect(guard('/some/module', 'script')).toBe(true);
    expect(guard('/theme', 'style')).toBe(true);
    expect(guard('/inter', 'font')).toBe(true);
    expect(guard('/pool', 'worker')).toBe(true);
    expect(guard('/pool', 'sharedworker')).toBe(true);
    expect(guard('/cover', 'image')).toBe(true);
    expect(guard('/manifest', 'manifest')).toBe(true);
    expect(guard('/recording', 'audio')).toBe(true);
    expect(guard('/clip', 'video')).toBe(true);
  });
});

describe('requests that must still reach the SPA', () => {
  it('lets navigations through, however they are labelled', () => {
    expect(guard('/')).toBe(false);
    expect(guard('/', 'document')).toBe(false);
    expect(guard('/chat/dm/ak_abc', 'document')).toBe(false);
    expect(guard('/users/ak_2a1j2M', 'iframe')).toBe(false);
  });

  it('lets the real SPA routes through', () => {
    // Every literal route registered in index.cjs, plus the shapes their splats catch.
    for (const route of [
      '/post/9_v3', '/users/ak_x', '/trends', '/trends/tokens/SOMETOKEN', '/trending',
      '/defi/swap', '/voting', '/explore', '/swap', '/pool', '/chat', '/index',
    ]) {
      expect(guard(route)).toBe(false);
    }
  });

  it('does not fire on a dot that is not one of the extensions', () => {
    // Chain names are `.chain`, and a filename-looking path is not a subresource by itself.
    expect(guard('/users/nikita.chain')).toBe(false);
    expect(guard('/users/alex.chain', 'document')).toBe(false);
    expect(guard('/post/a.story')).toBe(false);
    expect(guard('/trends/tokens/V2.0')).toBe(false);
    expect(guard('/unknown-document')).toBe(false);
  });

  it('does not classify every fetch destination as a subresource', () => {
    expect(guard('/api/thing', 'empty')).toBe(false);
  });
});

describe('decodedPath', () => {
  it('falls back to the raw path on a malformed escape rather than throwing', () => {
    // A throw here would 500 every request carrying a stray `%`.
    expect(decodedPath('/bad%zz')).toBe('/bad%zz');
  });
});
