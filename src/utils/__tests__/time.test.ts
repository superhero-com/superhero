import { describe, expect, it } from 'vitest';
import { compactTime, fullTimestamp } from '../time';

const NOW = new Date(2026, 9, 13, 12, 0, 0).getTime();

describe('compactTime', () => {
  it('keeps short relative units for the last week', () => {
    expect(compactTime(new Date(NOW - 30 * 1000), 'en', NOW)).toBe('30s');
    expect(compactTime(new Date(NOW - 5 * 60 * 1000), 'en', NOW)).toBe('5m');
    expect(compactTime(new Date(NOW - 3 * 3600 * 1000), 'en', NOW)).toBe('3h');
    expect(compactTime(new Date(NOW - 6 * 86400 * 1000), 'en', NOW)).toBe('6d');
  });

  it('shows the date for older posts instead of weeks', () => {
    expect(compactTime(new Date(2026, 8, 1, 10, 0), 'en-US', NOW)).toBe('Sep 1');
    expect(compactTime(new Date(2025, 9, 15, 4, 46), 'en-US', NOW)).toBe('Oct 15, 2025');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(compactTime(undefined)).toBe('');
    expect(compactTime('not a date')).toBe('');
  });
});

describe('fullTimestamp', () => {
  it('formats the exact local date and time', () => {
    expect(fullTimestamp(new Date(2025, 9, 15, 4, 46, 55))).toBe('2025-10-15 04:46:55');
  });

  it('returns an empty string for invalid input', () => {
    expect(fullTimestamp('nope')).toBe('');
  });
});
