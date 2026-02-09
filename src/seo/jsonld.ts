export function websiteSchema(opts: { origin?: string }) {
  const origin = opts.origin || 'https://superhero.com';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Superhero',
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Superhero',
    url: 'https://superhero.com',
    sameAs: [
      'https://x.com/aeternity',
      'https://github.com/aeternity',
      'https://discord.gg/aeternity',
    ],
  };
}

export function listItemSchema(urls: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: urls.map((u, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: u,
    })),
  };
}

export function socialMediaPostingSchema(post: {
  content?: string;
  created_at?: string;
  updated_at?: string;
  sender_address?: string;
  media?: string[];
  total_comments?: number;
}) {
  const content = (post?.content || '').toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: truncate(content, 120) || 'Post',
    datePublished: post?.created_at,
    dateModified: post?.updated_at || post?.created_at,
    author: {
      '@type': 'Person',
      name: post?.sender_address,
      identifier: post?.sender_address,
    },
    image: Array.isArray(post?.media) ? post?.media : undefined,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'CommentAction',
        userInteractionCount: post?.total_comments || 0,
      },
    ],
  } as const;
}

export function personSchema(person: {
  name: string;
  identifier: string;
  description?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    identifier: person.identifier,
    description: person.description || undefined,
  } as const;
}

export function cryptoCurrencySchema(token: {
  name?: string;
  symbol?: string;
  identifier?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CryptoCurrency',
    name: token.name || token.symbol,
    symbol: token.symbol,
    identifier: token.identifier,
  } as const;
}

function truncate(s: string, n: number): string {
  const str = (s || '').trim();
  if (str.length <= n) return str;
  return `${str.slice(0, Math.max(0, n - 1))}…`;
}
