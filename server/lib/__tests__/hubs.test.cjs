/* Tests for the crawlable internal-link hubs (server/lib/hubs.cjs). Assert the
 * surfacing gate matches the ruling, links point at the canonical entity routes, and the
 * rendered directory pages carry real anchors, one <title>, a canonical, and rel next/prev
 * pagination — the properties a crawler needs and the thing user/post pages previously lacked. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
const {
  filterHubAccounts,
  accountHubLink,
  postHubLink,
  renderHubIndex,
  hubListPage,
  hubStatusCode,
} = require('../hubs.cjs');

const ORIGIN = 'https://superhero.com';

function parseHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('filterHubAccounts — surfacing gate', () => {
  const rows = [
    { address: 'ak_active', total_tx_count: 5, banned: false },
    { address: 'ak_zero', total_tx_count: 0, banned: false },
    { address: 'ak_banned', total_tx_count: 99, banned: true },
    { address: 'ak_one', total_tx_count: 1, banned: false },
  ];

  it('keeps accounts with at least one tx that are not banned', () => {
    const kept = filterHubAccounts(rows).map((a) => a.address);
    expect(kept).toEqual(['ak_active', 'ak_one']);
  });

  it('drops zero-tx and banned accounts', () => {
    const kept = filterHubAccounts(rows).map((a) => a.address);
    expect(kept).not.toContain('ak_zero');
    expect(kept).not.toContain('ak_banned');
  });

  it('returns [] for non-array input', () => {
    expect(filterHubAccounts(null)).toEqual([]);
    expect(filterHubAccounts(undefined)).toEqual([]);
  });
});

describe('accountHubLink', () => {
  it('links to the /users canonical route', () => {
    const { href } = accountHubLink({ address: 'ak_abc' }, ORIGIN);
    expect(href).toBe(`${ORIGIN}/users/ak_abc`);
  });

  it('labels with chain_name when present, else the address', () => {
    expect(accountHubLink({ address: 'ak_abc', chain_name: 'alice.chain' }, ORIGIN).label).toBe('alice.chain');
    expect(accountHubLink({ address: 'ak_abc', chain_name: null }, ORIGIN).label).toBe('ak_abc');
  });
});

describe('postHubLink', () => {
  it('prefers the slug the /post canonical uses, falling back to id', () => {
    expect(postHubLink({ slug: 'my-slug-12', id: '12_v3', content: 'hi' }, ORIGIN).href).toBe(`${ORIGIN}/post/my-slug-12`);
    expect(postHubLink({ id: '12_v3', content: 'hi' }, ORIGIN).href).toBe(`${ORIGIN}/post/12_v3`);
  });

  it('labels with truncated content, falling back to the key', () => {
    expect(postHubLink({ id: '12_v3', content: '  hello   world ' }, ORIGIN).label).toBe('hello world');
    expect(postHubLink({ id: '12_v3', content: '' }, ORIGIN).label).toBe('12_v3');
    expect(postHubLink({ id: '12_v3', content: 'x'.repeat(200) }, ORIGIN).label.length).toBeLessThanOrEqual(80);
  });
});

describe('hubListPage — rendered directory page', () => {
  const links = [
    { href: `${ORIGIN}/users/ak_1`, label: 'one.chain' },
    { href: `${ORIGIN}/users/ak_2`, label: 'ak_2' },
  ];

  it('renders one <title> and a matching canonical', () => {
    const doc = parseHtml(hubListPage({ section: 'users', origin: ORIGIN, page: 1, links, totalPages: 3 }));
    expect(doc.querySelectorAll('title').length).toBe(1);
    expect(doc.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${ORIGIN}/hubs/users`);
  });

  it('emits a real anchor per link, pointing at the entity routes', () => {
    const doc = parseHtml(hubListPage({ section: 'users', origin: ORIGIN, page: 1, links, totalPages: 3 }));
    const hrefs = [...doc.querySelectorAll('ul.hub-list a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`${ORIGIN}/users/ak_1`);
    expect(hrefs).toContain(`${ORIGIN}/users/ak_2`);
  });

  it('paginates with rel next/prev in head and nav', () => {
    const p2 = parseHtml(hubListPage({ section: 'users', origin: ORIGIN, page: 2, links, totalPages: 3 }));
    expect(p2.querySelector('link[rel="next"]').getAttribute('href')).toBe(`${ORIGIN}/hubs/users?page=3`);
    expect(p2.querySelector('link[rel="prev"]').getAttribute('href')).toBe(`${ORIGIN}/hubs/users`);
    // Page 1's prev collapses to the unqueried canonical.
    const p1 = parseHtml(hubListPage({ section: 'users', origin: ORIGIN, page: 1, links, totalPages: 3 }));
    expect(p1.querySelector('link[rel="prev"]')).toBeNull();
    expect(p1.querySelector('link[rel="next"]').getAttribute('href')).toBe(`${ORIGIN}/hubs/users?page=2`);
    // Last page has no next.
    const last = parseHtml(hubListPage({ section: 'users', origin: ORIGIN, page: 3, links, totalPages: 3 }));
    expect(last.querySelector('link[rel="next"]')).toBeNull();
  });

  it('escapes a hostile label so it cannot break out of the anchor', () => {
    const evil = [{ href: `${ORIGIN}/users/ak_x`, label: '<img src=x onerror=alert(1)>' }];
    const html = hubListPage({ section: 'posts', origin: ORIGIN, page: 1, links: evil, totalPages: 1 });
    expect(html).not.toContain('<img src=x');
    const doc = parseHtml(html);
    expect(doc.querySelector('ul.hub-list a').textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('renders a graceful empty state with no links', () => {
    const doc = parseHtml(hubListPage({ section: 'posts', origin: ORIGIN, page: 9, links: [], totalPages: 3 }));
    expect(doc.querySelectorAll('ul.hub-list a').length).toBe(0);
    expect(doc.querySelector('title').textContent).toContain('Posts');
  });

  it('throws on an unknown section', () => {
    expect(() => hubListPage({ section: 'nope', origin: ORIGIN, page: 1, links: [], totalPages: 1 })).toThrow();
  });
});

describe('hubStatusCode — zero-link tail / out-of-range pages 404', () => {
  it('404s a page > 1 that rendered no links (gate-emptied tail or past the end)', () => {
    expect(hubStatusCode(34, 0)).toBe(404);
    expect(hubStatusCode(40, 0)).toBe(404);
  });

  it('keeps page 1 at 200 even with no links, so an API outage degrades rather than 404s', () => {
    expect(hubStatusCode(1, 0)).toBe(200);
  });

  it('serves any page that has links at 200', () => {
    expect(hubStatusCode(33, 70)).toBe(200);
    expect(hubStatusCode(2, 100)).toBe(200);
  });
});

describe('renderHubIndex', () => {
  it('links to both sub-hubs and the token list, with one title and a canonical', () => {
    const doc = parseHtml(renderHubIndex(ORIGIN));
    expect(doc.querySelectorAll('title').length).toBe(1);
    expect(doc.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${ORIGIN}/hubs`);
    const hrefs = [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`${ORIGIN}/hubs/users`);
    expect(hrefs).toContain(`${ORIGIN}/hubs/posts`);
    expect(hrefs).toContain(`${ORIGIN}/trends/tokens`);
  });
});
