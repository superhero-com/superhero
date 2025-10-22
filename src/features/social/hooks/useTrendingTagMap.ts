import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendminerApi } from '../../../api/backend';

type TrendingTagItem = {
  tag: string;
  token?: { sale_address?: string; address?: string } | null;
};

export type TagToSaleAddressMap = Record<string, string>;

export function useTrendingTagMap() {
  const { data } = useQuery({
    queryKey: ['trending-tags:list'],
    queryFn: async () => {
      const resp = await TrendminerApi.listTrendingTags({ orderBy: 'score', orderDirection: 'DESC', limit: 200 });
      const items: TrendingTagItem[] = Array.isArray((resp as any)?.items)
        ? (resp as any).items
        : Array.isArray(resp)
          ? (resp as any)
          : [];
      return items;
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  const map: TagToSaleAddressMap = useMemo(() => {
    const out: TagToSaleAddressMap = {};
    (data || []).forEach((it) => {
      const key = String(it.tag || '').toUpperCase();
      // Prefer token contract address over sale address for performance endpoint
      const tokenAddress = it?.token?.address || it?.token?.sale_address || '';
      if (key && tokenAddress) out[key] = tokenAddress;
    });
    return out;
  }, [data]);

  return { map };
}


