import { useQuery } from '@tanstack/react-query';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { CONFIG } from '../../../config';
import { getPairInfo, initDexContracts } from '../../../libs/dex';
import type { AddLiquidityState } from '../types/pool';
import { liquidityEstimate } from '../utils/liquidityEstimate';

export function useLiquidityPreview(state: AddLiquidityState) {
  const { sdk } = useAeSdk();
  const tokenA = state.tokenA === 'AE' ? CONFIG.DEX_WAE : state.tokenA;
  const tokenB = state.tokenB === 'AE' ? CONFIG.DEX_WAE : state.tokenB;
  const enabled = !!sdk && !!tokenA && !!tokenB && tokenA !== tokenB;
  const query = useQuery({
    queryKey: ['liquidity-reserves', CONFIG.DEX_FACTORY, tokenA, tokenB],
    queryFn: async () => {
      const { factory } = await initDexContracts(sdk);
      return getPairInfo(sdk, factory, tokenA, tokenB, true);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
  let status: 'idle' | 'loading' | 'error' | 'ready' = 'ready';
  if (!enabled) status = 'idle';
  else if (query.isError) status = 'error';
  else if (query.isPending) status = 'loading';
  return {
    status,
    pairExists: !!query.data && query.data.reserveA > 0n && query.data.reserveB > 0n,
    preview: status === 'ready' ? liquidityEstimate(state, query.data ?? null) : null,
    refetch: query.refetch,
  };
}
