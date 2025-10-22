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
  const colorClass = isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-white/60';
  const arrow = isUp ? '▲' : isDown ? '▼' : '•';
  const formatted = useMemo(() => {
    if (change == null) return null;
    const abs = Math.abs(change);
    const precision = abs < 0.01 ? 3 : 2;
    return `${sign}${abs.toFixed(precision)}%`;
  }, [change, sign]);

  const linkTo = `/trends/tokens/${upper}`;

  return (
    <span className="inline-flex items-center align-middle">
      <Link
        to={linkTo}
        className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
        onClick={(e) => e.stopPropagation()}
      >
        #{clean}
      </Link>
      {saleAddress && formatted && (
        <span
          className={`ml-1 inline-flex items-center gap-1 text-[11px] ${colorClass}`}
          title="24h change"
          aria-label={`24h change: ${formatted}`}
        >
          <span className="leading-none">{arrow}</span>
          <span className="leading-none font-medium">{formatted}</span>
        </span>
      )}
    </span>
  );
}


