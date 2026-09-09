/* Production SEO injector server for SPA */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { injectHead } = require('./lib/head.cjs');
const { createCspPolicy, CSP_REPORT_PATH } = require('./lib/csp.cjs');
const { decodedPath, isSubresourceRequest } = require('./lib/subresource.cjs');

const PORT = process.env.PORT || 80;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const API_BASE = process.env.SUPERHERO_API_URL || 'https://api.superhero.com';

// Load template once
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');

// index.html's three first-party inline <script> tags carry a checked-in
// `nonce="__CSP_NONCE__"` placeholder, but Vite strips a hand-authored nonce from the
// `<script type="module" src="...">` entry tag it emits (it only adds one via its own
// `build.html.cspNonce` option). Patch the placeholder onto that tag once at startup so the
// per-request `replaceAll('__CSP_NONCE__', nonce)` covers all four script tags.
indexHtml = indexHtml.replace(
  /<script type="module"(?![^>]*\bnonce=)([^>]*)>/,
  '<script type="module" nonce="__CSP_NONCE__"$1>',
);

function envInject(html) {
  // Simple env subst for window.__SUPERCONFIG__ placeholders like $BACKEND_URL
  const keys = [
    'BACKEND_URL','SUPERHERO_API_URL','SUPERHERO_WS_URL','NODE_URL','WALLET_URL','MIDDLEWARE_URL','DEX_BACKEND_URL','MAINNET_DEX_BACKEND_URL','TESTNET_DEX_BACKEND_URL','CONTRACT_V3_ADDRESS','LANDING_ENABLED','WORDBAZAAR_ENABLED','POPULAR_FEED_ENABLED','JITSI_DOMAIN','GOVERNANCE_API_URL','GOVERNANCE_CONTRACT_ADDRESS','EXPLORER_URL','UNFINISHED_FEATURES','COMMIT_HASH','NOSTR_RELAY_URLS'
  ];
  let out = html;
  for (const k of keys) {
    const val = process.env[k] || '';
    out = out.replaceAll(`$${k}`, String(val));
  }
  // Keys whose built-in default in src/config.ts must survive an UNSET env var,
  // while still being overridable — including being turned off. The substitution
  // above cannot express that on its own: it collapses "unset" and "set to empty"
  // to the same '', and the client reads '' for NOSTR_RELAY_URLS as an explicit
  // "chat off" (EMPTY_MEANS_OFF in src/config.ts).
  //
  // So when the var is genuinely absent, drop the key from the payload entirely
  // and let the bundled default win. `NOSTR_RELAY_URLS=` (present but empty) still
  // reaches the client as '' and still disables chat.
  if (process.env.NOSTR_RELAY_URLS === undefined) {
    out = out.replace(/^\s*NOSTR_RELAY_URLS: '',?\r?\n/m, '');
  }
  return out;
}

function truncate(s, n){ const t=(s||'').trim(); return t.length<=n?t:t.slice(0,Math.max(0,n-1))+'…'; }

