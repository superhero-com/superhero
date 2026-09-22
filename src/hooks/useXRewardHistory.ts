import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SuperheroApi } from '@/api/backend';
import { X_POSTING_REWARD_QUERY_KEY, xRewardHistoryQueryKey } from './useXPostingReward';

/** How often to look again while a payout is still on its way. */
export const X_REWARD_HISTORY_PENDING_POLL_MS = 20_000;

/**
 * Every X reward payout sent to `address`, newest first.
 *
 * Payouts are automatic, so while one is still on its way this keeps looking
 * until it lands, and the row flips to "Paid" on its own. That also refreshes
 * the reward status: reading the status is what moves an in-flight payout
 * forward on the server, so polling the history alone would be watching a
 * payout that nothing is advancing.
 */
export function useXRewardHistory(address: string | null | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: xRewardHistoryQueryKey(address),
    queryFn: () => SuperheroApi.getXPostingRewardHistory(address as string),
    enabled: Boolean(address),
    staleTime: 15_000,
    // An API from before this route 404s. One answer is enough; the section
    // stays hidden rather than retrying into the rate limit.
    retry: false,
  });

  const hasPending = Boolean(
    query.data?.items?.some((item) => item.status === 'pending'),
  );

  useEffect(() => {
    if (!address || !hasPending) return undefined;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [X_POSTING_REWARD_QUERY_KEY, address] });
      queryClient.invalidateQueries({ queryKey: xRewardHistoryQueryKey(address) });
    }, X_REWARD_HISTORY_PENDING_POLL_MS);
    return () => clearInterval(id);
  }, [address, hasPending, queryClient]);

  return query;
}
