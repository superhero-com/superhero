/* Netlify Edge Function: Inject SEO head tags for key routes */

type Meta = {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  ogType?: string;
};

const ORIGIN = 'https://superhero.com';
const API_BASE = 'https://api.superhero.com';

export default async (request: Request, context: any) => {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const res = await context.next();
    // Only inject into HTML documents
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return res;

  const html = await res.text();

  const meta = await buildMeta(pathname, url);
  const injected = injectHead(html, meta);

    const newHeaders = new Headers(res.headers);
    newHeaders.set('content-length', String(new TextEncoder().encode(injected).length));
    return new Response(injected, { status: res.status, headers: newHeaders });
  } catch (_e) {
    // On any error, continue with the original response
    return context.next();
  }
};

async function buildMeta(pathname: string, fullUrl: URL): Promise<Meta> {
  // Root
  if (pathname === '/' || pathname === '') {
    return {
      title: 'Superhero – Crypto Social Network: Posts, Tokens, Governance',
      description: 'Discover crypto-native conversations, trending tokens, and on-chain activity. Join the æternity-powered social network.',
      canonical: `${fullUrl.origin}/`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Superhero',
        url: fullUrl.origin,
      },
    };
  }

  // Post detail: /post/:postId
  const postMatch = pathname.match(/^\/post\/([^/]+)/);
  if (postMatch) {
    const postId = postMatch[1];
    const id = postId.endsWith('_v3') ? postId : `${postId}_v3`;
    const apiUrl = `${API_BASE.replace(/\/$/, '')}/posts/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(apiUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data: any = await r.json();
        const raw: string = (data?.content || '').toString();
        const content: string = raw.replace(/\s+/g, ' ').trim();
        const media: string[] = Array.isArray(data?.media) ? data.media : [];
        return {
          title: `${truncate(content, 80) || 'Post'} – Superhero`,
          description: truncate(content, 200) || 'View post on Superhero, the crypto social network.',
          canonical: `${fullUrl.origin}/post/${postId}`,
          ogImage: absolutize(media[0], fullUrl.origin),
          ogType: 'article',
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
    } catch {}
    return {
      title: 'Post – Superhero',
      canonical: `${fullUrl.origin}/post/${postId}`,
      ogType: 'article',
    };
  }

  // User profile: /users/:address
  const userMatch = pathname.match(/^\/users\/([^/]+)/);
  if (userMatch) {
    const address = userMatch[1];
    const apiUrl = `${API_BASE.replace(/\/$/, '')}/accounts/${encodeURIComponent(address)}`;
    try {
      const r = await fetch(apiUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data: any = await r.json();
        const display = (data?.chain_name || address) as string;
        const bio = (data?.bio || '').toString();
        const avatar = absolutize((data?.avatar_url || data?.avatar || data?.image_url) as string | undefined, fullUrl.origin);
        return {
          title: `${display} – Profile – Superhero`,
          description: truncate(bio || `View ${display} on Superhero, the crypto social network.`, 200),
          canonical: `${fullUrl.origin}/users/${address}`,
          ogImage: avatar || `${fullUrl.origin}/og-default.png`,
          ogType: 'profile',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: display,
            identifier: address,
            description: bio || undefined,
            image: avatar,
          },
        };
      }
    } catch {}
    return {
      title: `${address} – Profile – Superhero`,
      canonical: `${fullUrl.origin}/users/${address}`,
      ogImage: `${fullUrl.origin}/og-default.png`,
      ogType: 'profile',
    };
  }

  // Token details: /trends/tokens/:tokenName
  const tokenMatch = pathname.match(/^\/trends\/tokens\/([^/]+)/);
  if (tokenMatch) {
    const tokenName = tokenMatch[1];
    const address = tokenName.toUpperCase();
    const apiUrl = `${API_BASE.replace(/\/$/, '')}/tokens/${encodeURIComponent(address)}`;
    try {
      const r = await fetch(apiUrl, { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data: any = await r.json();
        const symbol = data?.symbol || data?.name || address;
        const desc = data?.metaInfo?.description || `Explore ${symbol} token, trades, holders and posts.`;
        const tokenImg = absolutize((data?.logo_url || data?.image_url || data?.logo) as string | undefined, fullUrl.origin);
        return {
          title: `${symbol} – Token on Superhero`,
          description: truncate(desc, 200),
          canonical: `${fullUrl.origin}/trends/tokens/${tokenName}`,
          ogImage: tokenImg || `${fullUrl.origin}/og-default.png`,
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
    return {
      title: `${address} – Token on Superhero`,
      canonical: `${fullUrl.origin}/trends/tokens/${tokenName}`,
      ogImage: `${fullUrl.origin}/og-default.png`,
    };
  }

  // Default: pass-through title with canonical
  return {
    title: 'Superhero',
    canonical: `${fullUrl.origin}${pathname}`,
  };
}

function injectHead(html: string, meta: Meta): string {
  const parts: string[] = [];
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (meta.description) parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  if (meta.canonical) parts.push(`<link rel="canonical" href="${escapeAttr(meta.canonical)}">`);
  parts.push(`<meta property="og:site_name" content="Superhero">`);
  parts.push(`<meta property="og:type" content="${escapeAttr(meta.ogType || 'website')}">`);
  parts.push(`<meta property="og:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta property="og:description" content="${escapeAttr(meta.description)}">`);
  if (meta.canonical) parts.push(`<meta property="og:url" content="${escapeAttr(meta.canonical)}">`);
  parts.push(`<meta property=\"og:image\" content=\"${escapeAttr(meta.ogImage || '')}\">`);
  parts.push(`<meta property=\"og:image:width\" content=\"1200\">`);
  parts.push(`<meta property=\"og:image:height\" content=\"630\">`);
  parts.push(`<meta name="twitter:card" content="${meta.ogImage ? 'summary_large_image' : 'summary'}">`);
  parts.push(`<meta name="twitter:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta name="twitter:description" content="${escapeAttr(meta.description)}">`);
  parts.push(`<meta name=\"twitter:image\" content=\"${escapeAttr(meta.ogImage || '')}\">`);
  const jsonLdArray = Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : [];
  for (const schema of jsonLdArray) {
    parts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  }

  const injection = parts.join('\n');
  const idx = html.indexOf('</head>');
  if (idx === -1) return html;
  return html.slice(0, idx) + '\n' + injection + '\n' + html.slice(idx);
}

function truncate(s: string, n: number): string {
  const str = (s || '').trim();
  if (str.length <= n) return str;
  return str.slice(0, Math.max(0, n - 1)) + '…';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]+/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function absolutize(url?: string, origin?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${origin || ''}${url}`;
  return `${origin || ''}/${url}`;
}


