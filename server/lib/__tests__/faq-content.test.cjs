/* Tests for the /faq FAQPage JSON-LD source (server/lib/faq-content.cjs) and its round-trip
 * through the production head injector. The Express production path emits schema.org/FAQPage
 * structured data on /faq (server/index.cjs); these assert the payload is well-formed, mirrors
 * the visible FAQ page, and survives jsonLdSafe serialization as a single parseable script. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
const fs = require('fs');
const path = require('path');
const { FAQ_ENTRIES, buildFaqPageJsonLd } = require('../faq-content.cjs');
const { injectHead } = require('../head.cjs');

// src/ exists in the test tree (unlike the production image), so the snapshot can be checked
// against its source of truth here. faq = the `faq` namespace the visible /faq page renders from.
const { faq } = require('../../../src/locales/en.json');
const FAQ_TSX = fs.readFileSync(path.join(__dirname, '../../../src/views/FAQ.tsx'), 'utf8');

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

// Drift guard: the snapshot duplicates en.json's `faq` copy because src/ is absent from the
// production image (see faq-content.cjs header). These two assertions fail the moment the copy
// or the page's question list moves out from under the snapshot, so stale JSON-LD cannot ship.
describe('faq-content.cjs — drift guard against src/ (en.json + FAQ.tsx)', () => {
  it('each entry matches its en.json.faq keys exactly (title + joined answer)', () => {
    FAQ_ENTRIES.forEach((entry) => {
      expect(faq[entry.titleKey]).toBe(entry.question);
      const answer = entry.answerKeys.map((k) => faq[k]).join(' ');
      expect(answer).toBe(entry.answer);
    });
  });

  it('covers every QUESTION_DEFS entry on the visible /faq page (no question left un-snapshotted)', () => {
    // One `titleKey: '...'` per QUESTION_DEFS entry in src/views/FAQ.tsx; the interface field
    // `titleKey: string;` and the `q.titleKey` read carry no quote and are not matched.
    const pageQuestions = (FAQ_TSX.match(/titleKey:\s*'/g) || []).length;
    expect(pageQuestions).toBeGreaterThan(0);
    expect(FAQ_ENTRIES.length).toBe(pageQuestions);
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
