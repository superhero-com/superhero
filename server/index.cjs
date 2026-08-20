/* Production SEO injector server for SPA */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { injectHead } = require('./lib/head.cjs');

const PORT = process.env.PORT || 80;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const API_BASE = process.env.SUPERHERO_API_URL || 'https://api.superhero.com';

// Load template once
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');

// CSP: index.html's three first-party inline <script> tags already carry a
// `nonce="__CSP_NONCE__"` placeholder (checked into index.html) that gets replaced with a
// real per-response nonce below. Vite does not preserve a hand-authored `nonce` attribute on
// the `<script type="module" src="...">` entry tag it emits at build time — verified against
// this build's dist/index.html; Vite only auto-adds one via the `build.html.cspNonce` config
// option, which lives in vite.config.ts (out of this task's file scope — see
// the CSP rollout notes). Patch the
// same placeholder onto that tag once, here, at server start, so the one per-request
// `replaceAll('__CSP_NONCE__', nonce)` below covers all four <script> tags in the document.
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
  return out;
}

function truncate(s, n){ const t=(s||'').trim(); return t.length<=n?t:t.slice(0,Math.max(0,n-1))+'…'; }

function absolutize(url, origin){ if(!url) return undefined; if(/^https?:\/\//i.test(url)) return url; if(url.startsWith('//')) return `https:${url}`; if(url.startsWith('/')) return `${origin}${url}`; return `${origin}/${url}`; }

async function buildMeta(pathname, origin){
  // Root
  if (pathname === '/' || pathname === '') {
    return {
      title: 'Superhero.com – The All‑in‑One Social + Crypto App',
      description: 'Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network.',
      canonical: `${origin}/`,
      ogImage: `${origin}/og-default.png`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Superhero',
        url: origin,
      },
    };
  }

  // Trends page
  if (pathname === '/trends' || pathname === '/trends/tokens') {
    return {
      title: 'Superhero.com – Tokenize Trends. Own the Hype. Build Communities.',
      description: 'Discover and tokenize trending topics. Trade tokens, build communities, and own the hype on Superhero.',
      canonical: `${origin}/trends/tokens`,
      ogImage: `${origin}/og-default.png`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Superhero',
        url: `${origin}/trends/tokens`,
      },
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
        const raw = String(data?.content || '');
        const content = raw.replace(/\s+/g,' ').trim();
        const media = Array.isArray(data?.media) ? data.media : [];
        return {
          title: `${truncate(content,80) || 'Post'} – Superhero`,
          description: truncate(content,200) || 'View post on Superhero, the crypto social network.',
          canonical: `${origin}/post/${data?.slug || segment}`,
          ogImage: absolutize(media[0], origin) || `${origin}/og-default.png`,
          ogType: 'article',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'SocialMediaPosting',
            headline: truncate(content,120) || 'Post',
            datePublished: data?.created_at,
            dateModified: data?.updated_at || data?.created_at,
            author: { '@type': 'Person', name: data?.sender_address, identifier: data?.sender_address },
            image: media,
            interactionStatistic: [
              {
                '@type': 'InteractionCounter',
                interactionType: 'CommentAction',
                userInteractionCount: data?.total_comments || 0,
              },
            ],
          },
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
    let display = address;
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/api/accounts/${encodeURIComponent(address)}`, { headers: { accept: 'application/json' } });
      if (r.ok) { const data = await r.json(); bio = String(data?.bio||'').trim(); if (data?.chain_name) display = String(data.chain_name); }
    } catch {}
    return {
      title: `${address} – Profile – Superhero`,
      description: bio ? truncate(bio,200) : 'View profile on Superhero, the crypto social network.',
      canonical: `${origin}/users/${address}`,
      ogImage: `${origin}/og-default.png`,
      ogType: 'profile',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: display,
        identifier: address,
        description: bio || undefined,
        image: `${origin}/og-default.png`,
      },
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
        return {
          title: `Buy #${symbol} on Superhero.com`,
          description: truncate(desc,200),
          canonical: `${origin}/trends/tokens/${tokenName}`,
          ogImage: tokenImg || `${origin}/og-default.png`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CryptoCurrency',
            name: data?.name || data?.symbol,
            symbol: data?.symbol,
            identifier: data?.address || data?.sale_address,
            image: tokenImg,
          },
        };
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
        return {
          title: `Buy #${symbol} on Superhero.com`,
          description: truncate(desc,200),
          canonical: `${origin}/trends/tokens/${tokenName}`,
          ogImage: tokenImg || `${origin}/og-default.png`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CryptoCurrency',
            name: data?.name || data?.symbol,
            symbol: data?.symbol,
            identifier: data?.address || data?.sale_address,
            image: tokenImg,
          },
        };
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

