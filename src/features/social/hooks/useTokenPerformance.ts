import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendminerApi } from '../../../api/backend';
import { TokensService } from '../../../api/generated';
import { emitTrade, onTrade } from '../../../libs/events';

export type TokenPerformance = {
  current_change_percent?: number;
};

function mapToCurrent24h(resp: any): TokenPerformance | null {
  if (!resp) return null;
  // Support both TokenPriceMovementDto shape and legacy flat shape
  const percent =
    // Newer shape: nested under past_24h.price_change.percentage (string)
    (resp?.past_24h?.price_change?.percentage != null
      ? parseFloat(String(resp?.past_24h?.price_change?.percentage))
      : undefined) ??
    // Alternative nested numeric field
    (typeof resp?.past_24h?.current_change_percent === 'number'
      ? resp?.past_24h?.current_change_percent
      : undefined) ??
    // Flat legacy field
    (typeof resp?.current_change_percent === 'number'
      ? resp?.current_change_percent
      : undefined);
  return typeof percent === 'number' ? { current_change_percent: percent } : null;
}

export function useTokenPerformance(saleAddress?: string | null, symbolUpper?: string | null) {
  const queryClient = useQueryClient();

  const { data, isFetching, refetch } = useQuery<TokenPerformance | null>({
    queryKey: ['token-performance:24h', saleAddress, symbolUpper],
    enabled: !!(saleAddress || symbolUpper),
    queryFn: async () => {
      if (!saleAddress && !symbolUpper) return null;
      // Prefer fast generated endpoint (symbol or address)
      const directAddr = (symbolUpper || saleAddress)!;
      const direct = await TokensService.performance({ address: directAddr }).catch(() => null);
      console.log(`[useTokenPerformance] Symbol: ${symbolUpper}, Address: ${saleAddress}`);
      console.log(`[useTokenPerformance] Raw response for ${directAddr}:`, JSON.stringify(direct, null, 2));
      const perfDirect = mapToCurrent24h(direct);
      console.log(`[useTokenPerformance] Mapped perfDirect:`, perfDirect);

      // Also resolve canonical token via generated API and try again, then choose best
      const tokenResolved = await TokensService.findByAddress({ address: directAddr }).catch(() => null);
      console.log(`[useTokenPerformance] Resolved token:`, tokenResolved);
      const altAddr = (tokenResolved as any)?.sale_address || (tokenResolved as any)?.address;
      let perfAlt: TokenPerformance | null = null;
      if (altAddr && altAddr !== saleAddress) {
        const altResp = await TokensService.performance({ address: altAddr }).catch(() => null);
        console.log(`[useTokenPerformance] Alt response for ${altAddr}:`, JSON.stringify(altResp, null, 2));
        perfAlt = mapToCurrent24h(altResp);
        console.log(`[useTokenPerformance] Mapped perfAlt:`, perfAlt);
      }

      // Fallback to TrendminerApi (legacy/custom client)
      let perfLegacy: TokenPerformance | null = null;
      if (!perfDirect && !perfAlt) {
        const resp = await TrendminerApi.getTokenPerformance(saleAddress).catch(() => null);
        perfLegacy = mapToCurrent24h((resp as any)?.performance || resp || null);
      }

      // Pick non-null with the largest absolute percentage (guards against 0% from wrong address)
      const candidates = [perfDirect, perfAlt, perfLegacy].filter(Boolean) as TokenPerformance[];
      console.log(`[useTokenPerformance] All candidates:`, candidates);
      if (candidates.length) {
        candidates.sort((a, b) => Math.abs((b.current_change_percent ?? 0)) - Math.abs((a.current_change_percent ?? 0)));
        console.log(`[useTokenPerformance] Selected:`, candidates[0]);
        return candidates[0];
      }
      console.log(`[useTokenPerformance] No candidates found, returning null`);
      return null;
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  // Subscribe to trade events; if the traded addresses include this saleAddress, refetch
  useEffect(() => {
    if (!saleAddress && !symbolUpper) return;
    const off = onTrade(({ addresses }) => {
      if ((saleAddress && addresses.includes(saleAddress)) || (symbolUpper && addresses.includes(symbolUpper))) {
        queryClient.invalidateQueries({ queryKey: ['token-performance:24h', saleAddress, symbolUpper] });
        refetch();
      }
    });
    return () => off();
  }, [saleAddress, symbolUpper, queryClient, refetch]);

  return { performance: data, loading: isFetching };
}


