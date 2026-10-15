import { useQueries } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SocialGraphService } from '@/api/generated';
import { withSocialGraphTimeout } from '@/api/socialGraphPolicy';
import { relationshipKey, socialGraphScope, useSocialGraphConfig } from '@/hooks/useSocialGraph';
import websocket from '@/libs/WebSocketClient';
import type { Short } from './types';

/** Read only creators in the current feed, using the same cache as profiles.
 * Confirmed follow/unfollow and social-graph socket events update both surfaces.
 * No browser preference is ever treated as an on-chain relationship.
 */
export function useShortsSocial(feed: Short[], viewer: string, watchFollowing = false) {
  const policy = useSocialGraphConfig();
  const creators = [...new Set(feed.map((short) => short.creator))].filter((creator) => creator !== viewer);
  const contract = policy.data?.contract_address;
  const [revision, setRevision] = useState(0);
  const [network] = socialGraphScope();
  useEffect(() => {
    if (!watchFollowing || !viewer || !contract) return undefined;
    let active = true;
    const refresh = () => { if (active) setRevision((value) => value + 1); };
    const stopUpdates = websocket.subscribeForSocialGraphUpdates((event) => {
      if (event.network === network && event.contract === contract
        && (!event.accounts || event.accounts.includes(viewer))) refresh();
    });
    const stopConnection = websocket.subscribeForConnection(refresh);
    return () => { active = false; stopUpdates(); stopConnection(); };
  }, [watchFollowing, viewer, contract, network]);
  const queries = useQueries({
    queries: creators.map((creator) => ({
      queryKey: relationshipKey(viewer, creator, contract),
      queryFn: () => withSocialGraphTimeout(SocialGraphService.getSocialGraphRelationship({ from: viewer, to: creator })),
      enabled: !!viewer && !!contract,
      staleTime: 15_000,
      // A newly indexed Following candidate may have a fresh negative result
      // cached by the profile/For You view. Recheck when it enters the window.
      refetchOnMount: watchFollowing ? 'always' as const : true,
      retry: 1,
    })),
  });
  let status: 'disconnected' | 'loading' | 'error' | 'ready' = 'ready';
  if (!viewer) status = 'disconnected';
  else if (policy.isError || queries.some((query) => query.isError)) status = 'error';
  else if (policy.isPending || !contract || queries.some((query) => query.isPending)) status = 'loading';
  return {
    status,
    contract,
    revision,
    followed: viewer && contract ? creators.filter((_, index) => {
      const relation = queries[index].data;
      return relation?.a_follows_b && !relation.a_blocked_b && !relation.b_blocked_a;
    }) : [],
    retry: () => { policy.refetch(); queries.forEach((query) => query.refetch()); },
  };
}
