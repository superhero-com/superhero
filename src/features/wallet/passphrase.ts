/**
 * P4/P3 — passphrase strength gate (threat-model §4.4, weakest-factor rule).
 *
 * The passphrase factor is the only one that may take a user secret, and its
 * whole safety rests on that secret being HIGH-entropy: Argon2id is a work-factor
 * multiplier per guess, not a substitute for a large guess space. With no flag the
 * inline wallet ships live, so a merged low-entropy vault is an offline-crackable
 * target with the whole balance as the prize (ZIX-321). This gate therefore refuses
 * anything a real attack model can guess, not merely anything that is short.
 *
 * Strength is estimated with zxcvbn (guess-number model): dictionary + breached-
 * password lists, keyboard/repeat/sequence/date patterns and l33t un-munging, all
 * run locally with no network. `assessPassphrase` accepts only a passphrase whose
 * estimated score clears MIN_SCORE; `generatePassphrase` is the recommended path
 * and always clears it by construction.
 */
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommon from '@zxcvbn-ts/language-common';
import * as zxcvbnEn from '@zxcvbn-ts/language-en';
import { wordlist } from '@scure/bip39/wordlists/english';

/**
 * Entropy floor, stated here so it is one number and not a scatter of length
 * rules. zxcvbn's score is a bucket over its estimated guess count:
 *   3 = "safely unguessable" (≳1e8 guesses) — moderate protection from an offline
 *       slow-hash attack; 4 = "very unguessable" (≳1e10). Paired with Argon2id we
 * require ≥ 3. Raise this, not a character count, if the bar needs to move.
 */
export const MIN_SCORE = 3;

/** Word count for a generated passphrase. 5 words from the 2048-word BIP39 list is
 *  ~55 bits, comfortably above MIN_SCORE regardless of which words are drawn. */
export const GENERATED_WORDS = 5;

// Built once at module load: the dictionaries and adjacency graphs are large and
// immutable, so there is no reason to rebuild the estimator per keystroke.
const zxcvbn = new ZxcvbnFactory({
  dictionary: { ...zxcvbnCommon.dictionary, ...zxcvbnEn.dictionary },
  graphs: zxcvbnCommon.adjacencyGraphs,
  translations: zxcvbnEn.translations,
});

export type PassphraseScore = 0 | 1 | 2 | 3 | 4;

export interface PassphraseAssessment {
  ok: boolean;
  /** zxcvbn strength bucket (0 weakest … 4 strongest) — drives the strength meter. */
  score: PassphraseScore;
  message: string;
}

export function assessPassphrase(pw: string): PassphraseAssessment {
  if (pw.length === 0) return { ok: false, score: 0, message: 'Enter a passphrase.' };
  // A numeric-only string is a PIN by any other name; zxcvbn also scores it low,
  // but this gives the clearer message for the most common weak choice.
  if (/^\d+$/.test(pw)) {
    return { ok: false, score: 0, message: 'A numeric PIN is not allowed — use a high-entropy passphrase.' };
  }

  const result = zxcvbn.check(pw);
  const score = result.score as PassphraseScore;

  if (score < MIN_SCORE) {
    // Surface zxcvbn's specific reason (breached password, keyboard/repeat pattern,
    // …) when it has one, so the user learns why; else steer toward a word phrase.
    const message = result.feedback.warning
      || result.feedback.suggestions[0]
      || 'Too easy to guess — use several random words, or generate one below.';
    return { ok: false, score, message };
  }

  return { ok: true, score, message: score >= 4 ? 'Strong.' : 'OK — longer is stronger.' };
}

/**
 * A fresh diceware-style passphrase from the BIP39 English list, drawn with the
 * platform CSPRNG. This is the recommended path in onboarding: the default choice
 * is a strong one. 2048 (= 2^11) divides 2^16 exactly, so `% 2048` over Uint16
 * values is an unbiased pick — ~11 bits of entropy per word.
 */
export function generatePassphrase(words: number = GENERATED_WORDS): string {
  const buf = new Uint16Array(words);
  crypto.getRandomValues(buf);
  const picked: string[] = [];
  for (let i = 0; i < words; i += 1) picked.push(wordlist[buf[i] % 2048]);
  return picked.join(' ');
}
