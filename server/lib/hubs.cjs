/* Pure, side-effect-free helpers for the crawlable internal-link hubs (ZIX-3191).
 *
 * Token pages already get indexed because they are reachable from the crawlable
 * /trends/tokens list; user and post pages had no equivalent hub. These directory pages
 * emit real server-rendered <a> links to every gate-passing profile and post so crawlers
 * and agents can discover — and weight — them. Like head.cjs/faq-content.cjs this file has
 * no fs/network dependency: the Express bootstrap fetches the data and passes it in, so the
 * rendering and the surfacing gate can be unit-tested in isolation. */

const { escapeHtml, escapeAttr } = require('./head.cjs');

// One API page == one hub page. The list endpoints cap at 100 items/request.
const HUB_PAGE_SIZE = 100;

const SECTIONS = {
  users: {
    heading: 'User profiles',
    description:
      "Browse Superhero user profiles. Each links to an æternity account's on-chain activity, posts, and holdings.",
  },
  posts: {
    heading: 'Posts',
    description: 'Browse posts published on Superhero, the æternity-powered social network.',
  },
};

function truncate(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, Math.max(0, n - 1))}…`;
}

// Surfacing gate — ruled by the Superhero Technical Lead on ZIX-3192 and shared with the
// sitemap engine: an account is worth a crawlable link once a party other than its creator
// has touched it (total_tx_count >= 1) and it is not banned. Posts carry no gate (all surface).
function filterHubAccounts(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((a) => a && Number(a.total_tx_count) >= 1 && a.banned === false);
}

function accountHubLink(account, origin) {
  const address = String(account.address || '');
  const label = account.chain_name ? String(account.chain_name) : address;
  return { href: `${origin}/users/${address}`, label };
}

function postHubLink(post, origin) {
  // Prefer the slug the /post canonical uses; fall back to the resolvable id.
  const key = String(post.slug || post.id || '');
  const label = truncate(post.content, 80) || key;
  return { href: `${origin}/post/${key}`, label };
}

function pageUrl(base, p) {
  return p > 1 ? `${base}?page=${p}` : base;
}

function headLink(rel, href) {
  return href ? `<link rel="${rel}" href="${escapeAttr(href)}">` : '';
}

function renderLinkList(links) {
  if (!links.length) return '<p>No entries available right now.</p>';
  const items = links
    .map((l) => `<li><a href="${escapeAttr(l.href)}">${escapeHtml(l.label)}</a></li>`)
    .join('\n');
  return `<ul class="hub-list">\n${items}\n</ul>`;
}

function renderNav(prevUrl, nextUrl) {
  const parts = [];
  if (prevUrl) parts.push(`<a rel="prev" href="${escapeAttr(prevUrl)}">← Previous</a>`);
  if (nextUrl) parts.push(`<a rel="next" href="${escapeAttr(nextUrl)}">Next →</a>`);
  return parts.length ? `<nav class="hub-nav">${parts.join(' ')}</nav>` : '';
}

const HUB_STYLE =
  'body{font-family:system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:1.5rem;line-height:1.5}'
  + 'h1{font-size:1.5rem}.hub-list{columns:2;gap:1.5rem;word-break:break-all}'
  + '.hub-nav{margin-top:1.5rem;display:flex;gap:1rem}a{color:#0a58ca}';

function documentShell({ title, description, canonical, origin, prevUrl, nextUrl, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeAttr(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:site_name" content="Superhero">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:url" content="${escapeAttr(canonical)}">
${headLink('prev', prevUrl)}${headLink('next', nextUrl)}
<style>${HUB_STYLE}</style>
</head>
<body>
<header><a href="${escapeAttr(origin)}/">Superhero</a></header>
<main>
${bodyHtml}
</main>
</body>
</html>`;
}

function renderHubIndex(origin) {
  const canonical = `${origin}/hubs`;
  const description =
    "Directory of Superhero's on-chain content — index pages linking to individual user profiles and posts for search engines and agents.";
  const bodyHtml = `<h1>Superhero directory</h1>
<p>${escapeHtml(description)}</p>
<ul class="hub-list">
<li><a href="${escapeAttr(origin)}/hubs/users">User profiles</a></li>
<li><a href="${escapeAttr(origin)}/hubs/posts">Posts</a></li>
<li><a href="${escapeAttr(origin)}/trends/tokens">Trending tokens</a></li>
</ul>`;
  return documentShell({
    title: 'Directory – Superhero',
    description,
    canonical,
    origin,
    prevUrl: '',
    nextUrl: '',
    bodyHtml,
  });
}

function hubListPage({ section, origin, page, links, totalPages }) {
  const meta = SECTIONS[section];
  if (!meta) throw new Error(`unknown hub section: ${section}`);
  const base = `${origin}/hubs/${section}`;
  const canonical = pageUrl(base, page);
  const prevUrl = page > 1 ? pageUrl(base, page - 1) : '';
  const nextUrl = page < totalPages ? pageUrl(base, page + 1) : '';
  const title = page > 1
    ? `${meta.heading} (page ${page}) – Superhero`
    : `${meta.heading} – Superhero`;
  const bodyHtml = `<p><a href="${escapeAttr(origin)}/hubs">← Directory</a></p>
<h1>${escapeHtml(meta.heading)}</h1>
<p>${escapeHtml(meta.description)}</p>
${renderLinkList(links)}
${renderNav(prevUrl, nextUrl)}`;
  return documentShell({
    title,
    description: meta.description,
    canonical,
    origin,
    prevUrl,
    nextUrl,
    bodyHtml,
  });
}

module.exports = {
  HUB_PAGE_SIZE,
  SECTIONS,
  filterHubAccounts,
  accountHubLink,
  postHubLink,
  renderHubIndex,
  hubListPage,
};
