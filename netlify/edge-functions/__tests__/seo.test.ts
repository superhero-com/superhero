/* Regression test for XSS hardening: `injectHead` in `netlify/edge-functions/seo.ts`
 * used to emit JSON-LD via raw `JSON.stringify(schema)` inside a
 * `<script type="application/ld+json">…</script>` tag. `schema` embeds user-generated content
 * (post text, bio, token metadata) and `JSON.stringify` does not escape `<`, `>`, or `/`, so a
 * value containing the literal string `</script><script>alert(1)</script>` closed the JSON-LD
 * script element early and let the attacker-controlled remainder execute as a brand-new,
 * unrestricted <script> element — a stored XSS.
 *
 * These tests assert the fix: `jsonLdSafe` neutralizes `<`, `>`, `/`, and U+2028/U+2029 with
 * JSON-safe `\uXXXX` escapes (which `JSON.parse` decodes back to the original character but
 * which the HTML tokenizer never recognizes as tag syntax), so the payload renders as inert
 * text and the JSON-LD block remains valid, parseable JSON. */

import { injectHead, jsonLdSafe, stripTokenTagEnvelopes } from '../seo';

const BASE_HTML = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
const BREAKOUT_PAYLOAD = '</script><script>alert(1)</script>';
// Real U+2028 (LINE SEPARATOR) / U+2029 (PARAGRAPH SEPARATOR) chars, built via escape sequences
// rather than pasted literally: those code points are themselves valid JS line terminators, so
// embedding them raw in source would silently turn this file into a "multi-line string" (the
// very hazard the fix guards against) instead of a plain two/three-word test fixture.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('jsonLdSafe', () => {
  it('escapes <, >, and / so `</script>` never appears literally in the output', () => {
    const safe = jsonLdSafe({ headline: BREAKOUT_PAYLOAD });
    expect(safe).not.toContain('</script>');
    expect(safe).not.toContain('<script>');
    expect(safe).not.toMatch(/[<>/]/);
  });

  it('round-trips back to the original value via JSON.parse (still valid JSON)', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SocialMediaPosting',
      headline: BREAKOUT_PAYLOAD,
      description: 'plain text, no special chars',
    };
    const safe = jsonLdSafe(schema);
    expect(JSON.parse(safe)).toEqual(schema);
  });

  it('escapes U+2028/U+2029 line/paragraph separators', () => {
    const safe = jsonLdSafe({ x: `a${LINE_SEP}b${PARA_SEP}c` });
    expect(safe).not.toContain(LINE_SEP);
    expect(safe).not.toContain(PARA_SEP);
    expect(safe).toContain('\\u2028');
    expect(safe).toContain('\\u2029');
    // Still valid, round-tripping JSON.
    expect(JSON.parse(safe).x).toBe(`a${LINE_SEP}b${PARA_SEP}c`);
  });
});

describe('injectHead — JSON-LD script-breakout XSS regression', () => {
  it('renders a malicious post headline as inert JSON text, not a second <script> element', () => {
    const html = injectHead(
      BASE_HTML,
      {
        title: 'Post',
        canonical: 'https://superhero.com/post/1',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'SocialMediaPosting',
          headline: BREAKOUT_PAYLOAD,
        },
      },
      'https://superhero.com',
    );

    // The raw payload must never appear unescaped in the served <head>.
    expect(html).not.toContain('</script><script>alert(1)</script>');

    const doc = parseHtml(html);
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    // Exactly one JSON-LD script element survives — the payload did not spawn a sibling <script>.
    expect(scripts.length).toBe(1);
    expect(doc.querySelectorAll('script:not([type="application/ld+json"])').length).toBe(0);

    // The single script's contents still parse as valid JSON and round-trip the original string
    // (proof the browser treats it as inert text, never as markup/tag boundary).
    const parsed = JSON.parse(scripts[0].textContent || '');
    expect(parsed.headline).toBe(BREAKOUT_PAYLOAD);
  });

  it('renders a malicious bio / token metadata field as inert JSON text (author/name fields)', () => {
    const evilDescription = `Hi${BREAKOUT_PAYLOAD}fetch('https://evil.example')`;
    const html = injectHead(
      BASE_HTML,
      {
        title: 'Profile',
        canonical: 'https://superhero.com/users/ak_123',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: 'ak_123',
          description: evilDescription,
        },
      },
      'https://superhero.com',
    );

    expect(html).not.toContain(BREAKOUT_PAYLOAD);
    const doc = parseHtml(html);
    expect(doc.querySelectorAll('script').length).toBe(1);
    expect(JSON.parse(doc.querySelector('script')?.textContent || '').description).toBe(evilDescription);
  });

  it('supports an array of jsonLd schemas, all escaped independently', () => {
    const html = injectHead(
      BASE_HTML,
      {
        title: 'Post',
        canonical: 'https://superhero.com/post/1',
        jsonLd: [
          { '@type': 'A', v: BREAKOUT_PAYLOAD },
          { '@type': 'B', v: 'safe' },
        ],
      },
      'https://superhero.com',
    );

    const doc = parseHtml(html);
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(2);
    expect(JSON.parse(scripts[0].textContent || '').v).toBe(BREAKOUT_PAYLOAD);
    expect(JSON.parse(scripts[1].textContent || '').v).toBe('safe');
  });

  it('still escapes title/description in the <head> as before (no regression)', () => {
    const html = injectHead(
      BASE_HTML,
      {
        title: '<script>alert(1)</script>',
        description: '</script><script>alert(2)</script>',
        canonical: 'https://superhero.com/post/1',
      },
      'https://superhero.com',
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(2)</script>');
    const doc = parseHtml(html);
    expect(doc.querySelectorAll('script').length).toBe(0);
    expect(doc.querySelector('title')?.textContent).toBe('<script>alert(1)</script>');
  });
});

/* The token-tag display envelope must never reach a crawler's meta description. The payload class
 * admits internal whitespace, so a spaced `{change = 0}` has to be stripped by this edge copy too
 * — otherwise the client reader consumes the envelope while the SSR head leaks the raw braces. */
describe('stripTokenTagEnvelopes (netlify SSR copy)', () => {
  it('drops the envelope and keeps the symbol', () => {
    expect(stripTokenTagEnvelopes('gm #SUPERHERO{mode=advanced} fam')).toBe('gm #SUPERHERO fam');
  });

  it('strips a spaced envelope — the payload class admits internal whitespace', () => {
    expect(stripTokenTagEnvelopes('gm #SUPERHERO{change = 0} fam')).toBe('gm #SUPERHERO fam');
    expect(stripTokenTagEnvelopes('#SUPERHERO{ mode = advanced }')).toBe('#SUPERHERO');
  });

  it('leaves a bare symbol and a plain object literal untouched', () => {
    expect(stripTokenTagEnvelopes('#SUPERHERO')).toBe('#SUPERHERO');
    expect(stripTokenTagEnvelopes('an object literal { a: 1 } stays')).toBe('an object literal { a: 1 } stays');
  });
});