// --- HARDEN-04: Content-Security-Policy (enforcing) -------------------------------------
// Enforcing — see @agency/products/superhero/tasks/HARDEN-04-csp-trusted-types.md. The policy
// blocks non-nonce'd scripts (`script-src 'strict-dynamic' 'nonce-…'`, no unsafe-inline) and,
// via `require-trusted-types-for 'script'` + `trusted-types superhero-dom default`, forces every
// innerHTML-class write and script-URL sink through src/utils/trustedTypes.ts. No report
// sink was ever wired (no report-uri/report-to header, no Reporting-Endpoints, no listener —
// grep-confirmed), so nothing here collected telemetry; enforcement is instead gated by the
// zero-violation Playwright soak in e2e/csp.spec.ts (npm run test:e2e:csp), which walks the
// routes under this exact header and fails on any `securitypolicyviolation`.

function originOf(url) {
  try { return new URL(url).origin; } catch { return null; }
}

// Deploy-time overrides this server already envsubst's into window.__SUPERCONFIG__ (see
// envInject above). Reading them here too means connect-src self-adjusts to whatever origins
// the running container is actually pointed at, instead of drifting from a hardcoded
// snapshot of src/config.ts's mainnet/testnet defaults whenever ops repoints an env var.
const RUNTIME_CONNECT_ENV_KEYS = [
  'BACKEND_URL', 'SUPERHERO_API_URL', 'SUPERHERO_WS_URL', 'NODE_URL', 'WALLET_URL',
  'MIDDLEWARE_URL', 'DEX_BACKEND_URL', 'MAINNET_DEX_BACKEND_URL', 'TESTNET_DEX_BACKEND_URL',
  'GOVERNANCE_API_URL', 'EXPLORER_URL',
];

// Embed inventory: mainnet +
// testnet API/middleware/node/DEX/governance/compiler origins hardcoded in src/config.ts,
// plus the third-party origins the app calls directly — F7 CORS proxies (LinkPreviewCard),
// F2 Twitter oEmbed existence check (TwitterCard — the `html` field is never rendered), and
// the GitHub/Openverse/Ethplorer card + search integrations (grep-verified literal URLs).
const CONNECT_SRC_ALLOWLIST = [
  "'self'",
  'https://api.superhero.com', 'wss://api.superhero.com',
  'https://testnet.api.dev.tokensale.org', 'wss://testnet.api.dev.tokensale.org',
  'https://mdw.wordcraft.fun',
  'https://testnet.aeternity.io',
  'https://v7.compiler.aepps.com',
  'https://dex-backend-mainnet.prd.service.aepps.com',
  'https://dex-backend-testnet.prd.service.aepps.com',
  'https://governance-server-mainnet.prd.service.aepps.com',
  'https://governance-server-testnet.prd.service.aepps.com',
  'https://api.codetabs.com',
  'https://api.allorigins.win',
  'https://publish.twitter.com',
  'https://api.github.com',
  'https://api.openverse.org',
  'https://api.ethplorer.io',
];

// Chat relays arrive as a comma-separated list in one env var (NOSTR_RELAY_URLS —
// the P2P default plus whatever groups_relay origin the API hands out), so unlike
// the single-URL keys above this one is split before mapping. originOf() returns
// null on the whole comma string, which is exactly the bug this avoids. The client
// reads the same env var via window.__SUPERCONFIG__, so the two lists cannot drift.
function relayConnectOrigins() {
  return String(process.env.NOSTR_RELAY_URLS || '')
    .split(',')
    .map((s) => originOf(s.trim()))
    .filter(Boolean);
}

