import { describe, expect, it } from 'vitest';
import { utcClock } from '../utcClock';

describe('utcClock', () => {
  it('formats the UTC hour and minute regardless of the local offset', () => {
    expect(utcClock(new Date('2026-10-01T23:45:10+08:00'))).toBe('15:45');
    expect(utcClock(new Date('2026-10-02T00:00:42Z'))).toBe('00:00');
  });
});
