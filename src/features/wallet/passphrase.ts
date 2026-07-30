/**
 * P4/P3 — passphrase strength gate (threat-model §4.4, weakest-factor rule).
 *
 * The passphrase factor is the only one that may take a user secret, and its
 * whole safety rests on that secret being HIGH-entropy (Argon2id is a work-factor
 * multiplier, not a substitute for entropy). So a short PIN / low-entropy string
 * is REJECTED here, by construction — never enrol one as an unlock factor.
 *
 * This is a coarse heuristic, deliberately not a full estimator (no zxcvbn dep).
 * It errs toward pushing the user to a longer passphrase; it is a floor, not a
 * guarantee.
 */
export interface PassphraseAssessment {
  ok: boolean;
  message: string;
}

export function assessPassphrase(pw: string): PassphraseAssessment {
  const words = pw.trim().split(/\s+/).filter(Boolean).length;
  if (pw.length === 0) return { ok: false, message: 'Enter a passphrase.' };
  if (/^\d+$/.test(pw)) {
    return { ok: false, message: 'A numeric PIN is not allowed — use a high-entropy passphrase.' };
  }
  if (pw.length < 8) {
    return { ok: false, message: 'Too short — use at least 12 characters, or a 4+ word passphrase.' };
  }
  if (pw.length < 12 && words < 4) {
    return { ok: false, message: 'Weak — make it 12+ characters, or a 4+ word passphrase.' };
  }
  if (pw.length >= 20 || words >= 5) return { ok: true, message: 'Strong.' };
  return { ok: true, message: 'OK — longer is stronger.' };
}
