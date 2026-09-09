/* Dynamic curated sitemap engine.
 *
 * Builds one flat sitemap.xml from the live API and holds it in memory, refreshed by a
 * background timer — never generated inside a request. Inclusion is the curated gate ruled for
 * this row: a URL ships only when the entity behind it has a party beyond its creator.
 *
 *   Tokens    holders_count >= 2
 *   Accounts  total_tx_count >= 1 AND banned = false
 *   Posts     all — a post is the content
 *   Static    the curated route list (mirrors scripts/generate-sitemap.cjs)
 *
 * The thresholds are hardcoded on purpose, not configuration knobs. Tokens and accounts are
 * paged in the API's own descending order of the gated field and paging stops at the first item
 * below the threshold, so the filter costs ~21 pages, not the full table. `banned` is not part of
 * the ordering, so banned accounts are dropped in memory rather than by an early stop. */

const hubs = require('./hubs.cjs');

const MAX_PAGE_LIMIT = 100; // superhero-api hard cap (src/utils/pagination.ts) — a larger value is a 400.
const DEFAULT_ORIGIN = 'https://superhero.com';
const DEFAULT_REFRESH_MS = 6 * 60 * 60 * 1000; // 6h

// Mirrors the curated core routes in scripts/generate-sitemap.cjs (the cold-start fallback file).
const STATIC_PATHS = [
  '/', '/faq', '/landing', '/whitepaper', '/trends/tokens',
  '/defi/swap', '/terms', '/privacy', '/branding',
];

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[c]));
}

// W3C date (YYYY-MM-DD) from an ISO timestamp; undefined when the value is missing or unparseable
// so a broken timestamp drops <lastmod> rather than emitting an invalid one.
function toLastmod(iso) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function urlEntry(loc, lastmod) {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

// Canonical in-app URLs, matching the app's own route/link construction.
function tokenLoc(origin, name) {
  return `${origin}/trends/tokens/${encodeURIComponent(name)}`;
}
function accountLoc(origin, address) {
  return `${origin}/users/${encodeURIComponent(address)}`;
}
function postLoc(origin, idOrSlug) {
  // The app's /post canonical prefers the slug (server/index.cjs, netlify/edge-functions/seo.ts),
  // so callers pass `slug || id`. The _v3 suffix only appears on the id fallback, so stripping it
  // here is a no-op on slugs and keeps the sitemap in the canonical form Search Console indexes.
  return `${origin}/post/${encodeURIComponent(String(idOrSlug).replace(/_v3$/, ''))}`;
}

function buildSitemapXml(entries) {
  const body = entries.map((e) => urlEntry(e.loc, e.lastmod)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + `${body}\n</urlset>\n`;
}

async function fetchPage(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`sitemap: ${url} -> HTTP ${res.status}`);
  const data = await res.json();
  return { items: Array.isArray(data.items) ? data.items : [], meta: data.meta || {} };
}

/* Page a list endpoint in the API's own order and collect every item.
 * `stopWhen(item)` — when it returns true, the item and every later one are below the gate, so
 * paging stops (the ordered short-circuit). Omit it to walk the whole list (posts). */
async function collectPaged(fetchImpl, buildUrl, { stopWhen } = {}) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { items, meta } = await fetchPage(fetchImpl, buildUrl(page));
    totalPages = Number(meta.totalPages) || totalPages;
    for (const item of items) {
      if (stopWhen && stopWhen(item)) return out;
      out.push(item);
    }
    if (items.length === 0) break; // defensive: never loop on an empty page
    page += 1;
  } while (page <= totalPages);
  return out;
}

async function collectTokens(fetchImpl, apiBase) {
  const buildUrl = (page) =>
    `${apiBase}/api/tokens?order_by=holders_count&order_direction=DESC&limit=${MAX_PAGE_LIMIT}&page=${page}`;
  return collectPaged(fetchImpl, buildUrl, { stopWhen: (t) => Number(t.holders_count) < 2 });
}

async function collectAccounts(fetchImpl, apiBase) {
  const buildUrl = (page) =>
    `${apiBase}/api/accounts?order_by=total_tx_count&order_direction=DESC&limit=${MAX_PAGE_LIMIT}&page=${page}`;
  const rows = await collectPaged(fetchImpl, buildUrl, { stopWhen: (a) => Number(a.total_tx_count) < 1 });
  return hubs.filterHubAccounts(rows); // share the hub gate (total_tx_count >= 1 AND banned === false).
}

async function collectPosts(fetchImpl, apiBase) {
  const buildUrl = (page) =>
    `${apiBase}/api/posts?order_by=created_at&order_direction=DESC&limit=${MAX_PAGE_LIMIT}&page=${page}`;
  return collectPaged(fetchImpl, buildUrl); // every post ships.
}

// Build the full entry list from live data. Throws on any page error so the caller can keep the
// last good buffer instead of publishing a partial document.
async function buildEntries(fetchImpl, apiBase, origin) {
  const [tokens, accounts, posts] = [
    await collectTokens(fetchImpl, apiBase),
    await collectAccounts(fetchImpl, apiBase),
    await collectPosts(fetchImpl, apiBase),
  ];
  const entries = [];
  for (const p of STATIC_PATHS) entries.push({ loc: `${origin}${p === '/' ? '/' : p}` });
  for (const t of tokens) entries.push({ loc: tokenLoc(origin, t.name), lastmod: toLastmod(t.created_at) });
  for (const a of accounts) entries.push({ loc: accountLoc(origin, a.address), lastmod: toLastmod(a.created_at) });
  for (const p of posts) entries.push({ loc: postLoc(origin, p.slug || p.id), lastmod: toLastmod(p.created_at) });
  return { entries, counts: { static: STATIC_PATHS.length, tokens: tokens.length, accounts: accounts.length, posts: posts.length } };
}

/* The in-memory buffer and its background refresher. One instance per server process. */
function createSitemapEngine({
  apiBase,
  origin = process.env.SITEMAP_ORIGIN || DEFAULT_ORIGIN,
  intervalMs = DEFAULT_REFRESH_MS,
  fetchImpl = globalThis.fetch,
  log = console,
} = {}) {
  const base = String(apiBase || '').replace(/\/$/, '');
  let buffer = null;        // last good XML, or null before the first successful build
  let generatedAt = null;   // ISO timestamp of the last good build
  let lastCounts = null;
  let timer = null;

  async function refresh() {
    try {
      const { entries, counts } = await buildEntries(fetchImpl, base, origin);
      buffer = buildSitemapXml(entries);
      generatedAt = new Date().toISOString();
      lastCounts = counts;
      log.log?.(`[sitemap] built ${entries.length} URLs (${JSON.stringify(counts)}) at ${generatedAt}`);
      return true;
    } catch (err) {
      // Keep the previous buffer — a single failed page must never empty the sitemap.
      log.error?.(`[sitemap] refresh failed, keeping previous buffer: ${err && err.message}`);
      return false;
    }
  }

  function start() {
    refresh(); // fire-and-forget at boot; the cold-start fallback covers the gap.
    timer = setInterval(refresh, intervalMs);
    if (timer.unref) timer.unref();
    return timer;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    start,
    stop,
    refresh,
    getBuffer: () => buffer,
    getGeneratedAt: () => generatedAt,
    getCounts: () => lastCounts,
  };
}

module.exports = {
  createSitemapEngine,
  buildSitemapXml,
  buildEntries,
  collectTokens,
  collectAccounts,
  collectPosts,
  tokenLoc,
  accountLoc,
  postLoc,
  toLastmod,
  escapeXml,
  STATIC_PATHS,
  MAX_PAGE_LIMIT,
};