// Strip a token-tag display envelope (`#SYMBOL{mode=advanced}` -> `#SYMBOL`) so it never
// lands in a meta description or link preview. Kept in sync with the client grammar in
// src/utils/tokenTagEnvelope.ts (this file is a standalone CommonJS SSR copy — same reason
// truncate/absolutize are duplicated here rather than imported).
function stripTokenTagEnvelopes(s){ return String(s||'').replace(/(#[\p{L}\p{N}-]{1,50})\{[^{}\r\n]{0,64}\}/gu, '$1'); }

function absolutize(url, origin){ if(!url) return undefined; if(/^https?:\/\//i.test(url)) return url; if(url.startsWith('//')) return `https:${url}`; if(url.startsWith('/')) return `${origin}${url}`; return `${origin}/${url}`; }

async function buildMeta(pathname, origin){
  // Root
  if (pathname === '/' || pathname === '') {
    return {
      title: 'Superhero.com – The All‑in‑One Social + Crypto App',
      description: 'Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network.',
      canonical: `${origin}/`,
      ogImage: `${origin}/og-default.png`,
    };
  }

  // Trends page
  if (pathname === '/trends' || pathname === '/trends/tokens') {
    return {
      title: 'Superhero.com – Tokenize Trends. Own the Hype. Build Communities.',
      description: 'Discover and tokenize trending topics. Trade tokens, build communities, and own the hype on Superhero.',
      canonical: `${origin}/trends/tokens`,
      ogImage: `${origin}/og-default.png`,
    };
  }

  // Post
  const pm = pathname.match(/^\/post\/([^/]+)/);
  if (pm) {
    const segment = pm[1];
    const baseApi = API_BASE.replace(/\/$/, '');
    async function fetchPostBySegment(seg){
      const r = await fetch(`${baseApi}/api/posts/${encodeURIComponent(seg)}`, { headers: { accept: 'application/json' } });
      if (r.ok) return r.json();
      return null;
    }
    try {
      let data = await fetchPostBySegment(segment);
      if (!data && /^\d+$/.test(segment)) {
        data = await fetchPostBySegment(`${segment}_v3`);
      }
      if (!data) {
        const sr = await fetch(`${baseApi}/api/posts?search=${encodeURIComponent(segment)}&limit=1&page=1`, { headers: { accept: 'application/json' } });
        if (sr.ok) {
          const sdata = await sr.json();
          const first = Array.isArray(sdata?.items) ? sdata.items[0] : null;
          if (first?.id) data = await fetchPostBySegment(String(first.id));
        }
      }
      if (data) {
        const raw = stripTokenTagEnvelopes(String(data?.content || ''));
        const content = raw.replace(/\s+/g,' ').trim();
        const media = Array.isArray(data?.media) ? data.media : [];
        return {
          title: `${truncate(content,80) || 'Post'} – Superhero`,
          description: truncate(content,200) || 'View post on Superhero, the crypto social network.',
          canonical: `${origin}/post/${data?.slug || segment}`,
          ogImage: absolutize(media[0], origin) || `${origin}/og-default.png`,
          ogType: 'article',
        };
      }
    } catch {}
    return { title: 'Post – Superhero', canonical: `${origin}/post/${segment}`, ogImage: `${origin}/og-default.png`, ogType: 'article' };
  }

  // User
  const um = pathname.match(/^\/users\/([^/]+)/);
  if (um) {
    const address = um[1];
    let bio = '';
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/api/accounts/${encodeURIComponent(address)}`, { headers: { accept: 'application/json' } });
      if (r.ok) { const data = await r.json(); bio = String(data?.bio||'').trim(); }
    } catch {}
    return {
      title: `${address} – Profile – Superhero`,
      description: bio ? truncate(bio,200) : 'View profile on Superhero, the crypto social network.',
      canonical: `${origin}/users/${address}`,
      ogImage: `${origin}/og-default.png`,
      ogType: 'profile',
    };
  }

  // Token (new route)
  const tm = pathname.match(/^\/trends\/tokens\/([^/]+)/);
  if (tm) {
    const tokenName = tm[1];
    const address = tokenName.toUpperCase();
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/api/tokens/${encodeURIComponent(address)}`, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data = await r.json();
        const symbol = data?.symbol || data?.name || address;
        const desc = data?.metaInfo?.description || `Explore ${symbol} token, trades, holders and posts.`;
        const tokenImg = absolutize((data?.logo_url || data?.image_url || data?.logo), origin);
        return { title: `Buy #${symbol} on Superhero.com`, description: truncate(desc,200), canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: tokenImg || `${origin}/og-default.png` };
      }
    } catch {}
    return { title: `Buy #${address} on Superhero.com`, canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: `${origin}/og-default.png` };
  }

  // Legacy token route: /trending/tokens/:name → canonical to /trends/tokens/:name
  const tml = pathname.match(/^\/trending\/tokens\/([^/]+)/);
  if (tml) {
    const tokenName = tml[1];
    const address = tokenName.toUpperCase();
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/api/tokens/${encodeURIComponent(address)}`, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data = await r.json();
        const symbol = data?.symbol || data?.name || address;
        const desc = data?.metaInfo?.description || `Explore ${symbol} token, trades, holders and posts.`;
        const tokenImg = absolutize((data?.logo_url || data?.image_url || data?.logo), origin);
        return { title: `Buy #${symbol} on Superhero.com`, description: truncate(desc,200), canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: tokenImg || `${origin}/og-default.png` };
      }
    } catch {}
    return { title: `Buy #${address} on Superhero.com`, canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: `${origin}/og-default.png` };
  }

  // Trends accounts
  const ta = pathname.match(/^\/trends\/accounts\/([^/]+)/);
  if (ta) {
    const address = ta[1];
    return {
      title: `Account Activity – ${address} – Superhero`,
      description: 'View account activity, holders, and posts on Superhero.',
      canonical: `${origin}/trends/accounts/${address}`,
      ogImage: `${origin}/og-default.png`,
    };
  }

  // DAO routes (basic metadata)
  const dao = pathname.match(/^\/trends\/dao\/([^/]+)$/);
  if (dao) {
    const sale = dao[1];
    return {
      title: `DAO – ${sale} – Superhero`,
      description: 'View DAO details, proposals, and votes on Superhero.',
      canonical: `${origin}/trends/dao/${sale}`,
      ogImage: `${origin}/og-default.png`,
    };
  }
  const daov = pathname.match(/^\/trends\/dao\/([^/]+)\/vote\/([^/]+)\/([^/]+)$/);
  if (daov) {
    const sale = daov[1];
    const voteId = daov[2];
    return {
      title: `DAO Vote ${voteId} – ${sale} – Superhero`,
      description: 'Vote details on Superhero.',
      canonical: `${origin}/trends/dao/${sale}/vote/${voteId}/${daov[3]}`,
      ogImage: `${origin}/og-default.png`,
      ogType: 'article',
    };
  }

  // Tx queue
  const txq = pathname.match(/^\/tx-queue\/([^/]+)/);
  if (txq) {
    const id = txq[1];
    return {
      title: `Transaction ${id} – Superhero`,
      description: 'Track pending transaction status on Superhero.',
      canonical: `${origin}/tx-queue/${id}`,
      ogImage: `${origin}/og-default.png`,
    };
  }

  // Static pages
  if (pathname === '/terms') {
    return { title: 'Terms of Service – Superhero', description: 'Superhero terms of service.', canonical: `${origin}/terms`, ogImage: `${origin}/og-default.png` };
  }
  if (pathname === '/privacy') {
    return { title: 'Privacy Policy – Superhero', description: 'How Superhero handles your data.', canonical: `${origin}/privacy`, ogImage: `${origin}/og-default.png` };
  }
  if (pathname === '/faq') {
    return { title: 'FAQ – Superhero', description: 'Frequently asked questions.', canonical: `${origin}/faq`, ogImage: `${origin}/og-default.png` };
  }
  if (pathname.startsWith('/meet')) {
    return { title: 'Meet – Superhero', description: 'Join a Superhero meeting.', canonical: `${origin}${pathname}`, ogImage: `${origin}/og-default.png` };
  }

  return { title: 'Superhero', canonical: `${origin}${pathname}`, ogImage: `${origin}/og-default.png` };
}

// The policy itself lives in ./lib/csp.cjs so scripts/check-csp-origins.cjs can diff its
// allowlist against the built bundle and the directives can be asserted in tests.
const { buildCsp } = createCspPolicy();

// The single place the SPA document is rendered. It reuses the nonce the security-header
// middleware already put on the response, so the header and the document's
// `nonce="__CSP_NONCE__"` placeholders cannot disagree.
async function sendSpaDocument(req, res) {
  const nonce = res.locals.cspNonce;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const meta = await buildMeta(req.path, origin);
    res.send(injectHead(envInject(indexHtml), meta).replaceAll('__CSP_NONCE__', nonce));
  } catch (e) {
    res.send(indexHtml.replaceAll('__CSP_NONCE__', nonce));
  }
}

