import { useQuery } from '@tanstack/react-query';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { CONFIG } from '../../../config';
import { fetchPairReserves, initDexContracts } from '../../../libs/dex';
import { referenceRatio } from '../utils/liquidityEstimate';

/**
 * For a pair that has no pool yet, suggest a starting ratio from both tokens'
 * on-chain WAE pools, the same way a swap between them would be routed.
 */
export function useReferenceRatio(
  tokenA: string,
  tokenB: string,
  decA: number,
  decB: number,
  enabled: boolean,
) {
  const { sdk } = useAeSdk();
  const a = tokenA === 'AE' ? CONFIG.DEX_WAE : tokenA;
  const b = tokenB === 'AE' ? CONFIG.DEX_WAE : tokenB;
  const query = useQuery({
    queryKey: ['liquidity-reference-ratio', CONFIG.DEX_FACTORY, a, b],
    queryFn: async () => {
      const { factory } = await initDexContracts(sdk);
      const [legA, legB] = await Promise.all([
        fetchPairReserves(sdk, factory, a, CONFIG.DEX_WAE),
        fetchPairReserves(sdk, factory, b, CONFIG.DEX_WAE),
      ]);
      return { legA, legB };
    },
    enabled: enabled && !!sdk && !!a && !!b && a !== b
      && a !== CONFIG.DEX_WAE && b !== CONFIG.DEX_WAE,
    staleTime: 15_000,
    retry: 1,
  });
  return query.data ? referenceRatio(query.data.legA, query.data.legB, decA, decB) : undefined;
}
