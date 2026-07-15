import { describe, it, expect } from 'vitest';
import { allowedNameCharsToPattern, mergedCollectionNameCharsPattern } from '../collectionNameChars';
import type { ICollectionData } from '../types';

// Mirrors the shape returned by the BCL factory contract for NETWORK_ID_MAINNET.
const WORDS: ICollectionData = {
  id: 'WORDS-ak_2X6puZgdPKcfjSVdUGs2bvsvkbsCLN8XbKQwSVtqLUBc3518bi',
  name: 'WORDS',
  allowed_name_length: '20',
  allowed_name_chars: [
    { SingleChar: [45] },
    { CharRangeFromTo: [48, 57] },
    { CharRangeFromTo: [65, 90] },
  ],
  description: 'Allowed: A–Z, 0–9, and -',
};

const CHINESE: ICollectionData = {
  id: 'CHINESE-ak_2vmVWHYLRaqdoyLdWEUBi1NodQ3MA1bFuqqRe9A5DgNv3qoDuV',
  name: 'CHINESE',
  allowed_name_length: '20',
  allowed_name_chars: [
    { SingleChar: [45] },
    { CharRangeFromTo: [19968, 40959] },
  ],
  description: '允许：汉字和 -',
};

const ARABIC: ICollectionData = {
  id: 'ARABIC-ak_2vmVWHYLRaqdoyLdWEUBi1NodQ3MA1bFuqqRe9A5DgNv3qoDuV',
  name: 'ARABIC',
  allowed_name_length: '20',
  allowed_name_chars: [
    { SingleChar: [45] },
    { CharRangeFromTo: [1569, 1610] },
  ],
  description: 'المسموح به: الأحرف العربية و -',
};

const RUSSIAN: ICollectionData = {
  id: 'RUSSIAN-ak_2vmVWHYLRaqdoyLdWEUBi1NodQ3MA1bFuqqRe9A5DgNv3qoDuV',
  name: 'RUSSIAN',
  allowed_name_length: '20',
  allowed_name_chars: [
    { SingleChar: [45] },
    { SingleChar: [1025] },
    { CharRangeFromTo: [1040, 1071] },
  ],
  description: 'Разрешено: А–Я, Ё и -',
};

describe('allowedNameCharsToPattern', () => {
  it('converts SingleChar and CharRangeFromTo rules into a character-class body', () => {
    expect(allowedNameCharsToPattern(WORDS.allowed_name_chars)).toBe('\\-0-9A-Z');
  });

  it('returns an empty string for missing/empty rules', () => {
    expect(allowedNameCharsToPattern(undefined)).toBe('');
    expect(allowedNameCharsToPattern([])).toBe('');
  });
});

describe('mergedCollectionNameCharsPattern', () => {
  it('merges every collection into one pattern usable inside a single character class', () => {
    const pattern = mergedCollectionNameCharsPattern([WORDS, CHINESE, ARABIC, RUSSIAN]);
    const regex = new RegExp(`^[A-Za-z0-9\\-${pattern}]+$`, 'u');

    expect(regex.test('WORD-123')).toBe(true);
    expect(regex.test('你好')).toBe(true);
    expect(regex.test('مرحبا')).toBe(true);
    expect(regex.test('ПРИВЕТ')).toBe(true);
    expect(regex.test('Ё')).toBe(true);
    // A character from no collection's alphabet at all.
    expect(regex.test('こんにちは')).toBe(false);
  });

  it('accepts a Record (as returned by the factory schema) as well as an array', () => {
    const asRecord = { [WORDS.id]: WORDS, [CHINESE.id]: CHINESE };
    const pattern = mergedCollectionNameCharsPattern(asRecord);
    const regex = new RegExp(`^[${pattern}]+$`, 'u');

    expect(regex.test('你好-WORD')).toBe(true);
  });

  it('is a no-op (empty string) when there are no collections yet', () => {
    expect(mergedCollectionNameCharsPattern([])).toBe('');
    expect(mergedCollectionNameCharsPattern(undefined)).toBe('');
    expect(mergedCollectionNameCharsPattern(null)).toBe('');
  });
});
