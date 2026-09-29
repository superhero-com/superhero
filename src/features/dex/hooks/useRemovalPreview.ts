import { useQuery } from '@tanstack/react-query';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { CONFIG } from '../../../config';
import { getPairInfo, initDexContracts } from '../../../libs/dex';
import type { LiquidityPosition } from '../types/pool';

export function useRemovalPreview(position: LiquidityPosition | null, connected: boolean) {
  const { sdk } = useAeSdk();
  const tokenA = position?.token0;
  const tokenB = position?.token1;
  const enabled = !!sdk && connected && !!tokenA && !!tokenB && tokenA !== tokenB;
  const query = useQuery({
    queryKey: ['liquidity-reserves', CONFIG.DEX_FACTORY, tokenA, tokenB],
    queryFn: async () => {
      const { factory } = await initDexContracts(sdk);
      return getPairInfo(sdk, factory, tokenA!, tokenB!, true);
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
  else if (!query.data || query.data.pairAddress !== position?.pair.address
    || !query.data.totalSupply || query.data.totalSupply <= 0n
    || query.data.reserveA <= 0n || query.data.reserveB <= 0n) status = 'error';
  return { status, pool: status === 'ready' ? query.data : undefined, refetch: query.refetch };
}
