// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateMnemonic, isValidMnemonic, normalizeMnemonic } from '../mnemonic';
import { assessPassphrase } from '../passphrase';
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
  it('rejects empty, numeric PIN, and short strings', () => {
    expect(assessPassphrase('').ok).toBe(false);
    expect(assessPassphrase('1234').ok).toBe(false);
    expect(assessPassphrase('123456789012').ok).toBe(false); // long but numeric-only
    expect(assessPassphrase('abc').ok).toBe(false);
  });

  it('accepts a long passphrase or a multi-word one', () => {
    expect(assessPassphrase('correct horse battery staple').ok).toBe(true);
    expect(assessPassphrase('a-fairly-long-passphrase!').ok).toBe(true);
  });

  it('rates a clearly strong passphrase "Strong"', () => {
    expect(assessPassphrase('correct horse battery staple plum').message).toBe('Strong.');
  });
});
