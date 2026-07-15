import type { IAllowedNameChars, ICollectionData } from './types';

// Escapes a single character for safe use inside a regex character class ([...]).
function escapeForCharClass(char: string): string {
  return char.replace(/[\\\]^-]/g, '\\$&');
}

/**
 * Converts one collection's `allowed_name_chars` rules (as returned by the BCL factory
 * contract) into a regex character-class body, e.g. "A-Z0-9\-" for the WORDS collection.
 */
export function allowedNameCharsToPattern(rules: IAllowedNameChars[] | undefined | null): string {
  if (!rules?.length) return '';
  return rules.map((rule) => {
    if (rule.SingleChar) {
      return rule.SingleChar.map((code) => escapeForCharClass(String.fromCodePoint(code))).join('');
    }
    if (rule.CharRangeFromTo) {
      const [start, end] = rule.CharRangeFromTo;
      return `${escapeForCharClass(String.fromCodePoint(start))}-${escapeForCharClass(String.fromCodePoint(end))}`;
    }
    return '';
  }).join('');
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
