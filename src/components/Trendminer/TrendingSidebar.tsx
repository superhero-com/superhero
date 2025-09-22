import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import AeButton from '../AeButton';
import { TrendminerApi } from '../../api/backend';
import configs from '../../configs';
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

export default function TrendingSidebar() {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, TokenItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<'score' | 'created_at'>('score');
  const [search, setSearch] = useState('');

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

  // Fetch token info for top tags
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

  if (!configs.features.trendminer) return null;
  return (
    <div className="p-3.5 bg-[var(--glass-bg,rgba(255,255,255,0.05))] border border-[var(--glass-border,rgba(255,255,255,0.1))] rounded-2xl shadow-[var(--glass-shadow,0_8px_32px_rgba(0,0,0,0.1))] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base filter drop-shadow-[0_0_8px_rgba(255,107,107,0.5)]">🔥</span>
          <h4 className="m-0 text-base font-extrabold bg-gradient-to-r from-[var(--neon-pink)] to-[var(--custom-links-color)] bg-clip-text text-transparent">
            Explore Trends
          </h4>
        </div>
        <div className="flex gap-2">
          <select 
            aria-label="Order by" 
            className="px-3 py-2 rounded-full border border-white/16 bg-white/4 text-[var(--standard-font-color)] text-xs"
            value={orderBy} 
            onChange={(e) => setOrderBy(e.target.value as any)}
          >
            <option value="score">Most Trending</option>
            <option value="created_at">Latest</option>
          </select>
          <input
            aria-label="Search trends"
            placeholder="Search trends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-full border border-white/16 bg-white/4 text-[var(--standard-font-color)] text-xs placeholder:text-[var(--light-font-color)] placeholder:opacity-80"
          />
        </div>
      </div>

      {loading && (
        <div className="p-2 text-xs rounded-lg opacity-80">
          Loading…
        </div>
      )}
      {error && (
        <div className="p-2 text-xs rounded-lg text-red-400 bg-red-500/8 border border-red-500/25">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        {filtered.slice(0, 12).map((it) => {
          const tok = tagTokenMap[it.tag];
          return (
            <div key={it.tag} className="flex justify-between items-center border border-white/12 bg-white/4 rounded-xl p-2.5 min-w-0">
              <div className="font-extrabold text-[var(--standard-font-color)] text-shadow-[0_0_8px_rgba(78,205,196,0.25)] overflow-hidden text-ellipsis whitespace-nowrap">
                #{it.tag.toUpperCase()}
              </div>
              <div className="flex gap-2 items-center flex-shrink-0 overflow-hidden">
                {!tok && (
                  <>
                    <span className="text-[var(--neon-pink)] font-bold text-xs">
                      ↑ {it.score.toLocaleString()}
                    </span>
                    {it.source && (
                      <a
                        href={`https://x.com/search?q=${encodeURIComponent('#' + it.tag)}&src=typed_query`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[var(--custom-links-color)] no-underline text-xs"
                      >
                        via {it.source}
                      </a>
                    )}
                  </>
                )}
                {tok ? (
                  <>
                    <span className="text-[var(--neon-teal)] font-bold text-xs">
                      {normalizeAe(Number(tok.price ?? 0)).toFixed(6)} AE
                    </span>
                    <span className="text-[var(--neon-teal)] font-bold text-xs">
                      Holders: {tok.holders_count ?? 0}
                    </span>
                    <AeButton
                      variant="accent"
                      size="xs"
                      outlined
                      onClick={() => window.location.href = `/trendminer/tokens/${encodeURIComponent(tok.name || tok.address)}`}
                      className="ml-2"
                    >
                      View
                    </AeButton>
                  </>
                ) : (
                  <AeButton
                    variant="accent"
                    size="xs"
                    rounded
                    onClick={() => window.location.href = `/trendminer/create?new=${encodeURIComponent(it.tag)}`}
                    className="ml-2 px-2 py-0.5 rounded-full text-[10px]"
                  >
                    Tokenize
                  </AeButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


