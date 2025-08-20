import React, { useEffect, useMemo, useState } from 'react';
import AeButton from '../AeButton';
import { TrendminerApi } from '../../api/backend';
import './TrendingSidebar.scss';

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

  return (
    <div className="genz-card trending-sidebar-card">
      <div className="sidebar-header">
        <div className="sidebar-title-wrap">
          <span className="sidebar-icon">🔥</span>
          <h4 className="sidebar-title">Explore Trends</h4>
        </div>
        <div className="sidebar-controls">
          <select aria-label="Order by" className="sidebar-select" value={orderBy} onChange={(e) => setOrderBy(e.target.value as any)}>
            <option value="score">Most Trending</option>
            <option value="created_at">Latest</option>
          </select>
          <input
            aria-label="Search trends"
            placeholder="Search trends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sidebar-input"
          />
        </div>
      </div>

      {loading && <div className="sidebar-state muted">Loading…</div>}
      {error && <div className="sidebar-state error">{error}</div>}

      <div className="sidebar-list">
        {filtered.slice(0, 12).map((it) => {
          const tok = tagTokenMap[it.tag];
          return (
            <div key={it.tag} className="sidebar-item">
              <div className="item-name">#{it.tag.toUpperCase()}</div>
              <div className="item-details">
                {!tok && (
                  <>
                    <span className="score">↑ {it.score.toLocaleString()}</span>
                    {it.source && (
                      <a
                        href={`https://x.com/search?q=${encodeURIComponent('#' + it.tag)}&src=typed_query`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="source-link"
                      >
                        via {it.source}
                      </a>
                    )}
                  </>
                )}
                {tok ? (
                  <>
                    <span className="metric">{normalizeAe(Number(tok.price ?? 0)).toFixed(6)} AE</span>
                    <span className="metric">Holders: {tok.holders_count ?? 0}</span>
                    <AeButton
                      variant="accent"
                      size="xs"
                      outlined
                      onClick={() => window.location.href = `/trendminer/tokens/${encodeURIComponent(tok.name || tok.address)}`}
                      className="view-btn"
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
                    className="tokenize-btn"
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


