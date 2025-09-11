import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import Sparkline from './Sparkline';

type Timeframe = '30D' | '7D' | '1D';

type Props = {
  address?: string | null;
  timeframe?: Timeframe;
  width?: number;
  height?: number;
  stroke?: string;
};

// Small LRU cache for mini chart series
class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly max: number) {}
  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (typeof v !== 'undefined') {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      // delete least-recently used (first inserted)
      const first = this.map.keys().next().value as K;
      this.map.delete(first);
    }
  }
}

const cache = new LruCache<string, number[]>(200);

function intervalFor(timeframe: Timeframe = '30D'): number {
  switch (timeframe) {
    case '1D':
      return 60 * 15; // 15m candles
    case '7D':
      return 60 * 60; // 1h candles
    case '30D':
    default:
      return 60 * 60 * 4; // 4h candles
  }
}

export default function TokenMiniChart({
  address,
  timeframe = '30D',
  width = 120,
  height = 28,
  stroke = '#ff6d15',
}: Props) {
  const [points, setPoints] = useState<number[] | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const cacheKey = useMemo(() => `${address || ''}|${timeframe}`, [address, timeframe]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!address) return;
      const cached = cache.get(cacheKey);
      if (cached) {
        setPoints(cached);
        return;
      }
      try {
        const resp = await TrendminerApi.getTokenHistory(address, {
          interval: intervalFor(timeframe),
          convertTo: 'ae',
          limit: 50,
          page: 1,
        } as any);
        const items = Array.isArray(resp?.pages) ? resp.pages.flat() : (Array.isArray(resp) ? resp : []);
        const series: number[] = items
          .map((it: any) => Number(it?.quote?.close ?? it?.quote?.price ?? 0))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        const clipped = series.slice(-50);
        cache.set(cacheKey, clipped);
        if (!cancel) setPoints(clipped);
      } catch {
        if (!cancel) setPoints([]);
      }
    }
    if (visible) load();
    return () => { cancel = true; };
  }, [address, timeframe, cacheKey, visible]);

  return (
    <div ref={ref} className="flex items-center justify-end" style={{ width, height }}>
      {points ? (
        <Sparkline points={points.length ? points : [0, 0]} width={width} height={height} stroke={stroke} />
      ) : (
        <div 
          className="bg-gradient-to-r from-black/6 to-black/2 rounded-md" 
          style={{ width, height }} 
        />
      )}
    </div>
  );
}


