import { useQuery } from '@tanstack/react-query';
/* eslint-disable */
import { useMemo } from 'react';
import { DexService, DexTokenDto } from '../../../api/generated';
import { TokenListState } from '../types/dex';
import { DEX_ADDRESSES } from '../../../libs/dex';

export function useTokenList(): TokenListState {
  const { data, isLoading } = useQuery({
    queryKey: ['DexService.listAllDexTokens'],
    queryFn: () => DexService.listAllDexTokens({
      limit: 100,
      page: 1,
      orderBy: 'pairs_count',
      orderDirection: 'DESC',
    }),
  });

  const tokens = useMemo(() => [
    {
      address: 'AE', symbol: 'AE', name: 'AE', decimals: 18, is_ae: true,
    },
    ...(data?.items ?? []),
  ], [data]);

  return { tokens, loading: isLoading };
}
