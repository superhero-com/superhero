import { describe, expect, it } from 'vitest';
import { formatLiquidityValue, linkedDeposit, liquidityEstimate } from '../liquidityEstimate';

const pool = { reserveA: 1000n * 10n ** 18n, reserveB: 2000n * 10n ** 6n, totalSupply: 100n * 10n ** 18n };

describe('liquidity estimates', () => {
  it('uses token decimals and estimates the share after the deposit', () => {
    const estimate = liquidityEstimate({
      amountA: '100', amountB: '200', decA: 18, decB: 6,
    }, pool);
    expect(estimate?.ratioBinA).toBe('2');
    expect(estimate?.ratioAinB).toBe('0.5');
    expect(estimate?.lpMintEstimate).toBe('10');
    expect(Number(estimate?.sharePct)).toBeCloseTo(100 / 11);
  });
  it('uses the limiting deposit and never invents an LP estimate for an empty pool', () => {
    expect(liquidityEstimate({
      amountA: '100', amountB: '100', decA: 18, decB: 6,
    }, pool)?.lpMintEstimate).toBe('5');
    const estimate = liquidityEstimate({
      amountA: '100', amountB: '200', decA: 18, decB: 6,
    }, null);
    expect(estimate?.ratioBinA).toBe('2');
    expect(estimate?.lpMintEstimate).toBeUndefined();
    expect(estimate?.sharePct).toBeUndefined();
  });
  it('rounds the linked amount down to the token precision in both directions', () => {
    expect(linkedDeposit('1', '3', 6, 'A')).toBe('0.333333');
    expect(linkedDeposit('0.333333', '3', 18, 'B')).toBe('0.999999');
    expect(linkedDeposit('2', '0.5', 0, 'A')).toBe('4');
    expect(linkedDeposit('', '2', 18, 'A')).toBe('');
    expect(linkedDeposit('2', undefined, 18, 'A')).toBeNull();
    expect(formatLiquidityValue('0.0000000000123456')).toBe('0.0000000000123456');
  });
});
