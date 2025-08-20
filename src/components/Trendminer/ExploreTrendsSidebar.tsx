import React, { useEffect, useMemo, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import MobileInput from '../MobileInput';
import MobileCard from '../MobileCard';
import './ExploreTrendsSidebar.scss';

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
    <div className="explore-trends-sidebar mobile-container">
      <div className="explore-trends-header">
        <h2 className="explore-trends-title">Explore Trends</h2>
        
        <div className="explore-trends-controls">
          <select
            aria-label="Order by"
            className="explore-trends-select"
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
            className="explore-trends-search"
          />
        </div>
      </div>

      {loading && (
        <div className="explore-trends-loading">
          <div className="loading-spinner" />
          <span>Loading trends...</span>
        </div>
      )}
      
      {error && (
        <div className="explore-trends-error">
          {error}
        </div>
      )}

      <div className="explore-trends-list">
        {filtered.slice(0, 12).map((it) => {
          const tok = tagTokenMap[it.tag];
          return (
            <MobileCard
              key={it.tag}
              variant="elevated"
              padding="medium"
              clickable
              className="trend-item-card"
            >
              <div className="trend-item-header">
                <h3 className="trend-item-tag">{it.tag.toUpperCase()}</h3>
                <div className="trend-item-score">
                  <span className="score-icon">↑</span>
                  <span className="score-value">{it.score.toLocaleString()}</span>
                </div>
              </div>

              <div className="trend-item-details">
                {it.source && (
                  <a
                    href={`https://x.com/search?q=${encodeURIComponent('#' + it.tag)}&src=typed_query`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="trend-item-source"
                    onClick={(e) => e.stopPropagation()}
                  >
                    via {it.source}
                  </a>
                )}
                
                {tok ? (
                  <div className="trend-item-token-info">
                    <div className="token-price">
                      Price: {normalizeAe(Number(tok.price ?? 0)).toFixed(6)} AE
                    </div>
                    <div className="token-holders">
                      Holders: {tok.holders_count ?? 0}
                    </div>
                    <a 
                      href={`/trendminer/tokens/${encodeURIComponent(tok.name || tok.address)}`} 
                      className="trend-item-view-btn"
                    >
                      View Token
                    </a>
                  </div>
                ) : (
                  <a
                    href={`/trendminer/create?new=${encodeURIComponent(it.tag)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="trend-item-tokenize-btn"
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


