import { describe, expect, it } from 'vitest';
import {
  portfolioChange, portfolioPeriod, portfolioPoints, portfolioValue,
} from '../portfolioModel';

const now = Date.parse('2026-09-20T12:00:00Z');
const snapshot = (timestamp: string, ae: number, usd?: number) => ({
  timestamp, total_value_ae: ae, total_value_usd: usd,
});

describe('portfolio figures', () => {
  it('keeps a real zero and never labels an AE value as missing USD', () => {
    const data = snapshot('2026-09-20T12:00:00Z', 10);
    expect(portfolioValue(data, 'usd')).toBeNull();
    expect(portfolioValue({ ...data, total_value_usd: 0 }, 'usd')).toBe(0);
    expect(portfolioValue({ ...data, total_value_ae: NaN }, 'ae')).toBeNull();
  });

  it('sorts history, deduplicates timestamps, and excludes invalid or future data', () => {
    const points = portfolioPoints([
      snapshot('2026-09-20T10:00:00Z', 5),
      snapshot('2026-09-19T10:00:00Z', 3),
      snapshot('2026-09-20T10:00:00Z', 6),
      snapshot('invalid', 99),
      snapshot('2026-09-21T10:00:00Z', 99),
      snapshot('2026-09-18T10:00:00Z', Infinity),
    ], null, 'ae', now);
    expect(points.map((point) => point.value)).toEqual([3, 6]);
  });

  it('keeps a snapshot at its actual time instead of claiming it is live', () => {
    const latest = snapshot('2026-09-20T11:00:00Z', 8);
    const points = portfolioPoints([snapshot('2026-09-19T10:00:00Z', 3)], latest, 'ae', now);
    expect(points[1]).toEqual({ time: Date.parse(latest.timestamp), value: 8 });
    expect(portfolioChange(points)).toEqual({ amount: 5, percentage: (5 / 3) * 100 });
  });

  it('does not append an older summary or invent history from a current balance', () => {
    const old = snapshot('2026-09-18T10:00:00Z', 100);
    const points = portfolioPoints([snapshot('2026-09-19T10:00:00Z', 5)], old, 'ae', now);
    expect(points).toHaveLength(1);
    expect(portfolioPoints([], old, 'ae', now)).toEqual([]);
    expect(portfolioChange(points)).toBeNull();
  });

  it('handles gains from zero without infinite percentages', () => {
    const gainFromZero = portfolioChange([{ value: 0 }, { value: 30 }]);
    expect(gainFromZero).toEqual({ amount: 30, percentage: null });
    const lossToZero = portfolioChange([{ value: 30 }, { value: 0 }]);
    expect(lossToZero).toEqual({ amount: -30, percentage: -100 });
  });

  it('uses the requested window and bounds all-time history at the supported start', () => {
    expect(portfolioPeriod('1w', now)).toEqual({
      startDate: '2026-09-13T12:00:00.000Z',
      endDate: '2026-09-20T12:00:00.000Z',
      interval: 21600,
    });
    expect(portfolioPeriod('all', now).startDate).toBe('2025-01-01T00:00:00.000Z');
  });
});
