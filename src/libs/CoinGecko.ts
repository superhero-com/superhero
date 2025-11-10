/**
 * Market data response interface from CoinGecko API
 * @deprecated This type is kept for backward compatibility.
 * Price data is now fetched from the backend API via TrendminerApi.
 */
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
