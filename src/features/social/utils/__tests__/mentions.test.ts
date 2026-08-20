import { describe, it, expect } from 'vitest';
import {
  detectActiveMention,
  buildAccountMentionToken,
  buildTokenMentionToken,
  applyMention,
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
  it('stores the raw account address', () => {
    expect(buildAccountMentionToken({ address: 'ak_123' })).toBe('@ak_123');
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

describe('applyMention', () => {
  it('replaces the in-progress token and appends a trailing space', () => {
    const text = 'hey @mar';
    const active = detectActiveMention(text, text.length)!;
    expect(applyMention(text, active, '@ak_123')).toEqual({
      text: 'hey @ak_123 ',
      caret: 'hey @ak_123 '.length,
    });
  });

  it('does not add a second space when one already follows', () => {
    const text = 'hey @mar there';
    const active = detectActiveMention(text, 8)!; // caret after "@mar"
    expect(applyMention(text, active, '@ak_123')).toEqual({
      text: 'hey @ak_123 there',
      caret: 'hey @ak_123'.length,
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
