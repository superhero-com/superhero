import { describe, expect, it } from 'vitest';
import type { PairDto } from '@/api/generated';
import { poolCandles, poolQuotePosition } from '../poolChartData';

const row = (overrides = {}) => ({
  timeOpen: '2026-09-29T10:00:00Z',
  quote: {
    open: 2, high: 4, low: 1, close: 3, volume: 12.5, convertedTo: 'ae', ...overrides,
  },
});

describe('pool chart units', () => {
  it('uses the AE denomination regardless of the pay token or pair ordering', () => {
    const ae = { address: 'wrapped-ae', symbol: 'WAE', is_ae: true };
    const token = { address: 'other', symbol: 'WTT' };
    expect(poolQuotePosition({ token0: ae, token1: token } as PairDto, 'other')).toBe('token0');
    expect(poolQuotePosition({ token0: token, token1: ae } as PairDto, 'other')).toBe('token1');
    expect(poolQuotePosition({ token0: token, token1: { address: 'usd' } } as PairDto, 'usd')).toBe('token1');
  });
  it('inverts OHLC bounds while retaining volume in its original human units', () => {
    const [normal] = poolCandles([[row()]], 3600, 'AE');
    const [inverse] = poolCandles([[row()]], 3600, 'AE', true);
    expect(normal.volume).toBe(12.5);
    expect(inverse).toMatchObject({
      open: 0.5, high: 1, low: 0.25, close: 1 / 3, volume: 12.5,
    });
  });
  it('does not invent missing volume or plot invalid and mismatched prices', () => {
    expect(poolCandles([[row({ convertedTo: 'usd' })]], 3600, 'AE')).toEqual([]);
    expect(poolCandles([[row({ close: 'invalid' })]], 3600, 'AE')).toEqual([]);
    expect(poolCandles([[row({ low: 0 })]], 3600, 'AE', true)).toEqual([]);
    expect(poolCandles([[row({ volume: null })]], 3600, 'AE')[0].volume).toBeNull();
  });
  it('preserves tiny prices and prefers the current page when history overlaps', () => {
    const current = row({
      open: 2e-15, high: 4e-15, low: 1e-15, close: 3e-15,
    });
    const values = poolCandles([[current], [row()]], 3600, 'AE');
    expect(values).toHaveLength(1);
    expect(values[0].close).toBe(3e-15);
  });
});
