import camelCaseKeysDeep from 'camelcase-keys-deep';
import { fetchJson } from '@/utils/common';
import { CurrencyRates } from '@/utils/types';
import { CURRENCIES } from '@/utils/constants';

export interface CoinGeckoMarketResponse {
  ath: number;
  athChangePercentage: number;
  athDate: string;
  atl: number;
  atlChangePercentage: number;
  atlDate: string;
  circulatingSupply: number;
  currentPrice: number;
  fullyDilutedValuation: any;
  high24h: number;
  id: string;
  image: string;
  lastUpdated: string;
  low24h: number;
  marketCap: number;
  marketCapChange24h: number;
  marketCapChangePercentage24h: number;
  marketCapRank: number;
  maxSupply: any;
  name: string;
  priceChange24h: number;
  priceChangePercentage24h: number;
  roi: object;
  symbol: string;
  totalSupply: number;
  totalVolume: number;
}

const COIN_GECKO_API_URL = 'https://api.coingecko.com/api/v3';

/**
 * @link https://www.coingecko.com/pl/api/documentation
 */
export class CoinGecko {
  static fetchFromApi<T>(path: string, searchParams: Record<string, string>) {
    const query = new URLSearchParams(searchParams).toString();

    return fetchJson<T>(`${COIN_GECKO_API_URL}${path}?${query}`);
  }

  /**
   * Obtain all the coin market data (price, market cap, volume, etc...)
   */
  static async fetchCoinMarketData(
    coinId: string,
    currencyCode: string,
  ): Promise<CoinGeckoMarketResponse | null> {
    try {
      const [marketData] =
        (await CoinGecko.fetchFromApi<any[]>('/coins/markets', {
          ids: coinId,
          vs_currency: currencyCode,
        })) || [];
      return marketData ? (camelCaseKeysDeep(marketData) as CoinGeckoMarketResponse) : null;
    } catch {
      return null;
    }
  }

  /**
   * Obtain all the coin rates for the currencies used in the app.
   */
  static async fetchCoinCurrencyRates(coinId: string): Promise<CurrencyRates | null> {
    try {
      return (
        (await CoinGecko.fetchFromApi('/simple/price', {
          ids: coinId,
          vs_currencies: CURRENCIES.map(({ code }) => code).join(','),
        })) as any
      )[coinId];
    } catch {
      return null;
    }
  }

  /**
   * Fetch historical price data for a coin
   * @param coinId - The CoinGecko coin ID (e.g., 'aeternity')
   * @param vsCurrency - The target currency (e.g., 'usd')
   * @param days - Number of days of history to fetch (1, 7, 14, 30, 90, 180, 365, max)
   * @param interval - Interval for data points ('daily' or 'hourly'), defaults to 'daily'
   * @returns Array of [timestamp_ms, price] pairs
   */
  static async fetchHistoricalPrice(
    coinId: string,
    vsCurrency: string,
    days: number = 365,
    interval: 'daily' | 'hourly' = 'daily',
  ): Promise<Array<[number, number]> | null> {
    try {
      const response = await CoinGecko.fetchFromApi<{ prices: [number, number][] }>(
        `/coins/${coinId}/market_chart`,
        {
          vs_currency: vsCurrency,
          days: String(days),
          interval: interval,
        }
      );
      return response?.prices || null;
    } catch {
      return null;
    }
  }
}
