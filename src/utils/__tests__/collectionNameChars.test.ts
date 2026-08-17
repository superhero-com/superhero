import { describe, expect, it } from 'vitest';

import {
  allowedNameCharsToPattern,
  allowedNameCharsToRegExp,
  detectMatchingCollections,
  isValidForCollection,
  mergedCollectionNameCharsPattern,
  preferredCollection,
} from '../collectionNameChars';
import type { ICollectionData } from '../types';

// Mirrors the rules the factory actually serves for each live collection.
function collection(
  name: string,
  allowedNameChars: ICollectionData['allowed_name_chars'],
): ICollectionData {
  return {
    id: `${name}-ak_2X6puZgdPKcfjSVdUGs2bvsvkbsCLN8XbKQwSVtqLUBc3518bi`,
    name,
    allowed_name_length: '20',
    allowed_name_chars: allowedNameChars,
  } as ICollectionData;
}

const WORDS = collection('WORDS', [
  { SingleChar: [45] },
  { CharRangeFromTo: [48, 57] },
  { CharRangeFromTo: [65, 90] },
]);
const CHINESE = collection('CHINESE', [
  { SingleChar: [45] },
  { CharRangeFromTo: [19968, 40959] },
]);
const ARABIC = collection('ARABIC', [
  { SingleChar: [45] },
  { CharRangeFromTo: [1569, 1610] },
]);
const RUSSIAN = collection('RUSSIAN', [
  { SingleChar: [45] },
  { SingleChar: [1025] },
  { CharRangeFromTo: [1040, 1071] },
]);

const ALL = [WORDS, CHINESE, ARABIC, RUSSIAN];

describe('allowedNameCharsToPattern', () => {
  it('renders single chars and ranges into a character class body', () => {
    expect(allowedNameCharsToPattern(WORDS.allowed_name_chars)).toBe('\\-0-9A-Z');
  });

  it('escapes characters that would otherwise be class syntax', () => {
    // "-" must not open a range, "^" must not negate, "]" must not close.
    expect(allowedNameCharsToPattern([{ SingleChar: [45, 94, 93, 92, 91] }]))
      .toBe('\\-\\^\\]\\\\\\[');
  });

  it('concatenates every rule in order', () => {
    expect(allowedNameCharsToPattern(RUSSIAN.allowed_name_chars)).toBe('\\-ЁА-Я');
  });

  it('returns an empty pattern for missing or empty rules', () => {
    expect(allowedNameCharsToPattern(undefined)).toBe('');
    expect(allowedNameCharsToPattern(null)).toBe('');
    expect(allowedNameCharsToPattern([])).toBe('');
  });

  it('drops a reversed range rather than emitting an invalid class', () => {
    expect(allowedNameCharsToPattern([{ CharRangeFromTo: [90, 65] }])).toBe('');
  });
});

describe('mergedCollectionNameCharsPattern', () => {
  it('merges every collection into one pattern usable inside a single character class', () => {
    const pattern = mergedCollectionNameCharsPattern(ALL);
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

describe('allowedNameCharsToRegExp', () => {
  it('anchors the class so a partially valid name is rejected', () => {
    const regex = allowedNameCharsToRegExp(WORDS.allowed_name_chars)!;
    expect(regex.test('BITCOIN')).toBe(true);
    expect(regex.test('BIT COIN')).toBe(false);
  });

  it('returns null instead of throwing on unusable rules', () => {
    expect(allowedNameCharsToRegExp([])).toBeNull();
    expect(allowedNameCharsToRegExp([{ CharRangeFromTo: [90, 65] }])).toBeNull();
  });

  it('reuses the compiled regex for the same rules array', () => {
    expect(allowedNameCharsToRegExp(WORDS.allowed_name_chars))
      .toBe(allowedNameCharsToRegExp(WORDS.allowed_name_chars));
  });
});

describe('isValidForCollection', () => {
  it.each([
    ['BITCOIN', WORDS, true],
    ['TREND-2024', WORDS, true],
    ['bitcoin', WORDS, false], // names are uppercased before they reach here
    ['北京', CHINESE, true],
    ['北京', WORDS, false],
    ['موسكو', ARABIC, true],
    ['МОСКВА', RUSSIAN, true],
    ['ЁЖИК', RUSSIAN, true],
    ['МОСКВА', WORDS, false],
  ])('%s against %s', (name, target, expected) => {
    expect(isValidForCollection(name, target as ICollectionData)).toBe(expected);
  });

  it('rejects emoji, which are astral pairs rather than allowed characters', () => {
    expect(isValidForCollection('🚀ROCKET', WORDS)).toBe(false);
    expect(isValidForCollection('🚀', WORDS)).toBe(false);
  });

  it('rejects an empty name and a missing collection', () => {
    expect(isValidForCollection('', WORDS)).toBe(false);
    expect(isValidForCollection('BITCOIN', undefined)).toBe(false);
  });
});

describe('detectMatchingCollections', () => {
  it.each([
    ['BITCOIN', ['WORDS']],
    ['北京', ['CHINESE']],
    ['موسكو', ['ARABIC']],
    ['МОСКВА', ['RUSSIAN']],
  ])('detects %s as %s', (name, expected) => {
    expect(detectMatchingCollections(name, ALL).map((c) => c.name)).toEqual(expected);
  });

  it('returns nothing when no collection accepts the characters', () => {
    expect(detectMatchingCollections('🚀ROCKET', ALL)).toEqual([]);
    expect(detectMatchingCollections('北京BEIJING', ALL)).toEqual([]);
  });

  it('returns every collection for a name made only of shared characters', () => {
    // "-" is allowed everywhere, so such a name is genuinely ambiguous.
    expect(detectMatchingCollections('--', ALL)).toHaveLength(4);
  });

  it('returns nothing for an empty name', () => {
    expect(detectMatchingCollections('', ALL)).toEqual([]);
  });
});

describe('preferredCollection', () => {
  it('prefers English over whatever the schema happens to list first', () => {
    expect(preferredCollection([CHINESE, RUSSIAN, WORDS])?.name).toBe('WORDS');
  });

  it('falls back to the first collection when English is absent', () => {
    expect(preferredCollection([CHINESE, RUSSIAN])?.name).toBe('CHINESE');
  });

  it('returns undefined when there are no collections', () => {
    expect(preferredCollection([])).toBeUndefined();
  });
});
