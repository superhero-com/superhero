import { describe, expect, it } from 'vitest';
import { removalAmount, removalEstimate } from '../removalEstimate';

describe('liquidity removal amounts', () => {
  it('keeps full LP precision in both Max and exact input, and floors fractional base units', () => {
    const balance = '1234567890123456789012345';
    const full = removalAmount(balance, 100);
    expect(full.raw).toBe(balance);
    expect(full.amount).toBe('1234567.890123456789012345');
    expect(full.remaining).toBe('0');
    expect(removalAmount(balance, 25, full.amount)).toEqual(full);
    expect(removalAmount('7', 25).raw).toBe('1');
    expect(removalAmount('1', 100).amount).toBe('0.000000000000000001');
  });
  it('rejects zero, invalid, excessive and fractional-base-unit inputs', () => {
    ['', '.', '-1', '0', '1.000000000000000001', '0.0000000000000000001'].forEach((value) => {
      expect(removalAmount('1000000000000000000', 25, value).valid).toBe(false);
    });
    expect(removalAmount('1000000000000000000', 0).valid).toBe(false);
    expect(removalAmount('bad', 100).valid).toBe(false);
  });
  it('estimates both returns and minima in token units and rejects unavailable or dust outputs', () => {
    const pool = { reserveA: 100n * 10n ** 18n, reserveB: 200n * 10n ** 6n, totalSupply: 10n * 10n ** 18n };
    const result = removalEstimate('1000000000000000000', pool, [18, 6], 5);
    expect(result?.map(({ amount, minimum }) => [amount, minimum])).toEqual([['10', '9.5'], ['20', '19']]);
    expect(removalEstimate('1', pool, [18, 6], 5)).toBeNull();
    expect(removalEstimate('1', { ...pool, totalSupply: null }, [18, 6], 5)).toBeNull();
    expect(removalEstimate('10000000000000000001', pool, [18, 6], 5)).toBeNull();
    expect(removalEstimate('1', pool, [18, NaN], 5)).toBeNull();
  });
});
