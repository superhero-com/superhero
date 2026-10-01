import { DexTokenDto, PairDto } from '@/api/generated';
import { CONFIG } from '@/config';
import { tokenCandles, type TokenCandle } from '@/components/charts/tokenChartData';

export const isAeAsset = (token?: DexTokenDto) => (
  token?.is_ae || token?.address === 'AE' || token?.address === CONFIG.DEX_WAE
);
export const poolAssetSymbol = (token?: DexTokenDto) => (
  isAeAsset(token) ? 'AE' : token?.symbol || '—'
);

/** The history API's from_token selects the denomination, not the charted asset. */
export function poolQuotePosition(pair: PairDto, fromAddress?: string): 'token0' | 'token1' {
  // Request the non-WAE asset in AE: the reverse API orientation returns WAE's flat AE price.
  if (isAeAsset(pair.token0)) return 'token0';
  if (isAeAsset(pair.token1)) return 'token1';
  return pair.token1.address === fromAddress ? 'token1' : 'token0';
}

export function poolCandles(
  pages: unknown[][],
  interval: number,
  quoteSymbol: string,
  inverted = false,
): TokenCandle[] {
  const filtered = pages.map((page) => page.filter((row) => {
    const quote = (row as { quote?: { convertedTo?: unknown } } | null)?.quote;
    return !quote?.convertedTo
      || String(quote.convertedTo).toLowerCase() === quoteSymbol.toLowerCase();
  }));
  // Pair history supplies human-unit prices and denomination-token volume.
  const candles = tokenCandles(filtered, interval);
  if (!inverted) return candles;
  return candles.flatMap((candle) => {
    if ([candle.open, candle.high, candle.low, candle.close].some((value) => value <= 0)) return [];
    const invertedCandle = {
      ...candle,
      open: 1 / candle.open,
      high: 1 / candle.low,
      low: 1 / candle.high,
      close: 1 / candle.close,
      // Keep the original volume asset: a close cannot convert a whole candle's flow.
      volume: candle.volume,
      marketCap: null,
    };
    return [invertedCandle.open, invertedCandle.high, invertedCandle.low, invertedCandle.close]
      .every(Number.isFinite) ? [invertedCandle] : [];
  });
}
