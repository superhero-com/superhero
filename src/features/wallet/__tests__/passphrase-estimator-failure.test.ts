// @vitest-environment node
import {
  describe, expect, it, vi,
} from 'vitest';

// Simulate a chunk-fetch failure (offline blip, or a hashed asset pruned by a
// redeploy mid-session): the estimator's English dictionary never loads.
vi.mock('@zxcvbn-ts/language-en', () => {
  throw new Error('simulated estimator chunk fetch failure');
});

const { assessPassphrase, hasEstimatorFailed, loadPassphraseEstimator } = await import('../passphrase');

describe('passphrase gate — estimator load failure fails closed', () => {
  it('reports a distinct failed state and never falls open to a length rule', async () => {
    await expect(loadPassphraseEstimator()).rejects.toThrow();
    expect(hasEstimatorFailed()).toBe(true);

    // A genuinely strong phrase is still rejected — the gate fails CLOSED, it does
    // not revert to accepting anything long enough.
    const strong = assessPassphrase('correct horse battery staple');
    expect(strong.ok).toBe(false);
    expect(strong.pending).toBe(false);
    expect(strong.failed).toBe(true);
    expect(strong.message).toMatch(/retry/i);

    // The estimator-free early returns still answer, and stay distinct from failed.
    expect(assessPassphrase('').failed).toBe(false);
    expect(assessPassphrase('1234').ok).toBe(false);
  });
});
