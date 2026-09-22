import { useQuery } from '@tanstack/react-query';
import { fetchOnChainPayout } from '@/utils/onChainPayout';

/** How often to look again at a payout that is on-chain but not yet in a block. */
export const ON_CHAIN_PAYOUT_UNMINED_POLL_MS = 20_000;

/**
 * One reward payout as the blockchain records it, so the history can show the
 * amount and time the chain holds rather than only what our API says.
 *
 * A mined transaction never changes, so once one is read it is kept for the
 * session. One still waiting for a block is read again until it lands.
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
    refetchInterval: (query) => (
      query.state.data && !query.state.data.mined ? ON_CHAIN_PAYOUT_UNMINED_POLL_MS : false
    ),
  });
}
