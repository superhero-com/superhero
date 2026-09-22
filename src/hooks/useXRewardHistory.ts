import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SuperheroApi } from '@/api/backend';
import { X_POSTING_REWARD_QUERY_KEY, xRewardHistoryQueryKey } from './useXPostingReward';

/** How often to look again while a payout is still on its way. */
export const X_REWARD_HISTORY_PENDING_POLL_MS = 20_000;

/**
 * How often to look again while a failed payout waits for its retry. Slower:
 * the API spaces retries out (30s doubling to an hour), so there is less to
 * catch, and a read before the retry is due costs the server one row lookup.
 */
export const X_REWARD_HISTORY_RETRY_POLL_MS = 60_000;

/**
 * Every X reward payout sent to `address`, newest first.
 *
 * Payouts are automatic, so while one is still on its way (or waiting for its
 * automatic retry) this keeps looking until it lands, and the row flips to
 * "Paid" on its own. That also refreshes
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

  const items = query.data?.items ?? [];
  const hasPending = items.some((item) => item.status === 'pending');
  // A failed send is retried automatically and shows as "Retrying", so it is
  // still moving too. Left out, the row stayed on "Retrying" after the retry
  // had already paid, until the next reload.
  const hasRetrying = items.some((item) => item.status === 'failed');
  const pollMs = (hasPending && X_REWARD_HISTORY_PENDING_POLL_MS)
    || (hasRetrying && X_REWARD_HISTORY_RETRY_POLL_MS)
    || null;

  useEffect(() => {
    if (!address || !pollMs) return undefined;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [X_POSTING_REWARD_QUERY_KEY, address] });
      queryClient.invalidateQueries({ queryKey: xRewardHistoryQueryKey(address) });
    }, pollMs);
    return () => clearInterval(id);
  }, [address, pollMs, queryClient]);

  return query;
}
