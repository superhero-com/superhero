import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrendingTagMap } from '../hooks/useTrendingTagMap';
import { useTokenPerformance } from '../hooks/useTokenPerformance';
import { useQuery } from '@tanstack/react-query';
import { TrendminerApi } from '../../../api/backend';

export default function HashtagWithChange({ tag }: { tag: string }) {
  const clean = String(tag || '').replace(/^#/, '');
  const upper = clean.toUpperCase();
  const { map } = useTrendingTagMap();
  const mappedAddress = map[upper];

  // Fallback: if tag not in trending map, try to find exact token by name/symbol
  const { data: fallbackSaleAddress } = useQuery({
    queryKey: ['hashtag:resolve-token', upper],
    enabled: !mappedAddress && !!upper,
    queryFn: async () => {
      const resp: any = await TrendminerApi.listTokens({ search: clean, limit: 5 });
      const items: any[] = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : [];
      const match = items.find((t) =>
        String(t?.name || '').toUpperCase() === upper || String(t?.symbol || '').toUpperCase() === upper
      );
      return match?.sale_address || match?.address || null;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Secondary fallback: resolve via topic lookup, which often carries token mapping
  const { data: topicSaleAddress } = useQuery({
    queryKey: ['hashtag:topic-lookup', upper],
    enabled: !mappedAddress && !fallbackSaleAddress && !!upper,
    queryFn: async () => {
      const data: any = await TrendminerApi.getTopicByName(clean.toLowerCase());
      const token = (data && (data.token || data?.items?.[0]?.token)) || null;
      return token?.sale_address || token?.address || null;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const saleAddress = mappedAddress || topicSaleAddress || fallbackSaleAddress || undefined;
  const { performance } = useTokenPerformance(saleAddress, upper);

  const change = performance?.current_change_percent;
  const sign = (change ?? 0) > 0 ? '+' : '';
  const isUp = (change ?? 0) > 0;
  const isDown = (change ?? 0) < 0;
  const formatted = useMemo(() => {
    if (change == null) return null;
    if (change === 0) return '0%';
    const abs = Math.abs(change);
    const precision = abs >= 1 ? 1 : abs < 0.01 ? 3 : 2;
    return `${sign}${abs.toFixed(precision)}%`;
  }, [change, sign]);

  const linkTo = `/trends/tokens/${upper}`;

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <Link
        to={linkTo}
        className="text-white/90 hover:text-white underline-offset-2 hover:underline break-words"
        onClick={(e) => e.stopPropagation()}
      >
        #{clean}
      </Link>
      {saleAddress && formatted && (
        <span
          className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none tracking-tighter ${
            isUp
              ? 'bg-green-400/10 text-green-400 border border-green-400/20'
              : isDown
              ? 'bg-red-400/10 text-red-400 border border-red-400/20'
              : 'bg-white/10 text-white/60 border border-white/20'
          }`}
          title="24h change"
          aria-label={`24h change: ${formatted}`}
        >
          {formatted}
        </span>
      )}
    </span>
  );
}


