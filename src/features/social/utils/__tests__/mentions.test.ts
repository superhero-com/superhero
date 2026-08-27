import { describe, it, expect } from 'vitest';
import {
  detectActiveMention,
  buildAccountMentionToken,
  buildAccountMentionDisplay,
  buildTokenMentionToken,
  applyMention,
  isRenderableTokenName,
  serializeMentions,
  segmentMentions,
  clampMentionInput,
  type AppliedMention,
} from '../mentions';

describe('detectActiveMention', () => {
  it('detects an account mention being typed at the caret', () => {
    const text = 'hey @mar';
    expect(detectActiveMention(text, text.length)).toEqual({
      trigger: 'account', query: 'mar', start: 4, end: 8,
    });
  });

  it('detects a token mention being typed at the caret', () => {
    const text = 'buying #emo';
    expect(detectActiveMention(text, text.length)).toEqual({
      trigger: 'token', query: 'emo', start: 7, end: 11,
    });
  });

  it('detects a bare trigger with an empty query', () => {
    expect(detectActiveMention('gm @', 4)).toEqual({
      trigger: 'account', query: '', start: 3, end: 4,
    });
    expect(detectActiveMention('gm #', 4)).toEqual({
      trigger: 'token', query: '', start: 3, end: 4,
    });
  });

  it('detects a trigger at the very start of the text', () => {
    expect(detectActiveMention('@bob', 4)).toEqual({
      trigger: 'account', query: 'bob', start: 0, end: 4,
    });
  });

  it('detects an in-progress ak_ address mention', () => {
    const text = 'wen @ak_123ABC';
    expect(detectActiveMention(text, text.length)).toEqual({
      trigger: 'account', query: 'ak_123ABC', start: 4, end: 14,
    });
  });

  it('does not trigger on an email-style "@" (preceded by a word char)', () => {
    const text = 'mail me at bob@gmail';
    expect(detectActiveMention(text, text.length)).toBeNull();
  });

  it('does not trigger on a URL fragment "#" (preceded by a non-space char)', () => {
    const text = 'see example.com/page#top';
    expect(detectActiveMention(text, text.length)).toBeNull();
  });

  it('is inactive once the token is closed by a space', () => {
    const text = 'hey @marek ';
    expect(detectActiveMention(text, text.length)).toBeNull();
  });

  it('only considers the token immediately before the caret, not later text', () => {
    const text = 'hey @marek gm';
    // caret at end sits inside "gm", which is not a mention
    expect(detectActiveMention(text, text.length)).toBeNull();
  });

  it('detects the token the caret sits inside, ignoring text after it', () => {
    const text = 'hey @mar and #tok';
    // caret placed right after "@mar"
    expect(detectActiveMention(text, 8)).toEqual({
      trigger: 'account', query: 'mar', start: 4, end: 8,
    });
  });

  it('accepts non-Latin token names', () => {
    const text = '支持 #你好';
    expect(detectActiveMention(text, text.length)).toEqual({
      trigger: 'token', query: '你好', start: 3, end: 6,
    });
  });
});

describe('buildAccountMentionToken', () => {
  it('stores the address as an [account:…] macro', () => {
    expect(buildAccountMentionToken({ address: 'ak_123' })).toBe('[account:ak_123]');
  });
});

describe('buildTokenMentionToken', () => {
  it('uses the token name', () => {
    expect(buildTokenMentionToken({ name: 'EMOTER', symbol: 'EMO' })).toBe('#EMOTER');
  });
  it('falls back to the symbol when there is no name', () => {
    expect(buildTokenMentionToken({ name: '', symbol: 'EMO' })).toBe('#EMO');
  });
});

