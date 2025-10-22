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
      // 1) Try performance for provided address
      const resp = await TrendminerApi.getTokenPerformance(saleAddress).catch(() => null);
      const perf = (resp as any)?.performance || resp || null;
      if (perf && typeof (perf as any)?.current_change_percent === 'number') {
        return perf as TokenPerformance;
      }
      // 2) Fallback: resolve canonical token and retry with its sale/address
      const token: any = await TrendminerApi.getToken(saleAddress).catch(() => null);
      const alt = token?.sale_address || token?.address;
      if (alt && alt !== saleAddress) {
        const resp2 = await TrendminerApi.getTokenPerformance(alt).catch(() => null);
        const perf2 = (resp2 as any)?.performance || resp2 || null;
        if (perf2 && typeof (perf2 as any)?.current_change_percent === 'number') {
          return perf2 as TokenPerformance;
        }
      }
      return perf as TokenPerformance | null;
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


