import React, { useEffect, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import MobileCard from '../MobileCard';
import './TrendingPillsCarousel.scss';

type TrendingTag = {
  tag: string;
  score: number;
  source?: string;
};

type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
};

interface TrendingPillsCarouselProps {
  tagTokenMap?: Record<string, TokenItem>;
}

export default function TrendingPillsCarousel({ tagTokenMap = {} }: TrendingPillsCarouselProps) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.listTrendingTags({ 
          orderBy: 'score', 
          orderDirection: 'DESC', 
          limit: 50 
        });
        const items = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        const mapped: TrendingTag[] = items.map((it: any) => ({ 
          tag: it.tag ?? it.name ?? '', 
          score: Number(it.score ?? it.value ?? 0), 
          source: it.source || it.platform || undefined 
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
  }, []);

  if (loading) {
    return (
      <div className="trending-pills-carousel">
        <div className="carousel-container">
          <div className="loading-pills">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="pill-skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tags.length) {
    return null;
  }

      const loop = [...tags, ...tags];
    // Faster rotation - reduced duration
    const durationSec = Math.max(3, tags.length*2);

  return (
    <div className="trending-pills-carousel">
      <div className="carousel-container">
        <div className="carousel-track" style={{ animationDuration: `${durationSec}s` }}>
          {loop.map((tag, index) => {
            // Check if this tag has a tokenized version
            const hasToken = tagTokenMap && tagTokenMap[tag.tag];
            return (
              <a
                key={`${tag.tag}-${index}`}
                href={hasToken ? `/trendminer/tokens/${encodeURIComponent(tag.tag)}` : `/trendminer/create?new=${encodeURIComponent(tag.tag)}`}
                className={`trending-pill ${hasToken ? 'tokenized' : 'not-tokenized'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="pill-text">#{tag.tag}</span>
                {!hasToken && <span className="pill-cta">Tokenize Now</span>}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