describe('isRenderableTokenName', () => {
  it('accepts plain Latin names with digits and dashes', () => {
    expect(isRenderableTokenName('EMOTER')).toBe(true);
    expect(isRenderableTokenName('ROCK-N-ROLL')).toBe(true);
    expect(isRenderableTokenName('AE2')).toBe(true);
  });

  it('rejects names with a dot or underscore (they truncate on render)', () => {
    expect(isRenderableTokenName('EMOTER.AI')).toBe(false);
    expect(isRenderableTokenName('FOO_BAR')).toBe(false);
  });

  it('rejects empty, whitespace, and over-length names', () => {
    expect(isRenderableTokenName('')).toBe(false);
    expect(isRenderableTokenName('has space')).toBe(false);
    expect(isRenderableTokenName('A'.repeat(51))).toBe(false);
  });

  it('accepts non-Latin names only when the collection charset is provided', () => {
    // Chinese range as linkify would receive it from mergedCollectionNameCharsPattern.
    const chinese = '\\u4e00-\\u9fff';
    expect(isRenderableTokenName('你好')).toBe(false);
    expect(isRenderableTokenName('你好', chinese)).toBe(true);
  });
});

describe('applyMention', () => {
  it('replaces the in-progress token and appends a trailing space', () => {
    const text = 'hey @mar';
    const active = detectActiveMention(text, text.length)!;
    expect(applyMention(text, active, '[account:ak_123]')).toEqual({
      text: 'hey [account:ak_123] ',
      caret: 'hey [account:ak_123] '.length,
    });
  });

  it('does not add a second space when one already follows', () => {
    const text = 'hey @mar there';
    const active = detectActiveMention(text, 8)!; // caret after "@mar"
    expect(applyMention(text, active, '[account:ak_123]')).toEqual({
      text: 'hey [account:ak_123] there',
      caret: 'hey [account:ak_123]'.length,
    });
  });

  it('inserts a token mention with a trailing space', () => {
    const text = 'buying #emo';
    const active = detectActiveMention(text, text.length)!;
    expect(applyMention(text, active, '#EMOTER')).toEqual({
      text: 'buying #EMOTER ',
      caret: 'buying #EMOTER '.length,
    });
  });
});

describe('buildAccountMentionDisplay', () => {
  it('uses the chain name when present', () => {
    expect(buildAccountMentionDisplay({ address: 'ak_123', chainName: 'marek.chain' }))
      .toBe('@marek.chain');
  });

  it('falls back to a short address when there is no chain name', () => {
    // ak_123 is not a valid/long hash, so formatAddress returns it as-is.
    expect(buildAccountMentionDisplay({ address: 'ak_123' })).toBe('@ak_123');
  });
});

const marek: AppliedMention = {
  trigger: 'account', display: '@marek.chain', serialized: '[account:ak_marek]',
};
const emoter: AppliedMention = { trigger: 'token', display: '#EMOTER', serialized: '#EMOTER' };

describe('serializeMentions', () => {
  it('expands an intact account display run to its macro (display → wire)', () => {
    expect(serializeMentions('gm @marek.chain', [marek])).toBe('gm [account:ak_marek]');
  });

  it('leaves token mentions unchanged on the wire', () => {
    expect(serializeMentions('buying #EMOTER now', [emoter])).toBe('buying #EMOTER now');
  });

  it('expands two adjacent mentions separated by a single space', () => {
    expect(serializeMentions('@marek.chain #EMOTER', [marek, emoter]))
      .toBe('[account:ak_marek] #EMOTER');
  });

  it('drops the tag once the user edits the run (degrades to plain text)', () => {
    expect(serializeMentions('gm @marek.chainX', [marek])).toBe('gm @marek.chainX');
  });

  it('does not expand a run embedded inside a larger word', () => {
    expect(serializeMentions('x@marek.chain', [marek])).toBe('x@marek.chain');
  });

  it('round-trips a picked account from insertion to the wire', () => {
    const typed = 'gm @mar';
    const active = detectActiveMention(typed, typed.length)!;
    const display = buildAccountMentionDisplay({ address: 'ak_marek', chainName: 'marek.chain' });
    const { text: composed } = applyMention(typed, active, display);
    expect(composed).toBe('gm @marek.chain ');
    const mention: AppliedMention = {
      trigger: 'account', display, serialized: buildAccountMentionToken({ address: 'ak_marek' }),
    };
    expect(serializeMentions(composed, [mention]).trim()).toBe('gm [account:ak_marek]');
  });
});

