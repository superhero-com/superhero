/* Production SEO injector server for SPA */
const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 80;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const API_BASE = process.env.SUPERHERO_API_URL || 'https://api.superhero.com';

// Load template once
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');

function envInject(html) {
  // Simple env subst for window.__SUPERCONFIG__ placeholders like $BACKEND_URL
  const keys = [
    'BACKEND_URL','SUPERHERO_API_URL','SUPERHERO_WS_URL','NODE_URL','WALLET_URL','MIDDLEWARE_URL','DEX_BACKEND_URL','MAINNET_DEX_BACKEND_URL','TESTNET_DEX_BACKEND_URL','CONTRACT_V1_ADDRESS','CONTRACT_V2_ADDRESS','CONTRACT_V3_ADDRESS','WORD_REGISTRY_ADDRESS','PROFILE_REGISTRY_ADDRESS','LANDING_ENABLED','WORDBAZAAR_ENABLED','JITSI_DOMAIN','GOVERNANCE_API_URL','GOVERNANCE_CONTRACT_ADDRESS','EXPLORER_URL','IMGUR_API_CLIENT_ID','GIPHY_API_KEY','UNFINISHED_FEATURES','COMMIT_HASH','BONDING_CURVE_18_DECIMALS_ADDRESS'
  ];
  let out = html;
  for (const k of keys) {
    const val = process.env[k] || '';
    out = out.replaceAll(`$${k}`, String(val));
  }
  return out;
}

function truncate(s, n){ const t=(s||'').trim(); return t.length<=n?t:t.slice(0,Math.max(0,n-1))+'…'; }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));}

function absolutize(url, origin){ if(!url) return undefined; if(/^https?:\/\//i.test(url)) return url; if(url.startsWith('//')) return `https:${url}`; if(url.startsWith('/')) return `${origin}${url}`; return `${origin}/${url}`; }

async function buildMeta(pathname, origin){
  // Root
  if (pathname === '/' || pathname === '') {
    return {
      title: 'Superhero.com – the all‑in‑one social + crypto app',
      description: 'Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network.',
      canonical: `${origin}/`,
      ogImage: `${origin}/og-default.png`,
    };
  }

  // Post
  const pm = pathname.match(/^\/post\/([^/]+)/);
  if (pm) {
    const postId = pm[1];
    const id = postId.endsWith('_v3') ? postId : `${postId}_v3`;
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, '')}/api/posts/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data = await r.json();
        const raw = String(data?.content || '');
        const content = raw.replace(/\s+/g,' ').trim();
        const media = Array.isArray(data?.media) ? data.media : [];
        return {
          title: `${truncate(content,80) || 'Post'} – Superhero`,
          description: truncate(content,200) || 'View post on Superhero, the crypto social network.',
          canonical: `${origin}/post/${postId}`,
          ogImage: absolutize(media[0], origin) || `${origin}/og-default.png`,
          ogType: 'article',
        };
      }
    } catch {}
    return { title: 'Post – Superhero', canonical: `${origin}/post/${postId}`, ogImage: `${origin}/og-default.png`, ogType: 'article' };
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
        return { title: `${symbol} – Token on Superhero`, description: truncate(desc,200), canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: tokenImg || `${origin}/og-default.png` };
      }
    } catch {}
    return { title: `${address} – Token on Superhero`, canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: `${origin}/og-default.png` };
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
        return { title: `${symbol} – Token on Superhero`, description: truncate(desc,200), canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: tokenImg || `${origin}/og-default.png` };
      }
    } catch {}
    return { title: `${address} – Token on Superhero`, canonical: `${origin}/trends/tokens/${tokenName}`, ogImage: `${origin}/og-default.png` };
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

function injectHead(html, meta){
  const parts = [];
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (meta.description) parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  if (meta.canonical) parts.push(`<link rel="canonical" href="${meta.canonical}">`);
  parts.push(`<meta property="og:site_name" content="Superhero">`);
  parts.push(`<meta property="og:type" content="${meta.ogType || 'website'}">`);
  parts.push(`<meta property="og:title" content="${escapeHtml(meta.title)}">`);
  if (meta.description) parts.push(`<meta property="og:description" content="${escapeHtml(meta.description)}">`);
  if (meta.canonical) parts.push(`<meta property="og:url" content="${meta.canonical}">`);
  parts.push(`<meta property="og:image" content="${meta.ogImage}">`);
  parts.push(`<meta property="og:image:width" content="1200">`);
  parts.push(`<meta property="og:image:height" content="630">`);
  parts.push(`<meta name="twitter:card" content="summary_large_image">`);
  parts.push(`<meta name="twitter:title" content="${escapeHtml(meta.title)}">`);
  if (meta.description) parts.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}">`);
  parts.push(`<meta name="twitter:image" content="${meta.ogImage}">`);
  const idx = html.indexOf('</head>');
  if (idx === -1) return html;
  return html.slice(0, idx) + '\n' + parts.join('\n') + '\n' + html.slice(idx);
}

const app = express();
app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), { immutable: true, maxAge: '1y' }));
app.use('/og-default.png', express.static(path.join(DIST_DIR, 'og-default.png')));
app.use(express.static(DIST_DIR, { maxAge: '1d' }));

app.get(['/', '/post/:id', '/users/:address', '/trends/tokens/:name', '/trends', '/trends/*', '/trending', '/trending/*', '/defi/*', '/voting*', '/explore*', '/swap*', '/pool*', '/users/*'], async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const meta = await buildMeta(req.path, origin);
    const html = injectHead(envInject(indexHtml), meta);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.sendFile(INDEX_HTML);
  }
});

// Catch-all: serve SPA with basic SEO
app.get('*', async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const meta = await buildMeta(req.path, origin);
    const html = injectHead(envInject(indexHtml), meta);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.sendFile(INDEX_HTML);
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
