import { useQueries } from '@tanstack/react-query';
import { SocialGraphService } from '@/api/generated';
import { withSocialGraphTimeout } from '@/api/socialGraphPolicy';
import { relationshipKey, useSocialGraphConfig } from '@/hooks/useSocialGraph';
import type { Short } from './types';

/** Read only creators in the current feed, using the same cache as profiles.
 * Confirmed follow/unfollow and social-graph socket events update both surfaces.
 * No browser preference is ever treated as an on-chain relationship.
 */
export function useShortsSocial(feed: Short[], viewer: string) {
  const policy = useSocialGraphConfig();
  const creators = [...new Set(feed.map((short) => short.creator))].filter((creator) => creator !== viewer);
  const contract = policy.data?.contract_address;
  const queries = useQueries({
    queries: creators.map((creator) => ({
      queryKey: relationshipKey(viewer, creator, contract),
      queryFn: () => withSocialGraphTimeout(SocialGraphService.getSocialGraphRelationship({ from: viewer, to: creator })),
      enabled: !!viewer && !!contract,
      staleTime: 15_000,
      retry: 1,
    })),
  });
  let status: 'disconnected' | 'loading' | 'error' | 'ready' = 'ready';
  if (!viewer) status = 'disconnected';
  else if (policy.isError || queries.some((query) => query.isError)) status = 'error';
  else if (policy.isPending || !contract || queries.some((query) => query.isPending)) status = 'loading';
  return {
    status,
    followed: viewer && contract ? creators.filter((_, index) => {
      const relation = queries[index].data;
      return relation?.a_follows_b && !relation.a_blocked_b && !relation.b_blocked_a;
    }) : [],
    retry: () => { policy.refetch(); queries.forEach((query) => query.refetch()); },
  };
}
