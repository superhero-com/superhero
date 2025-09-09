import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DexService, DexTokenDto } from '../../../api/generated';
import { TokenListState } from '../types/dex';
import { DEX_ADDRESSES } from '../../../libs/dex';

export function useTokenList(): TokenListState {
  const { data, isLoading } = useQuery({
    queryKey: ['DexService.listAllDexTokens'],
    queryFn: () => {
      return DexService.listAllDexTokens({
        limit: 100,
        page: 1,
        orderBy: 'pairs_count',
        orderDirection: 'DESC',
      });
    },
  })

  const tokens = useMemo(() => [
    ...(data?.items ?? []).map((t) => {
      if (t.address === DEX_ADDRESSES.wae) {
        return { ...t, symbol: 'AE', name: 'AE' };
      }

      return t
    })
  ], [data]);


  return { tokens, loading: isLoading };
}
