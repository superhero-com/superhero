import { useQuery } from '@tanstack/react-query';
import type { PairDto } from '@/api/generated';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { getPairState } from '../../../libs/dex';
import { alignPairWithChain } from '../utils/poolStatsValues';

/**
 * Pair data with reserves, token order and LP supply read from the pair contract.
 * Falls back to the indexed pair (aligned = null) while loading or if the read fails.
 */
export function usePairChainState(pair?: PairDto) {
  const { sdk } = useAeSdk();
  const address = pair?.address;
  const query = useQuery({
    queryKey: ['dex-pair-chain-state', address],
    queryFn: () => getPairState(sdk, address!),
    enabled: !!sdk && !!address,
    staleTime: 15_000,
    retry: 1,
  });
  return pair ? alignPairWithChain(pair, query.data) : null;
}
