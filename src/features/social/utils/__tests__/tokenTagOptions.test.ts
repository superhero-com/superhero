import { describe, it, expect } from 'vitest';
import {
  MODE_PRESETS,
  parseTokenTagEnvelope,
  serializeTokenTagEnvelope,
  scanTokenTags,
  applyTokenTagOptions,
  matchPreset,
  type TokenTagDisplayOptions,
} from '../tokenTagOptions';

const opts = (chart: boolean, price: boolean, change: boolean): TokenTagDisplayOptions => ({
  chart,
  price,
  change,
});

describe('serializeTokenTagEnvelope', () => {
  it('emits no envelope for the tag default — a bare tag is byte-identical to today', () => {
    expect(serializeTokenTagEnvelope(MODE_PRESETS.tag)).toBe('');
  });

  it('emits the named mode for compact and advanced presets', () => {
    expect(serializeTokenTagEnvelope(MODE_PRESETS.compact)).toBe('{mode=compact}');
    expect(serializeTokenTagEnvelope(MODE_PRESETS.advanced)).toBe('{mode=advanced}');
  });

  it("emits {change=0} for Badi's 'only the tag' — symbol with no badge", () => {
    expect(serializeTokenTagEnvelope(opts(false, false, false))).toBe('{change=0}');
  });

  it('emits the minimal custom mix from the nearest base', () => {
    expect(serializeTokenTagEnvelope(opts(true, false, true))).toBe('{chart=1}');
    expect(serializeTokenTagEnvelope(opts(true, false, false))).toBe('{chart=1;change=0}');
    expect(serializeTokenTagEnvelope(opts(false, true, false))).toBe('{price=1;change=0}');
    expect(serializeTokenTagEnvelope(opts(true, true, false))).toBe('{mode=advanced;change=0}');
  });

  it('round-trips every possible options triple through the reader parser', () => {
    [false, true].forEach((chart) => {
      [false, true].forEach((price) => {
        [false, true].forEach((change) => {
          const triple = opts(chart, price, change);
          const payload = serializeTokenTagEnvelope(triple).replace(/^\{|\}$/g, '');
          expect(parseTokenTagEnvelope(payload)).toEqual(triple);
        });
      });
    });
  });
});

describe('parseTokenTagEnvelope', () => {
  it('resolves empty / unknown payloads to the tag preset', () => {
    expect(parseTokenTagEnvelope('')).toEqual(MODE_PRESETS.tag);
    expect(parseTokenTagEnvelope('mode=hologram;fps=60')).toEqual(MODE_PRESETS.tag);
    expect(parseTokenTagEnvelope('!!garbage!!')).toEqual(MODE_PRESETS.tag);
  });

  it('applies explicit toggles over the mode preset regardless of order', () => {
    expect(parseTokenTagEnvelope('mode=advanced;chart=0')).toEqual(opts(false, true, true));
    expect(parseTokenTagEnvelope('chart=0;mode=advanced')).toEqual(opts(false, true, true));
  });

  it('drops an unrecognised value but keeps the rest', () => {
    expect(parseTokenTagEnvelope('price=1;change=maybe')).toEqual(opts(false, true, true));
  });
});

describe('matchPreset', () => {
  it('names an exact preset and returns null for a custom mix', () => {
    expect(matchPreset(MODE_PRESETS.compact)).toBe('compact');
    expect(matchPreset(opts(true, false, false))).toBeNull();
  });
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

  it('is a no-op when no tag sits at the given ordinal', () => {
    expect(applyTokenTagOptions('hi #SUPERHERO', 5, MODE_PRESETS.advanced)).toBe('hi #SUPERHERO');
  });
});
