import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { compactTime, fullTimestamp } from '@/utils/time';

const NOW = new Date('2026-08-20T12:00:00Z').getTime();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('compactTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an empty string for falsy input', () => {
    expect(compactTime(undefined)).toBe('');
    expect(compactTime('')).toBe('');
  });

  it('uses relative units under a week', () => {
    expect(compactTime(NOW - 5 * SECOND)).toBe('5s');
    expect(compactTime(NOW - 3 * MINUTE)).toBe('3m');
    expect(compactTime(NOW - 5 * HOUR)).toBe('5h');
    expect(compactTime(NOW - 4 * DAY)).toBe('4d');
  });

  it('clamps sub-second and future timestamps to at least 1s', () => {
    expect(compactTime(NOW)).toBe('1s');
    expect(compactTime(NOW + 5 * MINUTE)).toBe('1s');
  });

  it('rolls over to a short absolute date past a week instead of "52w"', () => {
    const label = compactTime(NOW - 10 * DAY);
    // "Mon D" — no relative "w"/"d" unit, no stray "ago", and this year needs no year suffix.
    expect(label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    expect(label).not.toMatch(/w|ago/);
  });

  it('includes the year for a date in another year', () => {
    const label = compactTime(new Date('2025-08-04T12:00:00Z'));
    expect(label).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(label).toContain('2025');
  });
});

describe('fullTimestamp', () => {
  it('renders an exact DD/MM/YYYY, HH:MM:SS label for the hover title', () => {
    const label = fullTimestamp(new Date('2026-08-20T09:07:05'));
    expect(label).toBe('20/08/2026, 09:07:05');
  });

  it('returns an empty string for falsy input', () => {
    expect(fullTimestamp(undefined)).toBe('');
  });
});