describe('segmentMentions', () => {
  it('flags the mention run and leaves the surrounding text plain', () => {
    expect(segmentMentions('gm @marek.chain !', [marek])).toEqual([
      { text: 'gm ', mention: null },
      { text: '@marek.chain', mention: marek },
      { text: ' !', mention: null },
    ]);
  });

  it('returns one plain segment when the edited run no longer matches', () => {
    expect(segmentMentions('gm @marek.chainX', [marek])).toEqual([
      { text: 'gm @marek.chainX', mention: null },
    ]);
  });

  it('segments two mentions in one line', () => {
    expect(segmentMentions('@marek.chain and #EMOTER', [marek, emoter])).toEqual([
      { text: '@marek.chain', mention: marek },
      { text: ' and ', mention: null },
      { text: '#EMOTER', mention: emoter },
    ]);
  });
});

describe('clampMentionInput', () => {
  it('leaves an in-budget change untouched', () => {
    expect(clampMentionInput('a', 'ab', [], 280)).toBe('ab');
  });

  it('truncates an over-cap paste to the remaining room, not dropping it whole', () => {
    expect(clampMentionInput('', 'x'.repeat(300), [], 280)).toBe('x'.repeat(280));
  });

  it('inserts only what fits when pasting into a partially-full composer', () => {
    expect(clampMentionInput('ab', 'abXYZ', [], 4)).toBe('abXY');
  });

  it('rejects a mid-string keystroke when the cap is already reached', () => {
    const full = 'a'.repeat(280);
    const typed = `${'a'.repeat(5)}x${'a'.repeat(275)}`; // 281 chars, an 'x' inserted at index 5
    expect(clampMentionInput(full, typed, [], 280)).toBe(full);
  });

  it('counts the serialised macro against the cap when clamping', () => {
    // display run is 13 chars incl. trailing space; serialised is "[account:ak_marek] " (19).
    const prev = '@marek.chain ';
    // Appending "xxx" after the intact run -> serialised 22 > 20, clamp to the room left.
    const clamped = clampMentionInput(prev, '@marek.chain xxx', [marek], 20);
    expect(serializeMentions(clamped, [marek]).length).toBeLessThanOrEqual(20);
    expect(clamped).toBe('@marek.chain x');
  });

  // Regression: an arbitrary truncation could cut inside a `#SYMBOL{...}` envelope, leaving a
  // dangling `{` that the reader renders as literal text. The clamp backs the cut off to the
  // envelope's start, so the tag survives as a bare `#SYMBOL`. Uses the shared envelope grammar.
  it('backs an over-cap cut off the start of a token envelope, never leaving a dangling {', () => {
    const body = 'x'.repeat(270);
    const clamped = clampMentionInput(body, `${body} #SUPERHERO{mode=advanced}`, [], 285);
    expect(clamped).toBe(`${body} #SUPERHERO`);
    expect(clamped.endsWith('{')).toBe(false);
    expect(clamped.length).toBeLessThanOrEqual(285);
  });

  // The clamp must scan with the same widened symbol class as the composer scanner: a
  // collection symbol (e.g. Cyrillic/Latin-extended "ÜBER") is only detected as a tag when the
  // live alphabet is threaded in, otherwise its envelope is cut to a dangling `{`. Mainnet has
  // Chinese, Arabic and Cyrillic collections, so this is reachable.
  it('backs off a non-Latin collection envelope when the alphabet is threaded in', () => {
    const body = 'x'.repeat(270);
    const next = `${body} #ÜBER{mode=advanced}`;
    const latinExt = '\\u00c0-\\u024f';
    expect(clampMentionInput(body, next, [], 285, latinExt)).toBe(`${body} #ÜBER`);
    expect(clampMentionInput(body, next, [], 285, latinExt)).not.toContain('{');
    // Without the alphabet the fallback class misses "Ü", the envelope is not detected, and the
    // brace is left dangling mid-string — the residual this fix closes.
    expect(clampMentionInput(body, next, [], 285)).toContain('{');
  });

  it('leaves an envelope untouched when the cut falls entirely outside it', () => {
    // Room reaches exactly past the whole envelope; only the trailing " gm" is trimmed.
    const body = 'y'.repeat(250);
    const clamped = clampMentionInput(body, `${body} #A{mode=advanced} gm`, [], 268);
    expect(clamped).toBe(`${body} #A{mode=advanced}`);
    expect(clamped.length).toBeLessThanOrEqual(268);
  });
});
