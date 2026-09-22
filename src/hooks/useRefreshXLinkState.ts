import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X_POSTING_REWARD_QUERY_KEY } from './useXPostingReward';

/**
 * Mined is not indexed. The transaction poll confirms a link or unlink against
 * the node, but the profile and reward status are read from the backend, which
 * learns about it from its own indexer a few seconds later. Refetching only at
 * the moment of confirmation would often read the old state — the stale view
 * these flows exist to avoid — so refetch again as the indexer catches up.
 * Invalidating an unmounted query is free; a mounted one just refetches.
 */
export const X_LINK_INDEXER_CATCHUP_DELAYS_MS = [4_000, 12_000];

/**
 * Refreshes everything that shows whether an address has X linked: the
 * profile, the account record, and the reward status — which the feed and
 * rewards cards read isXLinked from, not the profile. Call it when a link or
 * unlink transaction confirms.
 */
export function useRefreshXLinkState() {
  const queryClient = useQueryClient();

  return useCallback((address: string) => {
    const invalidate = () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', address] }),
      queryClient.invalidateQueries({ queryKey: ['AccountsService.getAccount', address] }),
      queryClient.invalidateQueries({ queryKey: [X_POSTING_REWARD_QUERY_KEY] }),
    ]);
    invalidate();
    X_LINK_INDEXER_CATCHUP_DELAYS_MS.forEach((ms) => { setTimeout(invalidate, ms); });
  }, [queryClient]);
}
