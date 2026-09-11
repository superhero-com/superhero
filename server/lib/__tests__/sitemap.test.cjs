/* Tests for the dynamic curated sitemap engine (server/lib/sitemap.cjs): the hardcoded inclusion
 * gate per entity, canonical URL shapes, the ordered early-stop paging, and the "keep the last
 * good buffer on any failure" guarantee. `describe`/`it`/`expect` are vitest globals. */

const {
  buildSitemapXml, buildEntries, collectTokens, collectAccounts, collectPosts,
  tokenLoc, accountLoc, postLoc, toLastmod, escapeXml, STATIC_PATHS,
  createSitemapEngine,
} = require('../sitemap.cjs');

const ORIGIN = 'https://superhero.com';

// A fetch double backed by an in-memory table keyed by API path, paginated at limit=100 so the
// early-stop logic is exercised. `routes` maps '/api/<name>' -> full ordered item array.
function makeFetch(routes, { failPath } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (failPath && u.pathname === failPath) {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    const all = routes[u.pathname] || [];
    const limit = Number(u.searchParams.get('limit')) || 100;
    const page = Number(u.searchParams.get('page')) || 1;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(all.length / limit));
    return { ok: true, status: 200, json: async () => ({ items, meta: { totalItems: all.length, totalPages } }) };
  };
  return { fetchImpl, calls };
}