function buildConnectSrc() {
  const dynamic = RUNTIME_CONNECT_ENV_KEYS
    .map((k) => originOf(process.env[k]))
    .filter(Boolean);
  return Array.from(new Set([...CONNECT_SRC_ALLOWLIST, ...dynamic, ...relayConnectOrigins()])).join(' ');
}

// The four sandboxed embed hosts: Twitter/X, YouTube, Spotify, Jitsi. Jitsi's
// host is deploy-configurable (CONFIG.JITSI_DOMAIN / $JITSI_DOMAIN, default meet.jit.si) —
// read the same env var this server already envsubst's into the page so this stays in sync.
function buildFrameSrc() {
  const jitsiOrigin = `https://${process.env.JITSI_DOMAIN || 'meet.jit.si'}`;
  return [
    'https://platform.twitter.com',
    'https://www.youtube-nocookie.com',
    'https://open.spotify.com',
    jitsiOrigin,
  ].join(' ');
}

function buildCsp(nonce) {
  return [
    "default-src 'none'",
    `script-src 'strict-dynamic' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "media-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "manifest-src 'self'",
    `connect-src ${buildConnectSrc()}`,
    `frame-src ${buildFrameSrc()}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "require-trusted-types-for 'script'",
    // superhero-dom: the audited first-party writer; default: the deny-markup safety net for
    // implicit third-party sinks (e.g. Radix Select's static <style>). See src/utils/trustedTypes.ts.
    'trusted-types superhero-dom default',
    'upgrade-insecure-requests',
  ].join('; ');
}

// HARDEN-04: the single place the SPA document is rendered. Every path that returns
// index.html goes through here, so the nonce, the enforcing CSP header and the
// `__CSP_NONCE__` substitution can never drift apart between routes.
async function sendSpaDocument(req, res) {
  // Fresh per-response nonce, matched into the CSP header and into every
  // nonce="__CSP_NONCE__" placeholder in the served document (see indexHtml patch above).
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', buildCsp(nonce));
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
app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), { immutable: true, maxAge: '1y' }));
app.use('/og-default.png', express.static(path.join(DIST_DIR, 'og-default.png')));

// HARDEN-04 bypass fix: `index: false` on the static mount below only disables the *implicit*
// directory index, so a literal `GET /index.html` still hit express.static and returned the SPA
// document with no CSP header at all and the raw `__CSP_NONCE__` placeholders — the same
// application document without the custody-boundary control. Route every literal *.html request
// to the document handler *before* express.static ever sees it. Matched by suffix rather than by
// exact path on purpose: it also covers `/./index.html` and, on a case-insensitive filesystem,
// `/INDEX.HTML`. dist/index.html is the only *.html file the build emits (verified), so nothing
// legitimate is diverted.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/\.html?$/i.test(req.path)) return next();
  return sendSpaDocument(req, res);
});
// `index: false` — HARDEN-04 fix: express.static's default `index: 'index.html'` option was
// auto-serving the raw dist/index.html file for GET `/` (a directory-style request), which
// silently short-circuited BOTH the SEO injectHead route below (head hardening — title/canonical/
// JSON-LD never actually reached `/`, the highest-traffic route) AND this CSP header (it was
// entirely absent on `/`; confirmed via `curl -I` before this fix — see task progress log).
// Static asset files below (assets/, og-default.png, and any other literal filename under
// dist/) are unaffected and still served exactly as before; only the implicit index.html
// fallback for directory-style paths is disabled so those always reach the route handlers.
app.use(express.static(DIST_DIR, { maxAge: '1d', index: false }));

app.get(['/', '/post/:id', '/users/:address', '/trends/tokens/:name', '/trends', '/trends/*', '/trending', '/trending/*', '/defi/*', '/voting*', '/explore*', '/swap*', '/pool*', '/users/*'], sendSpaDocument);

// Catch-all: serve SPA with basic SEO
app.get('*', sendSpaDocument);

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
