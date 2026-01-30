import type { PostDto } from '@/api/generated';
import type { PostApiResponse } from '@/features/social/types';

export type ChainId = 'aeternity' | 'solana';

export type ListPostsParams = {
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  search?: string;
  accountAddress?: string;
};

export type ListPopularPostsParams = {
  window?: '24h' | '7d' | 'all';
  page?: number;
  limit?: number;
};

export type ListTokensParams = {
  orderBy?: 'name' | 'price' | 'market_cap' | 'created_at' | 'holders_count' | 'trending_score';
  orderDirection?: 'ASC' | 'DESC';
  collection?: 'all' | 'word' | 'number' | string;
  limit?: number;
  page?: number;
  search?: string;
  ownerAddress?: string;
  creatorAddress?: string;
  factoryAddress?: string;
};

export type ListCommentsParams = {
  id: string;
  orderDirection?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
};

export type ListPaginationParams = {
  limit?: number;
  page?: number;
};

export interface ChainAdapter {
  id: ChainId;
  listPosts(params: ListPostsParams): Promise<PostApiResponse>;
  listPopularPosts(params: ListPopularPostsParams): Promise<PostApiResponse>;
  listTokens(params: ListTokensParams): Promise<any>;
  listTokensPage(params: ListTokensParams): Promise<any>;
  findTokenByAddress(address: string): Promise<any>;
  listTokenRankings(address: string, params?: ListPaginationParams): Promise<any>;
  getTokenPerformance(address: string): Promise<any>;
  listTokenTransactions(address: string, params?: ListPaginationParams): Promise<any>;
  listTokenHolders(address: string, params?: ListPaginationParams): Promise<any>;
  listTrendingTags(params?: {
    orderBy?: 'score' | 'source' | 'token_sale_address' | 'created_at';
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    page?: number;
    search?: string;
  }): Promise<any>;
  getTopicByName(name: string): Promise<any>;
  getPostByKey(key: string): Promise<PostDto>;
  getPostById(id: string): Promise<PostDto>;
  listPostComments(params: ListCommentsParams): Promise<any>;
}
