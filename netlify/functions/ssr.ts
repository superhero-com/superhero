// Netlify Function: SSR shell with SEO head injection (no client TSX imports)
import type { Handler } from '@netlify/functions';

type Meta = {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const ORIGIN = 'https://superhero.com';
const API_BASE = 'https://api.superhero.com';

function truncate(s: string, n: number): string {
  const str = (s || '').trim();
  if (str.length <= n) return str;
  return `${str.slice(0, Math.max(0, n - 1))}…`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  } as Record<string, string>)[c]);
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

async function fetchPostBySegment(baseApi: string, seg: string): Promise<any | null> {
  const url = `${baseApi}/api/posts/${encodeURIComponent(seg)}`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (r.ok) return r.json();
  return null;
}

async function buildMeta(pathname: string): Promise<Meta> {
  if (pathname === '/' || pathname === '') {
    const rootDescription = [
      'Discover crypto-native conversations, trending tokens, and on-chain activity.',
      'Join the æternity-powered social network.',
    ].join(' ');
    return {
      title: 'Superhero.com – The All‑in‑One Social + Crypto App',
      description: rootDescription,
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
    const trendsDescription = [
      'Discover and tokenize trending topics.',
      'Trade tokens, build communities, and own the hype on Superhero.',
    ].join(' ');
    return {
      title: 'Superhero.com – Tokenize Trends. Own the Hype. Build Communities.',
      description: trendsDescription,
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
    const segment = postMatch[1];
    const baseApi = API_BASE.replace(/\/$/, '');
    try {
      let data: any | null = await fetchPostBySegment(baseApi, segment);
      if (!data && /^\d+$/.test(segment)) {
        data = await fetchPostBySegment(baseApi, `${segment}_v3`);
      }
      if (!data) {
        const searchUrl = `${baseApi}/api/posts?search=${encodeURIComponent(segment)}&limit=1&page=1`;
        const sr = await fetch(searchUrl, { headers: { accept: 'application/json' } });
        if (sr.ok) {
          const sdata: any = await sr.json();
          const first = Array.isArray(sdata?.items) ? sdata.items[0] : null;
          if (first?.id) {
            data = await fetchPostBySegment(baseApi, String(first.id));
          }
        }
      }
      if (data) {
        const content: string = (data?.content || '').toString();
        const media: string[] = Array.isArray(data?.media) ? data.media : [];
        return {
          title: `${truncate(content, 80) || 'Post'} – Superhero`,
          description: truncate(content, 160) || 'View post on Superhero, the crypto social network.',
          canonical: `${ORIGIN}/post/${data?.slug || segment}`,
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
              {
                '@type': 'InteractionCounter',
                interactionType: 'CommentAction',
                userInteractionCount: data?.total_comments || 0,
              },
            ],
          },
        };
      }
    } catch {
      // Fall through to shared fallback below
    }
    return { title: 'Post – Superhero', canonical: `${ORIGIN}/post/${segment}` };
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
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: display,
            identifier: address,
            description: bio || undefined,
          },
        };
      }
    } catch {
      // Fall through to shared fallback below
    }
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
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CryptoCurrency',
            name: data?.name || data?.symbol,
            symbol: data?.symbol,
            identifier: data?.address || data?.sale_address,
          },
        };
      }
    } catch {
      // Fall through to shared fallback below
    }
    return { title: `Buy #${address} on Superhero.com`, canonical: `${ORIGIN}/trends/tokens/${tokenName}` };
  }

  return { title: 'Superhero', canonical: `${ORIGIN}${pathname}` };
}

function buildHead(meta: Meta): string {
  const parts: string[] = [];
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (meta.description) parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  if (meta.canonical) parts.push(`<link rel="canonical" href="${escapeAttr(meta.canonical)}">`);
  parts.push('<meta property="og:site_name" content="Superhero">');
  parts.push('<meta property="og:type" content="website">');
  parts.push(`<meta property="og:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta property="og:description" content="${escapeAttr(meta.description)}">`);
  if (meta.canonical) parts.push(`<meta property="og:url" content="${escapeAttr(meta.canonical)}">`);
  parts.push(`<meta property="og:image" content="${escapeAttr(meta.ogImage || '/og-default.png')}">`);
  parts.push(`<meta name="twitter:card" content="${meta.ogImage ? 'summary_large_image' : 'summary'}">`);
  parts.push(`<meta name="twitter:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta name="twitter:description" content="${escapeAttr(meta.description)}">`);
  parts.push(`<meta name="twitter:image" content="${escapeAttr(meta.ogImage || '/og-default.png')}">`);
  let jsonLdArray: Record<string, unknown>[] = [];
  if (Array.isArray(meta.jsonLd)) {
    jsonLdArray = meta.jsonLd;
  } else if (meta.jsonLd) {
    jsonLdArray = [meta.jsonLd];
  }
  jsonLdArray.forEach((schema) => {
    parts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  });
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

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl || `${ORIGIN}${event.path}`);
    const meta = await buildMeta(url.pathname);
    const head = buildHead(meta);
    const html = buildHtml(head);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: html,
    };
  } catch {
    const html = buildHtml(buildHead({ title: 'Superhero', canonical: `${ORIGIN}${event.path}` }));
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
  }
};
