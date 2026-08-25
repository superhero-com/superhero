import { describe, it, expect } from 'vitest';
import {
  parseTokenTagEnvelope,
  isTokenTagEnhanced,
  stripTokenTagEnvelopes,
} from '../tokenTagEnvelope';

describe('parseTokenTagEnvelope — presets', () => {
  // `tag` carries change:true — it is today's rendering, badge included. See MODE_PRESETS.
  it('empty payload resolves to the tag preset (change on, no widget)', () => {
    const options = parseTokenTagEnvelope('');
    expect(options).toEqual({ chart: false, price: false, change: true });
    expect(isTokenTagEnhanced(options)).toBe(false);
  });

  it('mode=tag is the tag preset — change badge on, no widget', () => {
    const options = parseTokenTagEnvelope('mode=tag');
    expect(options).toEqual({ chart: false, price: false, change: true });
    expect(isTokenTagEnhanced(options)).toBe(false);
  });

  it('mode=compact is price + change, no chart', () => {
    expect(parseTokenTagEnvelope('mode=compact')).toEqual({ chart: false, price: true, change: true });
  });

  it('mode=advanced is chart + price + change', () => {
    const options = parseTokenTagEnvelope('mode=advanced');
    expect(options).toEqual({ chart: true, price: true, change: true });
    expect(isTokenTagEnhanced(options)).toBe(true);
  });
});

describe('parseTokenTagEnvelope — the {change=0} "only the tag" form', () => {
  // The symbol with the badge explicitly off — not mode=tag.
  it('change=0 turns the badge off and stays a plain tag (not a widget)', () => {
    const options = parseTokenTagEnvelope('change=0');
    expect(options).toEqual({ chart: false, price: false, change: false });
    expect(isTokenTagEnhanced(options)).toBe(false);
  });

  it('the fully-explicit all-off form is a plain tag with no badge', () => {
    const options = parseTokenTagEnvelope('chart=0;price=0;change=0');
    expect(options).toEqual({ chart: false, price: false, change: false });
    expect(isTokenTagEnhanced(options)).toBe(false);
  });

  it('change alone never triggers the widget; only chart/price do', () => {
    expect(isTokenTagEnhanced({ chart: false, price: false, change: true })).toBe(false);
    expect(isTokenTagEnhanced({ chart: false, price: true, change: false })).toBe(true);
    expect(isTokenTagEnhanced({ chart: true, price: false, change: false })).toBe(true);
  });

  it('compact minus the change keeps the widget (price survives)', () => {
    const options = parseTokenTagEnvelope('mode=compact;change=0');
    expect(options).toEqual({ chart: false, price: true, change: false });
    expect(isTokenTagEnhanced(options)).toBe(true);
  });
});

describe('parseTokenTagEnvelope — overrides and degradation', () => {
  it('an explicit key overrides its preset regardless of order', () => {
    expect(parseTokenTagEnvelope('mode=advanced;chart=0')).toEqual({ chart: false, price: true, change: true });
    expect(parseTokenTagEnvelope('chart=0;mode=advanced')).toEqual({ chart: false, price: true, change: true });
  });

  it('keys with no mode start from the tag preset', () => {
    expect(parseTokenTagEnvelope('price=1;change=1')).toEqual({ chart: false, price: true, change: true });
  });

  it('is case-insensitive', () => {
    expect(parseTokenTagEnvelope('MODE=Advanced')).toEqual({ chart: true, price: true, change: true });
  });

  it('an unknown mode value falls back to tag, and known keys still apply', () => {
    expect(parseTokenTagEnvelope('mode=hologram;fps=60')).toEqual({ chart: false, price: false, change: true });
    expect(parseTokenTagEnvelope('mode=hologram;chart=1')).toEqual({ chart: true, price: false, change: true });
  });

  it('a known key with an unrecognised value drops that pair only', () => {
    expect(parseTokenTagEnvelope('mode=compact;price=maybe')).toEqual({ chart: false, price: true, change: true });
    expect(parseTokenTagEnvelope('chart=yes;price=1')).toEqual({ chart: false, price: true, change: true });
  });

  it('unknown keys and bare flags are dropped, resolving to tag', () => {
    expect(parseTokenTagEnvelope('advanced')).toEqual({ chart: false, price: false, change: true });
    expect(parseTokenTagEnvelope('!!garbage!!')).toEqual({ chart: false, price: false, change: true });
    expect(parseTokenTagEnvelope('fps=60;quality=high')).toEqual({ chart: false, price: false, change: true });
  });
});

describe('stripTokenTagEnvelopes', () => {
  it('drops the envelope and keeps the symbol', () => {
    expect(stripTokenTagEnvelopes('gm #SUPERHERO{mode=advanced} to the moon'))
      .toBe('gm #SUPERHERO to the moon');
  });

  it('strips an unknown/forward-compat envelope too', () => {
    expect(stripTokenTagEnvelopes('#SUPERHERO{mode=hologram;fps=60}')).toBe('#SUPERHERO');
    expect(stripTokenTagEnvelopes('#SUPERHERO{!!garbage!!}')).toBe('#SUPERHERO');
  });

  it('handles hyphenated and non-Latin symbols', () => {
    expect(stripTokenTagEnvelopes('#EMOTER-AI{chart=1}')).toBe('#EMOTER-AI');
    expect(stripTokenTagEnvelopes('#你好{mode=compact}')).toBe('#你好');
  });

  it('leaves bare symbols and non-envelope content untouched', () => {
    expect(stripTokenTagEnvelopes('gm #SUPERHERO to the moon')).toBe('gm #SUPERHERO to the moon');
    expect(stripTokenTagEnvelopes('an object literal { a: 1 } stays')).toBe('an object literal { a: 1 } stays');
    expect(stripTokenTagEnvelopes('#SUPERHERO')).toBe('#SUPERHERO');
  });

  it('strips multiple envelopes in one string', () => {
    expect(stripTokenTagEnvelopes('#A{mode=tag} and #B{mode=advanced}')).toBe('#A and #B');
  });
});