const app = express();

// Transport headers on everything, assets included — nosniff matters most on the JS and CSS
// under /assets. Mirrors the set netlify.toml applies, so the two deploy targets agree.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Content-hashed, immutable subresources. Mounted ahead of the CSP so the ~1.5 kB policy is not
// repeated across ~150 chunk requests per cold load; nothing under /assets can be a document.
app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), { immutable: true, maxAge: '1y' }));

// CSP before routing, so coverage never depends on which mount or route wins. Anything that
// slips past the *.html handler below is still served under the policy, and since the nonce
// cannot match the raw `__CSP_NONCE__` placeholders in dist/index.html, such a response is inert
// rather than unprotected.
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', buildCsp(res.locals.cspNonce));
  res.setHeader('Reporting-Endpoints', `csp-endpoint="${CSP_REPORT_PATH}"`);
  next();
});

// Violation sink. Report bodies are attacker-writable, so they are only logged — nothing here
// parses them into state the server acts on.
app.post(
  CSP_REPORT_PATH,
  express.json({
    type: ['application/csp-report', 'application/reports+json', 'application/json'],
    limit: '16kb',
  }),
  (req, res) => {
    const reports = Array.isArray(req.body) ? req.body : [req.body];
    for (const report of reports) {
      const body = report?.body || report?.['csp-report'] || {};
      console.warn(
        '[csp] %s blocked %s',
        body.effectiveDirective || body['violated-directive'] || '?',
        body.blockedURL || body['blocked-uri'] || '?',
      );
    }
    res.status(204).end();
  },
);

