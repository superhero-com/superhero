import type { ChainAdapter } from '../types';
import { PostsService } from '@/api/generated';
import { TokensService } from '@/api/generated/services/TokensService';
import { SuperheroApi } from '@/api/backend';
import { resolvePostByKey } from '@/features/social/utils/resolvePost';

export const aeternityAdapter: ChainAdapter = {
  id: 'aeternity',
  listPosts: (params) => PostsService.listAll(params as any) as any,
  listPopularPosts: (params) => SuperheroApi.listPopularPosts(params as any) as any,
  listTokens: (params) => SuperheroApi.listTokens(params as any) as any,
  listTokensPage: (params) => TokensService.listAll(params as any) as any,
  findTokenByAddress: (address) => TokensService.findByAddress({ address: address.toUpperCase() } as any) as any,
  listTokenRankings: (address, params) => SuperheroApi.listTokenRankings(address, params as any) as any,
  getTokenPerformance: (address) => SuperheroApi.getTokenPerformance(address) as any,
  listTokenTransactions: (address, params) => SuperheroApi.listTokenTransactions(address, params as any) as any,
  listTokenHolders: (address, params) => SuperheroApi.listTokenHolders(address, params as any) as any,
  listTrendingTags: (params) => SuperheroApi.listTrendingTags(params as any) as any,
  getTopicByName: (name) => SuperheroApi.getTopicByName(name) as any,
  getPostByKey: resolvePostByKey,
  getPostById: (id) => PostsService.getById({ id } as any) as any,
  listPostComments: (params) => PostsService.getComments(params as any) as any,
};
