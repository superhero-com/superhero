/* Regression test for head hardening: server/index.cjs `injectHead` used to interpolate
 * `ogImage`/`canonical` into the document `<head>` unescaped. Since `ogImage` flows from
 * user-controlled post `media[0]` / token images, an attribute-breakout payload there was a
 * live stored-XSS vector on the production Express path (ahead of all app code).
 *
 * These tests assert the fix: every value interpolated into an HTML attribute in `injectHead`
 * is escaped with the attribute-safe `escapeAttr` (mirroring netlify/edge-functions/seo.ts),
 * so a crafted payload renders as inert text and never breaks out of its attribute. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
// Vitest's own module cannot be `require()`-d from a CommonJS test file, so we rely on globals
// here rather than `require('vitest')`.
const { escapeHtml, escapeAttr, jsonLdSafe, injectHead } = require('../head.cjs');

const BASE_HTML = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
// A document that already carries a static <title> — the shape dist/index.html actually ships.
const HTML_WITH_TITLE = '<!doctype html><html><head><title>Static Placeholder</title><meta charset="utf-8"></head><body></body></html>';
const BREAKOUT_PAYLOAD = '</script><script>alert(1)</script>';
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

function inject(meta) {
  return injectHead(BASE_HTML, meta);
}

function parseHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('server/lib/head.cjs — escapeHtml / escapeAttr', () => {
  it('escapeHtml encodes &, <, >, and "', () => {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;');
  });

  it('escapeAttr additionally encodes single quotes (attribute-safe superset of escapeHtml)', () => {
    expect(escapeAttr('it\'s <b>"quoted"</b>')).toBe('it&#39;s &lt;b&gt;&quot;quoted&quot;&lt;/b&gt;');
  });
});

describe('injectHead — attribute-breakout XSS regression (head hardening)', () => {
  // Closes the `content="..."` / `href="..."` attribute, opens a new <script> element, then
  // reopens a dummy attribute so the rest of the original template string stays well-formed.
  const SCRIPT_BREAKOUT = '"><script>alert(document.cookie)</script><meta x="';
  // Closes the attribute and injects a bogus event-handler attribute on the same tag.
  const EVENT_HANDLER_BREAKOUT = '" onerror="alert(document.cookie)';

  it('renders a malicious ogImage (post media[0] / token image) as inert escaped text, not markup', () => {
    const payload = `https://evil.example/x.png${SCRIPT_BREAKOUT}`;
    const html = inject({
      title: 'Post',
      canonical: 'https://superhero.com/post/1',
      ogImage: payload,
    });

    // The raw payload must never appear unescaped in the served <head>.
    expect(html).not.toContain('<script>alert(document.cookie)</script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');

    const doc = parseHtml(html);
    // Parsing the served HTML must not materialize an injected <script> element.
    expect(doc.querySelectorAll('script').length).toBe(0);
    // og:image / twitter:image content round-trips to the literal payload string — proof the
    // browser treats it as inert attribute text, never as an attribute/tag boundary.
    expect(doc.querySelector('meta[property="og:image"]').getAttribute('content')).toBe(payload);
    expect(doc.querySelector('meta[name="twitter:image"]').getAttribute('content')).toBe(payload);
  });

  it('renders a malicious canonical (link[rel=canonical] href / og:url) as inert escaped text', () => {
    const payload = `https://superhero.com/post/1${SCRIPT_BREAKOUT}`;
    const html = inject({
      title: 'Post',
      canonical: payload,
      ogImage: 'https://superhero.com/og-default.png',
    });

    expect(html).not.toContain('<script>alert(document.cookie)</script>');

    const doc = parseHtml(html);
    expect(doc.querySelectorAll('script').length).toBe(0);
    expect(doc.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(payload);
    expect(doc.querySelector('meta[property="og:url"]').getAttribute('content')).toBe(payload);
  });

  it('neutralizes an onerror= event-handler breakout payload in ogImage', () => {
    const payload = `https://evil.example/x.png${EVENT_HANDLER_BREAKOUT}`;
    const html = inject({
      title: 'Post',
      canonical: 'https://superhero.com/post/1',
      ogImage: payload,
    });

    const doc = parseHtml(html);
    const ogImageEl = doc.querySelector('meta[property="og:image"]');
    // The closing quote is entity-encoded, so `onerror=` never becomes a real attribute.
    expect(ogImageEl.getAttribute('onerror')).toBeNull();
    expect(ogImageEl.getAttribute('content')).toBe(payload);
  });

  it('still escapes title/description as before (no regression)', () => {
    const html = inject({
      title: '<script>alert(1)</script>',
      description: `${SCRIPT_BREAKOUT}desc`,
      canonical: 'https://superhero.com/post/1',
      ogImage: 'https://superhero.com/og-default.png',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    const doc = parseHtml(html);
    expect(doc.querySelectorAll('script').length).toBe(0);
    expect(doc.querySelector('title').textContent).toBe('<script>alert(1)</script>');
  });
});

describe('injectHead — replace, not append, the document <title>', () => {
  it('removes the static <title> so exactly one survives, carrying the injected value', () => {
    const html = injectHead(HTML_WITH_TITLE, {
      title: 'Buy #COMM on Superhero.com',
      canonical: 'https://superhero.com/trends/tokens/comm',
      ogImage: 'https://superhero.com/og-default.png',
    });

    const doc = parseHtml(html);
    const titles = doc.querySelectorAll('title');
    expect(titles.length).toBe(1);
    expect(titles[0].textContent).toBe('Buy #COMM on Superhero.com');
    // The old placeholder text is gone from the served document.
    expect(html).not.toContain('Static Placeholder');
  });

  it('still injects a single <title> when the template has none', () => {
    const html = injectHead(BASE_HTML, {
      title: 'Superhero',
      canonical: 'https://superhero.com/',
      ogImage: 'https://superhero.com/og-default.png',
    });
    expect(parseHtml(html).querySelectorAll('title').length).toBe(1);
  });
});

describe('jsonLdSafe — script-breakout-safe serializer (parity with seo.ts)', () => {
  it('escapes <, >, and / so `</script>` never appears literally', () => {
    const safe = jsonLdSafe({ headline: BREAKOUT_PAYLOAD });
    expect(safe).not.toContain('</script>');
    expect(safe).not.toContain('<script>');
    expect(safe).not.toMatch(/[<>/]/);
  });

  it('round-trips back to the original value via JSON.parse', () => {
    const schema = { '@type': 'SocialMediaPosting', headline: BREAKOUT_PAYLOAD, description: 'plain text' };
    expect(JSON.parse(jsonLdSafe(schema))).toEqual(schema);
  });

  it('escapes U+2028/U+2029 line/paragraph separators', () => {
    const safe = jsonLdSafe({ x: `a${LINE_SEP}b${PARA_SEP}c` });
    expect(safe).not.toContain(LINE_SEP);
    expect(safe).not.toContain(PARA_SEP);
    expect(safe).toContain('\\u2028');
    expect(safe).toContain('\\u2029');
    expect(JSON.parse(safe).x).toBe(`a${LINE_SEP}b${PARA_SEP}c`);
  });
});

describe('injectHead — JSON-LD parity with the Netlify edge function', () => {
  it('emits a single ld+json <script> from meta.jsonLd, valid and round-tripping', () => {
    const html = injectHead(BASE_HTML, {
      title: 'Home',
      canonical: 'https://superhero.com/',
      ogImage: 'https://superhero.com/og-default.png',
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Superhero', url: 'https://superhero.com' },
    });

    const doc = parseHtml(html);
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent).name).toBe('Superhero');
  });

  it('emits no ld+json <script> when meta.jsonLd is absent', () => {
    const html = injectHead(BASE_HTML, {
      title: 'Home',
      canonical: 'https://superhero.com/',
      ogImage: 'https://superhero.com/og-default.png',
    });
    expect(parseHtml(html).querySelectorAll('script[type="application/ld+json"]').length).toBe(0);
  });

  it('supports an array of schemas, each escaped independently', () => {
    const html = injectHead(BASE_HTML, {
      title: 'Post',
      canonical: 'https://superhero.com/post/1',
      ogImage: 'https://superhero.com/og-default.png',
      jsonLd: [
        { '@type': 'A', v: BREAKOUT_PAYLOAD },
        { '@type': 'B', v: 'safe' },
      ],
    });
    const scripts = parseHtml(html).querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(2);
    expect(JSON.parse(scripts[0].textContent).v).toBe(BREAKOUT_PAYLOAD);
    expect(JSON.parse(scripts[1].textContent).v).toBe('safe');
  });

  it('renders a malicious post field as inert JSON text, not a second <script>', () => {
    const html = injectHead(BASE_HTML, {
      title: 'Post',
      canonical: 'https://superhero.com/post/1',
      ogImage: 'https://superhero.com/og-default.png',
      jsonLd: { '@context': 'https://schema.org', '@type': 'SocialMediaPosting', headline: BREAKOUT_PAYLOAD },
    });

    expect(html).not.toContain('</script><script>alert(1)</script>');
    const doc = parseHtml(html);
    expect(doc.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
    expect(doc.querySelectorAll('script:not([type="application/ld+json"])').length).toBe(0);
    expect(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent).headline).toBe(BREAKOUT_PAYLOAD);
  });
});