app.use('/og-default.png', express.static(path.join(DIST_DIR, 'og-default.png')));

// Route literal *.html requests to the document handler before express.static can answer them
// off disk. Suffix-matched on the decoded path, so it also covers `/./index.html` and, on a
// case-insensitive filesystem, `/INDEX.HTML`.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/\.html?$/i.test(decodedPath(req.path))) return next();
  return sendSpaDocument(req, res);
});

// `index: false` so a directory-style request for `/` reaches the SEO route handlers below
// instead of being answered with the raw dist/index.html.
app.use(express.static(DIST_DIR, {
  maxAge: '1d',
  index: false,
  setHeaders: (res, filePath) => {
    // A service worker script must never be answered from a stale cache: the browser's update
    // check is the ONLY way a worker is replaced, so a cached copy makes a shipped fix invisible
    // for as long as that entry lives.
    if (/-sw\.js$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// Subresource requests must 404 rather than fall through to the SPA document below — see
// lib/subresource.cjs for what that prevents and how a request is classified.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!isSubresourceRequest(decodedPath(req.path), req.get('sec-fetch-dest'))) return next();
  return res.status(404).type('text/plain').send('Not found');
});

// Express 5 (path-to-regexp v8) has no bare `*`: a wildcard must be its own named segment.
// The `/voting*`-style suffix patterns have no direct equivalent, so they become the literal
// route plus its subtree; anything else they used to catch (`/votingfoo`) still lands on the
// same handler via the catch-all below, so what is served is unchanged.
app.get([
  '/',
  '/post/:id',
  '/users/:address',
  '/users/*splat',
  '/trends/tokens/:name',
  '/trends',
  '/trends/*splat',
  '/trending',
  '/trending/*splat',
  '/defi/*splat',
  '/voting',
  '/voting/*splat',
  '/explore',
  '/explore/*splat',
  '/swap',
  '/swap/*splat',
  '/pool',
  '/pool/*splat',
], sendSpaDocument);

// Catch-all: serve SPA with basic SEO
app.get('/*splat', sendSpaDocument);

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
