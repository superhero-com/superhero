import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendminerApi } from '../../../api/backend';
import { emitTrade, onTrade } from '../../../libs/events';

export type TokenPerformance = {
  current_change_percent?: number;
};

export function useTokenPerformance(saleAddress?: string | null) {
  const queryClient = useQueryClient();

  const { data, isFetching, refetch } = useQuery<TokenPerformance | null>({
    queryKey: ['token-performance:24h', saleAddress],
    enabled: !!saleAddress,
    queryFn: async () => {
      if (!saleAddress) return null;
      const resp = await TrendminerApi.getTokenPerformance(saleAddress);
      return (resp as any)?.performance || resp || null;
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  // Subscribe to trade events; if the traded addresses include this saleAddress, refetch
  useEffect(() => {
    if (!saleAddress) return;
    const off = onTrade(({ addresses }) => {
      if (addresses.includes(saleAddress)) {
        queryClient.invalidateQueries({ queryKey: ['token-performance:24h', saleAddress] });
        refetch();
      }
    });
    return () => off();
  }, [saleAddress, queryClient, refetch]);

  return { performance: data, loading: isFetching };
}


