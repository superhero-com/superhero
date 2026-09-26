import { describe, expect, it } from 'vitest';
import { candleChange, formatChartValue, tokenCandles } from '../tokenChartData';

const row = (time: string, quote = {}) => ({
  timeOpen: time,
  quote: {
    open: '0.003', high: '0.004', low: '0.002', close: '0.0035', volume: '25.5', market_cap: '350', ...quote,
  },
});

describe('Token chart history', () => {
  it('sorts and deduplicates pages, preferring the current page at boundaries', () => {
    const first = row('2026-09-25T12:00:00Z');
    const older = row('2026-09-25T11:55:00Z');
    const duplicate = { ...first, quote: { ...first.quote, close: 99 } };
    const candles = tokenCandles([[first], [older, duplicate]], 300);
    expect(candles.map((item) => item.time)).toEqual([1790337300, 1790337600]);
    expect(candles[1].close).toBe(0.0035);
  });
  it('converts prices and market cap, but never token volume', () => {
    const [candle] = tokenCandles([[row('2026-09-25T12:00:00Z')]], 300, 7);
    expect(candle.close).toBeCloseTo(0.0245);
    expect(candle.marketCap).toBe(2450);
    expect(candle.volume).toBe(25.5);
  });
  it('rejects invalid prices, preserves absent stats, and handles open outside the traded range', () => {
    const candles = tokenCandles([[
      row('bad date'),
      row('2026-09-25T12:00:00Z', { close: 'NaN' }),
      row('2026-09-25T12:05:00Z', { open: '.005', volume: null, market_cap: undefined }),
    ]], 300);
    expect(candles).toHaveLength(1);
    expect(candles[0]).toMatchObject({
      high: 0.005, low: 0.002, volume: null, marketCap: null,
    });
  });
  it('does not round tiny prices to zero or show infinite change at zero open', () => {
    const [candle] = tokenCandles([[row('2026-09-25T12:00:00Z', { open: 0, close: '0.00000000000042' })]], 300);
    expect(candleChange(candle)).toBeNull();
    expect(formatChartValue(candle.close)).toBe('0.00000000000042');
    expect(formatChartValue(null)).toBe('—');
    expect(formatChartValue(0)).toBe('0');
  });
});
