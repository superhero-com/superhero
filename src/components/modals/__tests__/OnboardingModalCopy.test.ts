/**
 * Copy invariants for the connect modal.
 *
 * The bug this exists to stop: the modal read
 * `t('common.modals.onboarding.title', { defaultValue: 'Connect to Superhero' })`
 * while en.json defined that key as "Edit SuperheroID". A key that exists wins
 * over the fallback, so the code said one thing and every user saw another —
 * and reading the component told you nothing about it.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import en from '@/locales/en.json';

const MODAL = path.resolve(__dirname, '../OnboardingModal.tsx');

function lookup(key: string): string | undefined {
  const value = key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object'
      ? (node as Record<string, unknown>)[part]
      : undefined),
    en as unknown,
  );
  return typeof value === 'string' ? value : undefined;
}

describe('connect modal copy', () => {
  it('is titled for the account, not for editing one', () => {
    // The modal is how you sign in. "Edit" described something else entirely.
    const title = lookup('common.modals.onboarding.title');
    expect(title).toBe('SuperheroID Account');
    expect(title).not.toMatch(/edit/i);
  });

  it('never lets a defaultValue disagree with the string that actually ships', () => {
    const source = fs.readFileSync(MODAL, 'utf-8');
    const calls = source.matchAll(
      /t\(\s*'([\w.]+)'\s*,\s*\{\s*\n?\s*defaultValue:\s*'((?:[^'\\]|\\.)*)'/g,
    );

    const conflicts: string[] = [];
    let seen = 0;
    Array.from(calls).forEach(([, key, rawDefault]) => {
      seen += 1;
      const shipped = lookup(key);
      // No en.json entry is fine — then the fallback IS the shipped string.
      if (shipped === undefined) return;
      const fallback = rawDefault.replace(/\\'/g, "'");
      if (shipped !== fallback) {
        conflicts.push(`${key}: en.json ${JSON.stringify(shipped)} vs code ${JSON.stringify(fallback)}`);
      }
    });

    // Guards the regex itself: if it stops matching, the test must fail loudly
    // rather than pass by inspecting nothing.
    expect(seen).toBeGreaterThan(5);
    expect(conflicts).toEqual([]);
  });
});
