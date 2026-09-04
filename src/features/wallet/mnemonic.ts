/**
 * BIP39 mnemonic helpers (generate / validate / normalize).
 *
 * Validation is funds-critical: importing a typo'd or checksum-invalid phrase
 * must be rejected BEFORE a vault is created, or the user would seal a wrong seed
 * and see wrong (empty) addresses. Normalization (trim + collapse whitespace +
 * lowercase) is applied consistently before validation AND before the phrase is
 * handed to the vault/derivation, so what we validate is exactly what we store.
 */
import { generateMnemonic as scureGenerate, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

/** Trim, collapse internal whitespace, lowercase. BIP39 words are lowercase english. */
export function normalizeMnemonic(phrase: string): string {
  return phrase.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Generate a fresh BIP39 mnemonic (12 words / 128-bit by default; 24 / 256-bit). */
export function generateMnemonic(words: 12 | 24 = 12): string {
  return scureGenerate(wordlist, words === 24 ? 256 : 128);
}

/** True iff the normalized phrase is a valid BIP39 mnemonic (word list + checksum). */
export function isValidMnemonic(phrase: string): boolean {
  return validateMnemonic(normalizeMnemonic(phrase), wordlist);
}
