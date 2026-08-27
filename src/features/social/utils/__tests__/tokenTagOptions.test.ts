import { describe, it, expect } from 'vitest';
import {
  MODE_PRESETS,
  type TokenTagDisplayOptions,
} from '@/utils/tokenTagEnvelope';
import {
  scanTokenTags,
  applyTokenTagOptions,
} from '../tokenTagOptions';

const opts = (chart: boolean, price: boolean, change: boolean): TokenTagDisplayOptions => ({
  chart,
  price,
  change,
});

describe('scanTokenTags', () => {
  it('finds bare tags and envelope tags in order with resolved options', () => {
    const tags = scanTokenTags('gm #SUPERHERO and #EMOTER-AI{mode=advanced} today');
    expect(tags).toHaveLength(2);
    expect(tags[0]).toMatchObject({ symbol: 'SUPERHERO', hasEnvelope: false });
    expect(tags[0].options).toEqual(MODE_PRESETS.tag);
    expect(tags[1]).toMatchObject({ symbol: 'EMOTER-AI', hasEnvelope: true, payload: 'mode=advanced' });
    expect(tags[1].options).toEqual(MODE_PRESETS.advanced);
  });

  it('returns nothing for text with no tags', () => {
    expect(scanTokenTags('just some words')).toHaveLength(0);
  });

  // The composer now walks the run the way the reader does, so an unseparated pair links both
  // tags. Before this row the composer's single global regex consumed the lead char and could
  // not re-enter at the second '#', surfacing a chip for '#one' only — the one measured
  // divergence from the reader. See src/utils/linkify.tsx's run-walk.
  it('links both tags of an unseparated pair ("#one#two"), matching the reader', () => {
    const tags = scanTokenTags('#one#two');
    expect(tags.map((t) => t.symbol)).toEqual(['one', 'two']);
    expect(tags[0]).toMatchObject({ start: 0, end: 4 });
    expect(tags[1]).toMatchObject({ start: 4, end: 8 });
  });

  it('resumes scanning after an inert dotted remainder ("#emoter.ai/#foo")', () => {
    expect(scanTokenTags('#emoter.ai/#foo').map((t) => t.symbol)).toEqual(['emoter', 'foo']);
  });

  // Regression: the composer must not offer a chip on a URL fragment. A '#' preceded by a word
  // char, '.' or '/' is not a token tag — the reader's grammar refuses it, so a chip here
  // rewrites the user's link into an envelope the reader will never consume, permanently.
  it('does not scan a URL fragment as a token tag', () => {
    expect(scanTokenTags('see https://example.com/page#section for more')).toHaveLength(0);
    expect(scanTokenTags('foo.com/x#bar')).toHaveLength(0);
    expect(scanTokenTags('a#b')).toHaveLength(0);
  });

  it('applying options never rewrites a URL fragment', () => {
    const text = 'see https://example.com/page#section for more';
    expect(applyTokenTagOptions(text, 0, MODE_PRESETS.advanced)).toBe(text);
  });

  it('still scans a real tag that follows whitespace or the start of text', () => {
    expect(scanTokenTags('#SUPERHERO')).toMatchObject([{ symbol: 'SUPERHERO', start: 0 }]);
    expect(scanTokenTags('gm #SUPERHERO')).toMatchObject([{ symbol: 'SUPERHERO', start: 3 }]);
  });

  // The symbol class mirrors the reader: A-Za-z0-9- plus the live collection alphabet, not a
  // blanket \p{L}\p{N}. Without a collection pattern, non-Latin characters are not token names.
  it('honours the reader symbol class — non-Latin only when the collection allows it', () => {
    expect(scanTokenTags('gm #你好')).toHaveLength(0);
    expect(scanTokenTags('gm #你好', '\\u4e00-\\u9fff')).toMatchObject([{ symbol: '你好' }]);
  });
});

describe('applyTokenTagOptions', () => {
  it('rewrites the envelope on the addressed tag in place, leaving others alone', () => {
    const text = 'gm #SUPERHERO and #EMOTER-AI here';
    expect(applyTokenTagOptions(text, 0, MODE_PRESETS.advanced)).toBe(
      'gm #SUPERHERO{mode=advanced} and #EMOTER-AI here',
    );
    expect(applyTokenTagOptions(text, 1, opts(false, false, false))).toBe(
      'gm #SUPERHERO and #EMOTER-AI{change=0} here',
    );
  });

  it('strips the envelope back to a bare tag when options return to the default', () => {
    expect(applyTokenTagOptions('hi #SUPERHERO{mode=advanced}!', 0, MODE_PRESETS.tag)).toBe(
      'hi #SUPERHERO!',
    );
  });

  it('addresses the right tag of an unseparated pair by ordinal', () => {
    expect(applyTokenTagOptions('#one#two', 1, MODE_PRESETS.advanced)).toBe('#one#two{mode=advanced}');
  });

  it('is a no-op when no tag sits at the given ordinal', () => {
    expect(applyTokenTagOptions('hi #SUPERHERO', 5, MODE_PRESETS.advanced)).toBe('hi #SUPERHERO');
  });
});
