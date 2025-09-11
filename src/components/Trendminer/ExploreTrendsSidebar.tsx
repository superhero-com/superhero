import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { TrendminerApi } from '../../api/backend';
import MobileInput from '../MobileInput';
import MobileCard from '../MobileCard';

type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
};

type TrendingTag = { tag: string; score: number; source?: string };

export default function ExploreTrendsSidebar() {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, TokenItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<'score' | 'created_at'>('score');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.listTrendingTags({ orderBy, orderDirection: 'DESC', limit: 50 });
        const items = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        const mapped: TrendingTag[] = items.map((it: any) => ({
          tag: it.tag ?? it.name ?? '',
          score: Number(it.score ?? it.value ?? 0),
          source: it.source || it.platform || undefined,
        }));
        if (!cancelled) setTags(mapped.filter((t) => t.tag));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load trending tags');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orderBy]);

  // Fetch token info for top tags so we can show quick actions
  useEffect(() => {
    let cancelled = false;
    async function checkTags() {
      const top = tags.slice(0, 20);
      const results = await Promise.allSettled(top.map(async (t) => {
        try {
          const tok: any = await TrendminerApi.getToken(t.tag);
          return [t.tag, tok] as const;
        } catch {
          return [t.tag, null] as const;
        }
      }));
      if (cancelled) return;
      const map: Record<string, TokenItem> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value && r.value[1]) {
          const [tag, tok] = r.value as any;
          map[tag] = tok;
        }
      });
      setTagTokenMap(map);
    }
    if (tags.length) checkTags();
    return () => { cancelled = true; };
  }, [tags]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.tag.toLowerCase().includes(q));
  }, [tags, search]);

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-md sm:max-w-full sm:gap-4 xs:gap-3">
      <div className="flex flex-col gap-4 sm:gap-3">
        <h2 className="text-2xl font-bold text-[var(--primary-color)] m-0 sm:text-xl xs:text-lg">
          Explore Trends
        </h2>
        
        <div className="flex flex-col gap-3 sm:gap-2.5 md:flex-row md:items-center">
          <select
            aria-label="Order by"
            className="px-4 py-3 rounded-xl border border-black/12 bg-[var(--background-color)] text-[var(--primary-color)] text-sm font-medium cursor-pointer transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)] hover:border-black/20 sm:py-3.5 sm:text-base md:w-auto md:min-w-35"
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value as any)}
          >
            <option value="score">Most Trending</option>
            <option value="created_at">Latest</option>
          </select>
          
          <MobileInput
            placeholder="Search trends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="medium"
            variant="filled"
            className="w-full md:flex-1"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 p-5 text-[var(--light-font-color)] text-sm">
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span>Loading trends...</span>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-2.5">
        {filtered.slice(0, 12).map((it) => {
          const tok = tagTokenMap[it.tag];
          return (
            <MobileCard
              key={it.tag}
              variant="elevated"
              padding="medium"
              clickable
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] active:translate-y-0"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-2.5">
                <h3 className="text-base font-bold text-[var(--primary-color)] m-0 sm:text-[15px]">
                  {it.tag.toUpperCase()}
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full text-xs font-semibold text-green-500 sm:px-3 sm:py-2 sm:text-xs">
                  <span className="text-sm">↑</span>
                  <span>{it.score.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:gap-1.5">
                {it.source && (
                  <a
                    href={`https://x.com/search?q=${encodeURIComponent('#' + it.tag)}&src=typed_query`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--light-font-color)] no-underline opacity-75 transition-opacity duration-200 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    via {it.source}
                  </a>
                )}
                
                {tok ? (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-black/8 sm:gap-1 sm:pt-1.5">
                    <div className="text-xs text-[var(--light-font-color)] sm:text-xs">
                      Price: {normalizeAe(Number(tok.price ?? 0)).toFixed(6)} AE
                    </div>
                    <div className="text-xs text-[var(--light-font-color)] sm:text-xs">
                      Holders: {tok.holders_count ?? 0}
                    </div>
                    <a 
                      href={`/trendminer/tokens/${encodeURIComponent(tok.name || tok.address)}`} 
                      className="inline-block px-4 py-2 bg-blue-500 text-white no-underline rounded-lg text-xs font-semibold text-center transition-all duration-200 mt-1 hover:bg-blue-600 hover:-translate-y-0.25 active:translate-y-0 sm:px-4 sm:py-2.5 sm:text-sm sm:min-h-11 sm:flex sm:items-center sm:justify-center"
                    >
                      View Token
                    </a>
                  </div>
                ) : (
                  <a
                    href={`/trendminer/create?new=${encodeURIComponent(it.tag)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block px-4 py-2 bg-transparent text-blue-500 no-underline border border-blue-500/30 rounded-lg text-xs font-semibold text-center transition-all duration-200 mt-1 hover:bg-blue-500/10 hover:border-blue-500 hover:-translate-y-0.25 active:translate-y-0 sm:px-4 sm:py-2.5 sm:text-sm sm:min-h-11 sm:flex sm:items-center sm:justify-center"
                  >
                    Create Token
                  </a>
                )}
              </div>
            </MobileCard>
          );
        })}
      </div>
    </div>
  );
}


