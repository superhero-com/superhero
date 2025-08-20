import { describe, it, expect } from 'vitest';
import { estimateRemovalMinimums } from '../dex';

describe('Remove Liquidity minimums', () => {
  it('computes proportional minimums with slippage', () => {
    const reserves = { a: 1000n, b: 2000n };
    const totalSupply = 100n;
    const lpToBurn = 10n; // 10%
    const { minA, minB } = estimateRemovalMinimums(reserves.a, reserves.b, totalSupply, lpToBurn, 1);
    // Expected share before slippage: 100, 200
    expect(minA <= 100n && minA >= 99n).toBe(true);
    expect(minB <= 200n && minB >= 198n).toBe(true);
  });
});


