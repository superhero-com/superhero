import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSolanaWallet } from './useSolanaWallet';
import type { SocialPost } from '../social/types';
import {
  findPostSignatureByPostId,
  getPostBySignature,
  listPostsPage,
  listRepliesByParentPostId,
} from '../solanaPosting/rpc';

export function useSolanaPosts(limit: number = 20) {
  const { connection } = useSolanaWallet();

  return useInfiniteQuery<{ items: SocialPost[]; nextBefore?: string }, Error>({
    queryKey: ['solana-posts', { limit }],
    queryFn: ({ pageParam }) => listPostsPage(connection, { limit, before: pageParam as (string | undefined) }),
    getNextPageParam: (lastPage) => lastPage.nextBefore,
    initialPageParam: undefined,
    staleTime: 15_000,
  });
}

export function useSolanaPostBySignature(signature: string | undefined) {
  const { connection } = useSolanaWallet();
  return useQuery<SocialPost, Error>({
    queryKey: ['solana-post-sig', signature],
    queryFn: () => getPostBySignature(connection, String(signature)),
    enabled: !!signature,
    staleTime: 15_000,
  });
}

export function useSolanaPostByPostId(postId: string | undefined) {
  const { connection } = useSolanaWallet();
  return useQuery<SocialPost | null, Error>({
    queryKey: ['solana-post', postId],
    queryFn: async () => {
      const key = String(postId || '');
      if (!key) return null;
      if (key.length > 40) {
        try {
          return await getPostBySignature(connection, key);
        } catch {
          // fall through
        }
      }
      const found = await findPostSignatureByPostId(connection, key, { limit: 500 });
      if (!found) return null;
      return getPostBySignature(connection, found.signature);
    },
    enabled: !!postId,
    staleTime: 15_000,
  });
}

export function useSolanaReplies(parentPostId: string | undefined, limit: number = 200) {
  const { connection } = useSolanaWallet();
  return useInfiniteQuery<{ items: SocialPost[]; nextBefore?: string }, Error>({
    queryKey: ['solana-replies', { parentPostId, limit }],
    queryFn: ({ pageParam }) => listRepliesByParentPostId(connection, String(parentPostId), { limit, before: pageParam as (string | undefined) }),
    getNextPageParam: (lastPage) => lastPage.nextBefore,
    initialPageParam: undefined,
    enabled: !!parentPostId,
    staleTime: 15_000,
  });
}
