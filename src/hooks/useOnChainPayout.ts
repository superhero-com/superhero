import { useQuery } from '@tanstack/react-query';
import { fetchOnChainPayout } from '@/utils/onChainPayout';

/** How often to look again at a payout that is on-chain but not yet in a block. */
export const ON_CHAIN_PAYOUT_UNMINED_POLL_MS = 20_000;

/** How often to look again when neither the middleware nor the node knew the hash. */
export const ON_CHAIN_PAYOUT_MISS_POLL_MS = 30_000;

/**
 * Reads a miss is given before the row settles on the API data for the
 * session: about five minutes, which covers indexer lag and a short outage
 * without polling forever for a hash that will never resolve.
 */
export const ON_CHAIN_PAYOUT_MISS_MAX_READS = 10;

/**
 * One reward payout as the blockchain records it, so the history can show the
 * amount and time the chain holds rather than only what our API says.
 *
 * A mined transaction never changes, so once one is read it is kept for the
 * session. One still waiting for a block is read again until it lands. A miss
 * (null: neither source answered, or neither has indexed the hash yet) is
 * read again too, for a while. Kept as final it pinned a payout that was
 * simply too new, or caught during a blip, to the API's estimate for good.
 */
export function useOnChainPayout(
  txHash: string | null | undefined,
  recipient: string | null | undefined,
) {
  return useQuery({
    queryKey: ['onChainPayout', txHash, recipient],
    queryFn: () => fetchOnChainPayout(txHash as string, recipient as string),
    enabled: Boolean(txHash?.startsWith('th_') && recipient),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchInterval: (query) => {
      const { data, dataUpdateCount } = query.state;
      if (data && !data.mined) return ON_CHAIN_PAYOUT_UNMINED_POLL_MS;
      if (data === null && dataUpdateCount < ON_CHAIN_PAYOUT_MISS_MAX_READS) {
        return ON_CHAIN_PAYOUT_MISS_POLL_MS;
      }
      return false;
    },
  });
}
