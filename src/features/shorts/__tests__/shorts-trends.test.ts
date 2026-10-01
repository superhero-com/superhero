import { describe, expect, it } from 'vitest';
import { dailyCreatorRevenue } from '../shorts-trends';
import type { LedgerEntry, Performance } from '../types';

describe('creator earnings trends', () => {
  it('uses confirmed creator accruals in UTC buckets without counting claims or restored hosting', () => {
    const start = Date.UTC(2026, 8, 30);
    const entry = (action: string, at: number, amount: string, confirmed = true) => ({
      action, at, amount, confirmed,
    } as LedgerEntry);
    const p = {
      series: [{ at: start }, { at: start + 86400000 }],
      finance: {
        entries: [
          entry('PaidLike', start - 1, '80000000000000000'),
          entry('PaidLike', start, '80000000000000000'),
          entry('PaidLike', start + 1, '1'),
          entry('PaidLike', start + 2, '80000000000000000', false),
          entry('HostingRefunded', start + 3, '1000000000000000000'),
          entry('Claimed', start + 4, '80000000000000000'),
          entry('PaidLike', start + 86400000, '160000000000000000'),
        ],
      },
    } as Performance;
    expect(dailyCreatorRevenue(p)).toEqual([
      { at: start, earnedAe: '0.080000000000000001', paidLikes: 2 },
      { at: start + 86400000, earnedAe: '0.16', paidLikes: 1 },
    ]);
  });
});
