export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd?: string;
  volume24h?: string;
  pairs?: number;
}

export interface Pair {
  address: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  tvlUsd?: string;
  tvl?: string;
  volume24h?: string;
  transactions?: number;
}

export interface Transaction {
  txHash: string;
  type: 'swap' | 'add' | 'remove';
  event?: string;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  token0Symbol?: string;
  token1Symbol?: string;
  amountIn?: string;
  amountOut?: string;
  timestamp?: number;
}

export interface ExploreState {
  active: 'Tokens' | 'Pairs' | 'Transactions';
  tokens: Token[];
  pairs: Pair[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

export interface TokenListState {
  tokens: Token[];
  search: string;
  sort: {
    key: 'symbol' | 'name' | 'pairs' | 'decimals';
    asc: boolean;
  };
  loading: boolean;
  error: string | null;
}

export interface PairListState {
  pairs: Pair[];
  search: string;
  sort: {
    key: 'transactions' | 'address' | 'pair';
    asc: boolean;
  };
  loading: boolean;
  error: string | null;
}

export interface TransactionListState {
  transactions: Transaction[];
  type: 'all' | 'swap' | 'add' | 'remove';
  window: '24h' | '7d';
  loading: boolean;
  error: string | null;
}

export interface SortConfig<T> {
  key: keyof T;
  asc: boolean;
}

export interface FilterConfig {
  search: string;
  type?: string;
  window?: string;
}
