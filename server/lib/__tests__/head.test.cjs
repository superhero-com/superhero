/* Regression test for HARDEN-01: server/index.cjs `injectHead` used to interpolate
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
const { escapeHtml, escapeAttr, injectHead } = require('../head.cjs');

const BASE_HTML = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

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

describe('injectHead — attribute-breakout XSS regression (HARDEN-01)', () => {
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
