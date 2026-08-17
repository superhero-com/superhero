/**
 * P4/P3 — passphrase strength gate (the threat model §4.4, weakest-factor rule).
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
 * run locally with no network. The estimator's dictionaries are ~840 kB gzip, so it
 * is loaded on demand via `loadPassphraseEstimator()` (its own lazy chunk) rather
 * than statically — the onboarding modal paints on its shell and the meter goes
 * live when the estimator lands, with no change to the floor or the reject set.
 */
import { wordlist } from '@scure/bip39/wordlists/english';
import type { ZxcvbnResult } from '@zxcvbn-ts/core';

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

// The estimator instance, built once the dictionaries have been dynamically loaded.
// Kept as a narrow structural type so `import type` stays elided from the bundle.
let estimator: { check(pw: string): ZxcvbnResult } | null = null;
let loadPromise: Promise<void> | null = null;
let loadFailed = false;

/** True once the estimator's dictionaries have loaded and scoring is live. */
export function isEstimatorReady(): boolean {
  return estimator !== null;
}

/** True once a load attempt has failed and no retry is in flight — the caller
 *  should offer a retry rather than wait on a pulse that will never resolve. */
export function hasEstimatorFailed(): boolean {
  return loadFailed;
}

/**
 * Dynamically load zxcvbn + its dictionaries and build the estimator. Idempotent
 * and de-duplicated: concurrent callers share one in-flight load. The three
 * `import()`s are what split the ~840 kB of dictionaries into their own chunk,
 * off the onboarding shell. Call this when a passphrase step becomes reachable.
 *
 * Retry-capable by construction: a failed load (offline blip, or a hashed chunk
 * pruned by a redeploy mid-session) clears the latch and flips `loadFailed`, so
 * the next call re-attempts and the gate can report the failure instead of
 * pulsing forever. Re-throws so the caller's await still rejects.
 */
export async function loadPassphraseEstimator(): Promise<void> {
  if (estimator) return;
  if (!loadPromise) {
    loadFailed = false;
    loadPromise = (async () => {
      try {
        const [{ ZxcvbnFactory }, zxcvbnCommon, zxcvbnEn] = await Promise.all([
          import('@zxcvbn-ts/core'),
          import('@zxcvbn-ts/language-common'),
          import('@zxcvbn-ts/language-en'),
        ]);
        estimator = new ZxcvbnFactory({
          dictionary: { ...zxcvbnCommon.dictionary, ...zxcvbnEn.dictionary },
          graphs: zxcvbnCommon.adjacencyGraphs,
          translations: zxcvbnEn.translations,
        });
      } catch (err) {
        loadPromise = null;
        loadFailed = true;
        throw err;
      }
    })();
  }
  await loadPromise;
}

export type PassphraseScore = 0 | 1 | 2 | 3 | 4;

export interface PassphraseAssessment {
  ok: boolean;
  /** zxcvbn strength bucket (0 weakest … 4 strongest) — drives the strength meter. */
  score: PassphraseScore;
  message: string;
  /** True while the estimator is still loading: `score` is not yet meaningful, so
   *  the caller must show a loading (not empty/weak) meter and keep submit disabled. */
  pending: boolean;
  /** True when the estimator failed to load: distinct from `pending` so the UI can
   *  offer a retry instead of hanging. Still `ok: false` — the gate fails closed and
   *  never falls back to a length rule. */
  failed: boolean;
}

export function assessPassphrase(pw: string): PassphraseAssessment {
  if (pw.length === 0) {
    return {
      ok: false, score: 0, message: 'Enter a passphrase.', pending: false, failed: false,
    };
  }
  // A numeric-only string is a PIN by any other name; these two checks need no
  // estimator, so they give a clear message even before the dictionaries land.
  if (/^\d+$/.test(pw)) {
    return {
      ok: false, score: 0, message: 'A numeric PIN is not allowed — use a high-entropy passphrase.', pending: false, failed: false,
    };
  }
  if (!estimator) {
    // Fails closed: a failed estimator load keeps Create disabled and asks for a
    // retry — it never falls open to a length rule, which is the thing ZIX-321 fixed.
    if (loadFailed) {
      return {
        ok: false, score: 0, message: "Couldn't check passphrase strength. Check your connection and retry.", pending: false, failed: true,
      };
    }
    return {
      ok: false, score: 0, message: 'Checking strength…', pending: true, failed: false,
    };
  }

  const result = estimator.check(pw);
  const score = result.score as PassphraseScore;

  if (score < MIN_SCORE) {
    // Surface zxcvbn's specific reason (breached password, keyboard/repeat pattern,
    // …) when it has one, so the user learns why; else steer toward a word phrase.
    const message = result.feedback.warning
      || result.feedback.suggestions[0]
      || 'Too easy to guess — use several random words, or generate one below.';
    return {
      ok: false, score, message, pending: false, failed: false,
    };
  }

  return {
    ok: true, score, message: score >= 4 ? 'Strong.' : 'OK — longer is stronger.', pending: false, failed: false,
  };
}

/**
 * A fresh diceware-style passphrase from the BIP39 English list, drawn with the
 * platform CSPRNG. This is the recommended path in onboarding: the default choice
 * is a strong one. 2048 (= 2^11) divides 2^16 exactly, so `% 2048` over Uint16
 * values is an unbiased pick — ~11 bits of entropy per word. Needs no estimator.
 */
export function generatePassphrase(words: number = GENERATED_WORDS): string {
  const buf = new Uint16Array(words);
  crypto.getRandomValues(buf);
  const picked: string[] = [];
  for (let i = 0; i < words; i += 1) picked.push(wordlist[buf[i] % 2048]);
  return picked.join(' ');
}
