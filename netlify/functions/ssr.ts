// Netlify Function: SSR shell with SEO head injection (no client TSX imports)
import type { Handler } from '@netlify/functions';

const ORIGIN = 'https://superhero.com';
const API_BASE = 'https://api.superhero.com';

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl || `${ORIGIN}${event.path}`);
    const meta = await buildMeta(url.pathname, url);
    const head = buildHead(meta);
    const html = buildHtml(head);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: html,
    };
  } catch (_e) {
    const html = buildHtml(buildHead({ title: 'Superhero', canonical: `${ORIGIN}${event.path}` }));
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
  }
};

type Meta = {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

async function buildMeta(pathname: string, _fullUrl: URL): Promise<Meta> {
  if (pathname === '/' || pathname === '') {
    return {
      title: 'Superhero.com – The All‑in‑One Social + Crypto App',
      description: 'Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network.',
      canonical: `${ORIGIN}/`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Superhero',
        url: ORIGIN,
      },
    };
  }

  // Trends page
  if (pathname === '/trends' || pathname === '/trends/tokens') {
    return {
      title: 'Superhero.com – Tokenize Trends. Own the Hype. Build Communities.',
      description: 'Discover and tokenize trending topics. Trade tokens, build communities, and own the hype on Superhero.',
      canonical: `${ORIGIN}/trends/tokens`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Superhero',
        url: `${ORIGIN}/trends/tokens`,
      },
    };
  }

  const postMatch = pathname.match(/^\/post\/([^/]+)/);
  if (postMatch) {
    const postId = postMatch[1];
    const id = postId.endsWith('_v3') ? postId : `${postId}_v3`;
    const apiUrl = `${API_BASE.replace(/\/$/, '')}/api/posts/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(apiUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data: any = await r.json();
        const content: string = (data?.content || '').toString();
        const media: string[] = Array.isArray(data?.media) ? data.media : [];
        return {
          title: `${truncate(content, 80) || 'Post'} – Superhero`,
          description: truncate(content, 160) || 'View post on Superhero, the crypto social network.',
          canonical: `${ORIGIN}/post/${postId}`,
          ogImage: media[0],
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'SocialMediaPosting',
            headline: truncate(content, 120) || 'Post',
            datePublished: data?.created_at,
            dateModified: data?.updated_at || data?.created_at,
            author: { '@type': 'Person', name: data?.sender_address, identifier: data?.sender_address },
            image: media,
            interactionStatistic: [
              { '@type': 'InteractionCounter', interactionType: 'CommentAction', userInteractionCount: data?.total_comments || 0 },
            ],
          },
        };
      }
    } catch {}
    return { title: 'Post – Superhero', canonical: `${ORIGIN}/post/${postId}` };
  }

  const userMatch = pathname.match(/^\/users\/([^/]+)/);
  if (userMatch) {
    const address = userMatch[1];
    const apiUrl = `${API_BASE.replace(/\/$/, '')}/api/accounts/${encodeURIComponent(address)}`;
    try {
      const r = await fetch(apiUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data: any = await r.json();
        const display = (data?.chain_name || address) as string;
        const bio = (data?.bio || '').toString();
        return {
          title: `${display} – Profile – Superhero`,
          description: truncate(bio || `View ${display} on Superhero, the crypto social network.`, 160),
          canonical: `${ORIGIN}/users/${address}`,
          jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: display, identifier: address, description: bio || undefined },
        };
      }
    } catch {}
    return { title: `${address} – Profile – Superhero`, canonical: `${ORIGIN}/users/${address}` };
  }

  const tokenMatch = pathname.match(/^\/trends\/tokens\/([^/]+)/);
  if (tokenMatch) {
    const tokenName = tokenMatch[1];
    const address = tokenName.toUpperCase();
    const apiUrl = `${API_BASE.replace(/\/$/, '')}/api/tokens/${encodeURIComponent(address)}`;
    try {
      const r = await fetch(apiUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data: any = await r.json();
        const symbol = data?.symbol || data?.name || address;
        const desc = data?.metaInfo?.description || `Explore ${symbol} token, trades, holders and posts.`;
        return {
          title: `Buy #${symbol} on Superhero.com`,
          description: truncate(desc, 160),
          canonical: `${ORIGIN}/trends/tokens/${tokenName}`,
          jsonLd: { '@context': 'https://schema.org', '@type': 'CryptoCurrency', name: data?.name || data?.symbol, symbol: data?.symbol, identifier: data?.address || data?.sale_address },
        };
      }
    } catch {}
    return { title: `Buy #${address} on Superhero.com`, canonical: `${ORIGIN}/trends/tokens/${tokenName}` };
  }

  return { title: 'Superhero', canonical: `${ORIGIN}${pathname}` };
}

function buildHead(meta: Meta): string {
  const parts: string[] = [];
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (meta.description) parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  if (meta.canonical) parts.push(`<link rel="canonical" href="${escapeAttr(meta.canonical)}">`);
  parts.push(`<meta property="og:site_name" content="Superhero">`);
  parts.push(`<meta property="og:type" content="website">`);
  parts.push(`<meta property="og:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta property="og:description" content="${escapeAttr(meta.description)}">`);
  if (meta.canonical) parts.push(`<meta property="og:url" content="${escapeAttr(meta.canonical)}">`);
  parts.push(`<meta property="og:image" content="${escapeAttr(meta.ogImage || '/og-default.png')}">`);
  parts.push(`<meta name="twitter:card" content="${meta.ogImage ? 'summary_large_image' : 'summary'}">`);
  parts.push(`<meta name="twitter:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta name="twitter:description" content="${escapeAttr(meta.description)}">`);
  parts.push(`<meta name="twitter:image" content="${escapeAttr(meta.ogImage || '/og-default.png')}">`);
  const jsonLdArray = Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : [];
  for (const schema of jsonLdArray) parts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  return parts.join('\n');
}

function buildHtml(head: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    ${head}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

function truncate(s: string, n: number): string {
  const str = (s || '').trim();
  if (str.length <= n) return str;
  return str.slice(0, Math.max(0, n - 1)) + '…';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
