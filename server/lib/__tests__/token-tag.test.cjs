/* The SSR head injector strips token-tag display envelopes so a `#SYMBOL{...}` never reaches a
 * meta description, snippet, or link preview. This asserts the standalone server copy stays in
 * step with the client reader: the payload class admits internal whitespace, so a spaced
 * `{change = 0}` must be stripped too — otherwise the reader would consume it while the crawler
 * head leaked the raw braces. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
const { stripTokenTagEnvelopes } = require('../token-tag.cjs');

describe('stripTokenTagEnvelopes (server SSR copy)', () => {
  it('drops the envelope and keeps the symbol', () => {
    expect(stripTokenTagEnvelopes('gm #SUPERHERO{mode=advanced} fam')).toBe('gm #SUPERHERO fam');
  });

  it('strips a spaced envelope — the payload class admits internal whitespace', () => {
    expect(stripTokenTagEnvelopes('gm #SUPERHERO{change = 0} fam')).toBe('gm #SUPERHERO fam');
    expect(stripTokenTagEnvelopes('#SUPERHERO{ mode = advanced }')).toBe('#SUPERHERO');
    expect(stripTokenTagEnvelopes('#你好{change =0}')).toBe('#你好');
  });

  it('leaves a bare symbol and a plain object literal untouched', () => {
    expect(stripTokenTagEnvelopes('#SUPERHERO')).toBe('#SUPERHERO');
    expect(stripTokenTagEnvelopes('an object literal { a: 1 } stays')).toBe('an object literal { a: 1 } stays');
  });
});
