type SolanaToken = {
  token_sale_address: string;
  name: string;
  symbol: string;
  collection_address?: string;
  holders_count?: number;
  market_cap?: any;
  last_price?: any;
  created_at?: string;
  updated_at?: string;
  rank?: number;
};

export const mapSolanaTokenToAeToken = (token: SolanaToken) => ({
  address: token.token_sale_address,
  sale_address: token.token_sale_address,
  name: token.name,
  symbol: token.symbol,
  collection: token.collection_address || 'all',
  holders_count: token.holders_count || 0,
  price_data: token.last_price || null,
  market_cap_data: token.market_cap || null,
  created_at: token.created_at,
  updated_at: token.updated_at,
  rank: token.rank,
} as any);

export const mapSolanaTradeToTransaction = (trade: any) => ({
  tx_hash: trade.signature,
  tx_type: trade.type,
  created_at: trade.created_at || trade.timestamp,
  account: trade.user_address,
  address: trade.user_address,
  volume: trade.volume,
  price_data: trade.price || null,
  token: trade.token ? mapSolanaTokenToAeToken(trade.token) : null,
});
