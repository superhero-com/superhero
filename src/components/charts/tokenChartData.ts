import type { UTCTimestamp } from 'lightweight-charts';

export interface TokenCandle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  marketCap: number | null;
}

export const TOKEN_CHART_INTERVALS = [
  {
    label: '1m', value: 60, unit: 'minute', count: 1,
  },
  {
    label: '5m', value: 300, unit: 'minute', count: 5,
  },
  {
    label: '15m', value: 900, unit: 'minute', count: 15,
  },
  {
    label: '1h', value: 3600, unit: 'hour', count: 1,
  },
  {
    label: '4h', value: 14400, unit: 'hour', count: 4,
  },
  {
    label: '1d', value: 86400, unit: 'day', count: 1,
  },
  {
    label: '1w', value: 604800, unit: 'week', count: 1,
  },
  {
    label: '1M', value: 2678400, unit: 'day', count: 31,
  },
] as const;

function amount(value: unknown): number | null {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/** History prices/cap are quoted amounts; volume is token units, regardless of quote. */
export function tokenCandles(pages: unknown[][], interval: number, quoteFactor = 1): TokenCandle[] {
  const candles = new Map<number, TokenCandle>();
  pages.flat().forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const item = row as { timeOpen?: string; timeClose?: string; quote?: Record<string, unknown> };
    const { quote } = item;
    if (!quote) return;
    const open = amount(quote.open);
    const close = amount(quote.close);
    const high = amount(quote.high);
    const low = amount(quote.low);
    const date = new Date(item.timeOpen || item.timeClose || '').getTime() / 1000;
    const time = Math.floor(item.timeOpen ? date : date - interval) as UTCTimestamp;
    if (!Number.isFinite(time) || open === null || close === null || high === null || low === null
      || !Number.isFinite(quoteFactor) || quoteFactor <= 0 || candles.has(time)) return;
    if (![open, close, high, low].every((value) => Number.isFinite(value * quoteFactor))) return;
    const marketCap = amount(quote.market_cap);
    // The API may use the preceding close for open, outside this bucket's traded range.
    candles.set(time, {
      time,
      open: open * quoteFactor,
      close: close * quoteFactor,
      high: Math.max(high, open, close) * quoteFactor,
      low: Math.min(low, open, close) * quoteFactor,
      volume: amount(quote.volume),
      marketCap: marketCap === null ? null : marketCap * quoteFactor,
    });
  });
  return [...candles.values()].sort((a, b) => a.time - b.time);
}

export function candleChange(candle?: TokenCandle): number | null {
  if (!candle || candle.open === 0) return null;
  return ((candle.close - candle.open) / candle.open) * 100;
}

const priceFormat = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 });
export const formatChartValue = (value: number | null | undefined): string => (
  value == null || !Number.isFinite(value) ? '—' : priceFormat.format(value)
);
