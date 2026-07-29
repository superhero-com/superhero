// Character rules for token names.
//
// Each factory collection publishes `allowed_name_chars` — a list of rules that
// is either a set of single code points or an inclusive code point range, e.g.
// the WORDS (English) collection is `[{ SingleChar: [45] }, { CharRangeFromTo: [48, 57] },
// { CharRangeFromTo: [65, 90] }]` → `-`, `0-9`, `A-Z`.
//
// These rules are what lets the create-token form tell which language a name is
// written in, so the helpers here are the single source of truth for both the
// "which collection does this name belong to" question and the character
// validation that follows from it.

import { isEnglishCollection } from './collection';
import type { IAllowedNameChars, ICollectionData } from './types';

/** Escape a character so it is literal inside a `[...]` class. */
const escapeForCharClass = (char: string): string => char.replace(/[-\\\]^[]/g, '\\$&');

/**
 * Convert a collection's rules into the body of a regex character class,
 * e.g. "\-0-9A-Z" for the WORDS collection. Returns '' when there are no
 * usable rules.
 */
export function allowedNameCharsToPattern(
  rules?: IAllowedNameChars[] | null,
): string {
  if (!rules?.length) return '';
  return rules
    .map((rule) => {
      if (rule.SingleChar?.length) {
        return rule.SingleChar
          .map((code) => escapeForCharClass(String.fromCodePoint(code)))
          .join('');
      }
      if (rule.CharRangeFromTo?.length === 2) {
        const [start, end] = rule.CharRangeFromTo;
        if (start > end) return '';
        return `${escapeForCharClass(String.fromCodePoint(start))}-${escapeForCharClass(String.fromCodePoint(end))}`;
      }
      return '';
    })
    .join('');
}

/**
 * Merges the `allowed_name_chars` of every collection the BCL factory currently reports
 * (WORDS/English, Chinese, Arabic, Russian, and any collection added later) into a single
 * regex character-class body. New collections are picked up automatically as soon as they
 * appear in the factory schema — nothing here needs to change when the backend adds one.
 */
export function mergedCollectionNameCharsPattern(
  collections: ICollectionData[] | Record<string, ICollectionData> | undefined | null,
): string {
  const list = Array.isArray(collections) ? collections : Object.values(collections || {});
  return list.map((c) => allowedNameCharsToPattern(c?.allowed_name_chars)).join('');
}

// Rule arrays come from the factory schema, which is fetched once and held in an
// atom, so their identity is stable for the lifetime of the schema. Caching on
// that identity keeps `detectMatchingCollections` from rebuilding a regex for
// every collection on every keystroke.
const regexCache = new WeakMap<IAllowedNameChars[], RegExp | null>();

/**
 * Anchored regex matching strings made up entirely of a collection's allowed
 * characters. Returns null when the rules are empty or malformed.
 */
export function allowedNameCharsToRegExp(
  rules?: IAllowedNameChars[] | null,
): RegExp | null {
  if (!rules?.length) return null;
  const cached = regexCache.get(rules);
  if (cached !== undefined) return cached;

  const pattern = allowedNameCharsToPattern(rules);
  let regex: RegExp | null = null;
  if (pattern) {
    try {
      // `u` so astral code points count as one character rather than as a
      // surrogate pair that could partially satisfy the class.
      regex = new RegExp(`^[${pattern}]+$`, 'u');
    } catch {
      regex = null;
    }
  }
  regexCache.set(rules, regex);
  return regex;
}

/** True when every character of `str` is allowed by `collection`. */
export function isValidForCollection(
  str: string,
  collection?: ICollectionData | null,
): boolean {
  if (!str || !collection) return false;
  const regex = allowedNameCharsToRegExp(collection.allowed_name_chars);
  return regex ? regex.test(str) : false;
}

/** Collections whose character rules accept `str`, in schema order. */
export function detectMatchingCollections(
  str: string,
  collections: ICollectionData[],
): ICollectionData[] {
  if (!str) return [];
  return collections.filter((collection) => isValidForCollection(str, collection));
}

/**
 * The collection to fall back on when a name is ambiguous or absent. Every
 * collection allows `-`, so a name such as "A-B" can match several; English is
 * the default the rest of the app assumes.
 */
export function preferredCollection(
  collections: ICollectionData[],
): ICollectionData | undefined {
  return collections.find((collection) => isEnglishCollection(collection.name))
    ?? collections[0];
}
