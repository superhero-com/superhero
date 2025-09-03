export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd?: string;
  tvlUsd?: string;
  priceChangeDay?: string;
  volumeUsdDay?: string;
  volumeUsdAll?: string;
  volume24h?: string; // Keep for backward compatibility
  pairs?: number;
}

export interface Pair {
  address: string;
  token0: string;
  token1: string;
  tvlUsd?: string;
  volumeUsdYear?: string;
  volumeUsdAll?: string;
  transactions?: number;
  synchronized?: boolean;
}

export interface Transaction {
  transactionHash: string;
  type: string;
  pairAddress: string;
  senderAccount: string;
  reserve0: string;
  reserve1: string;
  deltaReserve0: string;
  deltaReserve1: string;
  height: number;
  microBlockHash: string;
  microBlockTime: string;
  transactionIndex: string;
  logIndex: number;
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
    key: 'name' | 'pairs' | 'priceUsd' | 'tvlUsd' | 'priceChangeDay' | 'volumeUsdDay' | 'volumeUsdAll';
    asc: boolean;
  };
  loading: boolean;
  error: string | null;
  setSearch: (search: string) => void;
  setSort: (sort: { key: 'name' | 'pairs' | 'priceUsd' | 'tvlUsd' | 'priceChangeDay' | 'volumeUsdDay' | 'volumeUsdAll'; asc: boolean }) => void;
  toggleSort: (key: 'name' | 'pairs' | 'priceUsd' | 'tvlUsd' | 'priceChangeDay' | 'volumeUsdDay' | 'volumeUsdAll') => void;
  refresh: () => void;
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
  setSearch: (search: string) => void;
  setSort: (sort: { key: 'transactions' | 'address' | 'pair'; asc: boolean }) => void;
  toggleSort: (key: 'transactions' | 'address' | 'pair') => void;
  refresh: () => void;
}

export interface TransactionListState {
  transactions: Transaction[];
  type: 'all' | 'swap' | 'add' | 'remove';
  window: '24h' | '7d';
  loading: boolean;
  error: string | null;
  setType: (type: 'all' | 'swap' | 'add' | 'remove') => void;
  setWindow: (window: '24h' | '7d') => void;
  refresh: () => void;
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
