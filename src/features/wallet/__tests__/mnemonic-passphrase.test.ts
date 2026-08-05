// @vitest-environment node
import {
  beforeAll, describe, expect, it,
} from 'vitest';
import { generateMnemonic, isValidMnemonic, normalizeMnemonic } from '../mnemonic';
import {
  assessPassphrase, generatePassphrase, loadPassphraseEstimator, MIN_SCORE,
} from '../passphrase';
import { deriveAccount } from '../derivation';

const GOLDEN_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const GOLDEN0 = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';

describe('mnemonic helpers', () => {
  it('generates valid 12- and 24-word mnemonics', () => {
    const m12 = generateMnemonic(12);
    const m24 = generateMnemonic(24);
    expect(m12.split(' ')).toHaveLength(12);
    expect(m24.split(' ')).toHaveLength(24);
    expect(isValidMnemonic(m12)).toBe(true);
    expect(isValidMnemonic(m24)).toBe(true);
  });

  it('accepts the golden mnemonic and rejects garbage / bad checksum', () => {
    expect(isValidMnemonic(GOLDEN_MNEMONIC)).toBe(true);
    expect(isValidMnemonic('not a real mnemonic phrase at all here ok')).toBe(false);
    // 12 valid words but an invalid checksum:
    expect(isValidMnemonic(`${'abandon '.repeat(11)}abandon`)).toBe(false);
  });

  it('normalizes mixed case + extra whitespace to a valid, derivation-stable phrase', () => {
    const messy = `  ABANDON   abandon\tabandon abandon abandon abandon abandon abandon
      abandon abandon abandon ABOUT  `;
    expect(normalizeMnemonic(messy)).toBe(GOLDEN_MNEMONIC);
    expect(isValidMnemonic(messy)).toBe(true);
    // and the normalized phrase derives the golden address (what we store == what we validate)
    expect(deriveAccount(normalizeMnemonic(messy), 0).address).toBe(GOLDEN0);
  });
});

describe('passphrase gate (weakest-factor rule)', () => {
  // The estimator's dictionaries are dynamically imported (a lazy chunk in the app),
  // so load them once before scoring — the empty/numeric early returns need no load.
  beforeAll(() => loadPassphraseEstimator());

  it('rejects empty, numeric PIN, and short strings', () => {
    expect(assessPassphrase('').ok).toBe(false);
    expect(assessPassphrase('1234').ok).toBe(false);
    expect(assessPassphrase('123456789012').ok).toBe(false); // long but numeric-only
    expect(assessPassphrase('abc').ok).toBe(false);
  });

  // The old length-only gate accepted every one of these — a 12-char non-numeric
  // string or any 4-word input passed. They are exactly the offline-crackable
  // vaults ZIX-321 is about, so the entropy gate MUST now reject them.
  it('rejects low-entropy strings the old length gate let through', () => {
    [
      'passwordpassword', // 16 chars, all one dictionary word repeated
      'aaaaaaaaaaaa', // 12 chars, single repeat
      'qwertyuiopas', // 12 chars, keyboard walk
      'passw0rd1234', // 12 chars, breached password + l33t + sequence
      'Password1234', // 12 chars, capital+digits does not add real entropy
      'letmein letmein letmein letmein', // 4 words, but a breached password repeated
    ].forEach((weak) => {
      expect(assessPassphrase(weak).ok, weak).toBe(false);
    });
  });

  it('surfaces a reason for a breached / patterned passphrase', () => {
    // Not a bare "too short" — the message must explain the weakness.
    expect(assessPassphrase('password').message.length).toBeGreaterThan(0);
    expect(assessPassphrase('password').ok).toBe(false);
  });

  it('accepts a genuinely high-entropy passphrase', () => {
    expect(assessPassphrase('correct horse battery staple').ok).toBe(true);
    expect(assessPassphrase('a-fairly-long-passphrase!').ok).toBe(true);
    const a = assessPassphrase('correct horse battery staple');
    expect(a.score).toBeGreaterThanOrEqual(MIN_SCORE);
  });

  it('rates a clearly strong passphrase "Strong"', () => {
    expect(assessPassphrase('correct horse battery staple plum').message).toBe('Strong.');
  });

  it('generatePassphrase produces a strong, distinct passphrase every call', () => {
    const g1 = generatePassphrase();
    const g2 = generatePassphrase();
    expect(g1.split(' ')).toHaveLength(5);
    expect(g1).not.toBe(g2); // CSPRNG-drawn; collision is astronomically unlikely
    expect(assessPassphrase(g1).ok).toBe(true);
    expect(assessPassphrase(g1).score).toBeGreaterThanOrEqual(MIN_SCORE);
  });
});
