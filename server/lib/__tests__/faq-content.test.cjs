/* Tests for the /faq FAQPage JSON-LD source (server/lib/faq-content.cjs) and its round-trip
 * through the production head injector. The Express production path emits schema.org/FAQPage
 * structured data on /faq (server/index.cjs); these assert the payload is well-formed, mirrors
 * the visible FAQ page, and survives jsonLdSafe serialization as a single parseable script. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
const { FAQ_ENTRIES, buildFaqPageJsonLd } = require('../faq-content.cjs');
const { injectHead } = require('../head.cjs');

const BASE_HTML = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

function parseHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('faq-content.cjs — FAQ_ENTRIES', () => {
  it('has entries, each a non-empty question and answer string', () => {
    expect(FAQ_ENTRIES.length).toBeGreaterThan(0);
    FAQ_ENTRIES.forEach((entry) => {
      expect(typeof entry.question).toBe('string');
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(typeof entry.answer).toBe('string');
      expect(entry.answer.trim().length).toBeGreaterThan(0);
    });
  });

  it('mirrors the visible FAQ page copy (sourced, not invented)', () => {
    const questions = FAQ_ENTRIES.map((e) => e.question);
    // Anchors present on the /faq page (src/views/FAQ.tsx / src/locales/en.json).
    expect(questions).toContain('What is Superhero?');
    expect(questions).toContain('How do I buy or sell a token?');
    const superhero = FAQ_ENTRIES.find((e) => e.question === 'What is Superhero?');
    expect(superhero.answer).toContain('aeternity blockchain');
  });
});

describe('faq-content.cjs — buildFaqPageJsonLd', () => {
  it('builds a valid schema.org FAQPage with one Question per entry', () => {
    const ld = buildFaqPageJsonLd();
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('FAQPage');
    expect(Array.isArray(ld.mainEntity)).toBe(true);
    expect(ld.mainEntity.length).toBe(FAQ_ENTRIES.length);
    ld.mainEntity.forEach((q) => {
      expect(q['@type']).toBe('Question');
      expect(q.name.length).toBeGreaterThan(0);
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(0);
    });
  });
});

describe('faq-content.cjs — round-trip through injectHead (production path)', () => {
  it('emits exactly one ld+json <script> carrying the FAQPage, parseable and round-tripping', () => {
    const html = injectHead(BASE_HTML, {
      title: 'FAQ – Superhero',
      description: 'Frequently asked questions.',
      canonical: 'https://superhero.com/faq',
      ogImage: 'https://superhero.com/og-default.png',
      jsonLd: buildFaqPageJsonLd(),
    });

    const scripts = parseHtml(html).querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    const parsed = JSON.parse(scripts[0].textContent);
    expect(parsed['@type']).toBe('FAQPage');
    expect(parsed.mainEntity.length).toBe(FAQ_ENTRIES.length);
    expect(parsed.mainEntity[0].name).toBe(FAQ_ENTRIES[0].question);
    // No stray non-JSON-LD <script> materialized from the serialized answer text.
    expect(parseHtml(html).querySelectorAll('script:not([type="application/ld+json"])').length).toBe(0);
  });
});
