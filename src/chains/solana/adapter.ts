import type { Connection } from '@solana/web3.js';
import type { ChainAdapter } from '../types';
import { SolanaApi } from './backend';
import type { SocialPost } from './social/types';
import { mapSolanaTokenToAeToken } from './utils/tokenMapping';
import {
  findPostSignatureByPostId,
  getPostBySignature,
  listPostsPage,
  listRepliesByParentPostId,
} from './solanaPosting/rpc';

const mapSolanaPostToPostDto = (post: SocialPost) => {
  const parent = post.parent ? String(post.parent) : '';
  const topics = parent ? [`comment:${parent}`] : [];
  return {
    id: post.post_id || post.id,
    tx_hash: post.id,
    tx_args: [
      { post_id: post.post_id },
      { signature: post.id },
      ...(parent ? [{ parent }] : []),
    ],
    sender_address: post.sender_address,
    contract_address: '',
    type: post.type === 'comment' ? 'COMMENT' : 'POST',
    content: post.content,
    topics,
    media: post.media || [],
    total_comments: post.total_comments ?? 0,
    created_at: post.created_at,
    slug: post.slug,
  } as any;
};

export const createSolanaAdapter = (connection: Connection | null): ChainAdapter => ({
  id: 'solana',
  listPosts: async (params) => {
    if (!connection) throw new Error('Solana connection not available');
    const { items } = await listPostsPage(connection, { limit: params.limit });
    return {
      items: items.map(mapSolanaPostToPostDto),
      meta: { currentPage: 1, totalPages: 1, totalItems: items.length },
    };
  },
  listPopularPosts: (params) => SolanaApi.listPopularPosts(params as any) as any,
  listTokens: async (params) => {
    const resp = await SolanaApi.listBclTokens({
      orderBy: params.orderBy,
      orderDirection: params.orderDirection,
      limit: params.limit,
      page: params.page,
      search: params.search,
      ownerAddress: params.ownerAddress,
      creatorAddress: params.creatorAddress,
      includes: 'performance',
    });
    const items = (resp?.items || []).map(mapSolanaTokenToAeToken);
    return { ...resp, items };
  },
  listTokensPage: async (params) => {
    const resp = await SolanaApi.listBclTokens({
      orderBy: params.orderBy,
      orderDirection: params.orderDirection,
      limit: params.limit,
      page: params.page,
      search: params.search,
      ownerAddress: params.ownerAddress,
      creatorAddress: params.creatorAddress,
      includes: 'performance',
    });
    const items = (resp?.items || []).map(mapSolanaTokenToAeToken);
    return { ...resp, items };
  },
  findTokenByAddress: async (address) => {
    const token = await SolanaApi.getBclToken(address);
    return token ? mapSolanaTokenToAeToken(token as any) : null;
  },
  listTokenRankings: async (address, params) => {
    const resp = await SolanaApi.listBclTokenRankings(address, params as any);
    const items = (resp?.items || []).map(mapSolanaTokenToAeToken);
    return { ...resp, items };
  },
  getTokenPerformance: (address) => SolanaApi.getBclTokenPerformance(address) as any,
  listTokenTransactions: (address, params) => SolanaApi.listBclTokenTrades(address, { ...params, includes: 'token' }) as any,
  listTokenHolders: async (address, params) => {
    const resp = await SolanaApi.listBclTokenHolders(address, params as any);
    const items = Array.isArray(resp?.items)
      ? resp.items.map((holder: any) => ({
          ...holder,
          address: holder.address || holder.owner_address,
        }))
      : [];
    return { ...resp, items };
  },
  listTrendingTags: async (params) => {
    const resp = await SolanaApi.listTrendingTags(params as any);
    const items = Array.isArray(resp?.items) ? resp.items : [];
    if (items.length > 0) return resp;

    const orderByFallback = params?.orderBy === 'score'
      ? 'market_cap'
      : params?.orderBy === 'source'
        ? 'market_cap'
        : params?.orderBy;

    const fallback = await SolanaApi.listBclTokens({
      orderBy: orderByFallback,
      orderDirection: params?.orderDirection,
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      search: params?.search,
    });
    const fallbackItems = Array.isArray(fallback?.items) ? fallback.items : [];
    return {
      ...fallback,
      items: fallbackItems.map((token: any) => ({
        tag: token?.name ?? token?.symbol ?? '',
        score: Number(token?.trending_score ?? token?.market_cap?.usd ?? token?.holders_count ?? 0),
        source: token?.collection_address ? 'solana' : undefined,
        token_sale_address: token?.token_sale_address ?? token?.sale_address,
        sale_address: token?.token_sale_address ?? token?.sale_address,
        token_address: token?.token_sale_address ?? token?.sale_address,
      })).filter((t: any) => t.tag),
    };
  },
  getTopicByName: (name) => SolanaApi.getTopicByName(name) as any,
  getPostByKey: async (key: string) => {
    if (!connection) throw new Error('Solana connection not available');
    const normalized = String(key || '').trim();
    if (!normalized) throw new Error('Missing post identifier');
    try {
      const bySig = await getPostBySignature(connection, normalized);
      return mapSolanaPostToPostDto(bySig);
    } catch {
      // fall through
    }
    const found = await findPostSignatureByPostId(connection, normalized, { limit: 500 });
    if (!found) throw new Error('Post not found');
    const post = await getPostBySignature(connection, found.signature);
    return mapSolanaPostToPostDto(post);
  },
  getPostById: async (id: string) => {
    if (!connection) throw new Error('Solana connection not available');
    const found = await findPostSignatureByPostId(connection, id, { limit: 500 });
    if (!found) throw new Error('Post not found');
    const post = await getPostBySignature(connection, found.signature);
    return mapSolanaPostToPostDto(post);
  },
  listPostComments: async ({ id, limit }) => {
    if (!connection) throw new Error('Solana connection not available');
    const resp = await listRepliesByParentPostId(connection, id, { limit });
    return {
      items: resp.items.map(mapSolanaPostToPostDto),
      meta: { currentPage: 1, totalPages: 1, totalItems: resp.items.length },
    };
  },
});