describe('escapeXml / toLastmod', () => {
  it('escapes XML metacharacters', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
  it('reduces an ISO timestamp to a W3C date', () => {
    expect(toLastmod('2025-06-14T17:52:31.111Z')).toBe('2025-06-14');
  });
  it('drops an unparseable or missing timestamp', () => {
    expect(toLastmod('not-a-date')).toBeUndefined();
    expect(toLastmod(undefined)).toBeUndefined();
  });
});

describe('canonical URL shapes', () => {
  it('token URL is /trends/tokens/<name>, percent-encoded', () => {
    expect(tokenLoc(ORIGIN, 'IMAE')).toBe('https://superhero.com/trends/tokens/IMAE');
    expect(tokenLoc(ORIGIN, 'A B')).toBe('https://superhero.com/trends/tokens/A%20B');
  });
  it('account URL is /users/<address>', () => {
    expect(accountLoc(ORIGIN, 'ak_123')).toBe('https://superhero.com/users/ak_123');
  });
  it('post URL strips the _v3 suffix to the canonical form', () => {
    expect(postLoc(ORIGIN, '12136_v3')).toBe('https://superhero.com/post/12136');
    expect(postLoc(ORIGIN, '999')).toBe('https://superhero.com/post/999');
  });
});

describe('buildSitemapXml', () => {
  it('emits <loc>/<lastmod> and never <priority>/<changefreq>', () => {
    const xml = buildSitemapXml([{ loc: 'https://superhero.com/', }, { loc: 'https://superhero.com/post/1', lastmod: '2026-01-02' }]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://superhero.com/post/1</loc>');
    expect(xml).toContain('<lastmod>2026-01-02</lastmod>');
    expect(xml).not.toContain('<priority>');
    expect(xml).not.toContain('<changefreq>');
  });
});

describe('token gate — holders_count >= 2, ordered early stop', () => {
  it('keeps >= 2, stops at the first < 2 without paging further', async () => {
    const tokens = [
      { name: 'T5', holders_count: 5, created_at: '2026-01-01T00:00:00Z' },
      { name: 'T2', holders_count: 2, created_at: '2026-01-01T00:00:00Z' },
      { name: 'T1', holders_count: 1, created_at: '2026-01-01T00:00:00Z' }, // below gate → stop here
      { name: 'T0', holders_count: 0, created_at: '2026-01-01T00:00:00Z' },
    ];
    const { fetchImpl } = makeFetch({ '/api/tokens': tokens });
    const kept = await collectTokens(fetchImpl, 'https://api.test');
    expect(kept.map((t) => t.name)).toEqual(['T5', 'T2']);
  });
});

describe('account gate — total_tx_count >= 1 AND banned = false', () => {
  it('drops banned accounts in memory and stops at the first tx_count < 1', async () => {
    const accounts = [
      { address: 'ak_a', total_tx_count: 10, banned: false, created_at: '2026-01-01T00:00:00Z' },
      { address: 'ak_banned', total_tx_count: 8, banned: true, created_at: '2026-01-01T00:00:00Z' }, // dropped, not a stop
      { address: 'ak_b', total_tx_count: 1, banned: false, created_at: '2026-01-01T00:00:00Z' },
      { address: 'ak_zero', total_tx_count: 0, banned: false, created_at: '2026-01-01T00:00:00Z' }, // below gate → stop
    ];
    const { fetchImpl } = makeFetch({ '/api/accounts': accounts });
    const kept = await collectAccounts(fetchImpl, 'https://api.test');
    expect(kept.map((a) => a.address)).toEqual(['ak_a', 'ak_b']);
  });
});

describe('posts — every post ships, across pages', () => {
  it('collects all posts over multiple pages', async () => {
    const posts = Array.from({ length: 250 }, (_, i) => ({ id: `${i}_v3`, created_at: '2026-01-01T00:00:00Z' }));
    const { fetchImpl, calls } = makeFetch({ '/api/posts': posts });
    const kept = await collectPosts(fetchImpl, 'https://api.test');
    expect(kept.length).toBe(250);
    expect(calls.length).toBe(3); // 100 + 100 + 50
  });
});

describe('buildEntries', () => {
  it('assembles static + gated entities with the right counts', async () => {
    const { fetchImpl } = makeFetch({
      '/api/tokens': [{ name: 'T', holders_count: 3, created_at: '2026-01-01T00:00:00Z' }, { name: 'x', holders_count: 1 }],
      '/api/accounts': [{ address: 'ak_a', total_tx_count: 4, banned: false, created_at: '2026-01-01T00:00:00Z' }],
      '/api/posts': [{ id: '7_v3', created_at: '2026-01-01T00:00:00Z' }],
    });
    const { entries, counts } = await buildEntries(fetchImpl, 'https://api.test', ORIGIN);
    expect(counts).toEqual({ static: STATIC_PATHS.length, tokens: 1, accounts: 1, posts: 1 });
    expect(entries.some((e) => e.loc === 'https://superhero.com/post/7')).toBe(true);
    expect(entries.length).toBe(STATIC_PATHS.length + 3);
  });

  it('throws when any page fails (so the caller can keep the last good buffer)', async () => {
    const { fetchImpl } = makeFetch({ '/api/tokens': [{ name: 'T', holders_count: 3 }] }, { failPath: '/api/accounts' });
    await expect(buildEntries(fetchImpl, 'https://api.test', ORIGIN)).rejects.toThrow();
  });

  it('emits the post canonical: /post/<slug> when present, else the _v3-stripped id', async () => {
    const { fetchImpl } = makeFetch({
      '/api/tokens': [],
      '/api/accounts': [],
      '/api/posts': [
        { id: '12352_v3', slug: 'ever-notice-crypto-communities-12352', created_at: '2026-01-01T00:00:00Z' },
        { id: '999_v3', created_at: '2026-01-01T00:00:00Z' }, // no slug → id fallback
      ],
    });
    const { entries } = await buildEntries(fetchImpl, 'https://api.test', ORIGIN);
    const locs = entries.map((e) => e.loc);
    expect(locs).toContain('https://superhero.com/post/ever-notice-crypto-communities-12352');
    expect(locs).toContain('https://superhero.com/post/999'); // fallback still strips _v3
    expect(locs).not.toContain('https://superhero.com/post/12352'); // never the bare id when a slug exists
  });
});

describe('engine buffer semantics', () => {
  it('serves null until the first build, then holds the buffer', async () => {
    const routes = {
      '/api/tokens': [{ name: 'T', holders_count: 3, created_at: '2026-01-01T00:00:00Z' }],
      '/api/accounts': [{ address: 'ak_a', total_tx_count: 4, banned: false, created_at: '2026-01-01T00:00:00Z' }],
      '/api/posts': [{ id: '7_v3', created_at: '2026-01-01T00:00:00Z' }],
    };
    const { fetchImpl } = makeFetch(routes);
    const engine = createSitemapEngine({ apiBase: 'https://api.test/', origin: ORIGIN, fetchImpl });
    expect(engine.getBuffer()).toBeNull();
    await engine.refresh();
    const first = engine.getBuffer();
    expect(first).toContain('<loc>https://superhero.com/post/7</loc>');
    expect(engine.getCounts()).toEqual({ static: STATIC_PATHS.length, tokens: 1, accounts: 1, posts: 1 });
  });

  it('keeps the previous buffer and reports failure when a later refresh fails', async () => {
    const good = {
      '/api/tokens': [{ name: 'T', holders_count: 3, created_at: '2026-01-01T00:00:00Z' }],
      '/api/accounts': [],
      '/api/posts': [],
    };
    // A fetch that succeeds on the first build and fails on every one after it.
    let failNow = false;
    const okFetch = makeFetch(good).fetchImpl;
    const badFetch = makeFetch(good, { failPath: '/api/tokens' }).fetchImpl;
    const fetchImpl = (url, opts) => (failNow ? badFetch(url, opts) : okFetch(url, opts));

    const engine = createSitemapEngine({ apiBase: 'https://api.test', origin: ORIGIN, fetchImpl, log: { log() {}, error() {} } });
    expect(await engine.refresh()).toBe(true);
    const before = engine.getBuffer();
    expect(before).toContain('/trends/tokens/T');
    const stamp = engine.getGeneratedAt();

    failNow = true;
    expect(await engine.refresh()).toBe(false);
    expect(engine.getBuffer()).toBe(before);          // unchanged — never emptied
    expect(engine.getGeneratedAt()).toBe(stamp);       // last-good stamp preserved
  });
});
