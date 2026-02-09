import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import { SuperheroApi } from '../../api/backend';
import './TrendingPillsCarousel.scss';

type TrendingTag = {
  tag: string;
  score: number;
  source?: string;
  token?: TokenItem;
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

export default function TrendingPillsCarousel() {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsToShow, setItemsToShow] = useState(12); // Number of items visible at once for loading state
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Responsive breakpoints for loading state and screen width tracking
  const updateResponsiveValues = useCallback(() => {
    const width = window.innerWidth;
    setScreenWidth(width);

    if (width >= 1680) setItemsToShow(16);
    else if (width >= 1280) setItemsToShow(12);
    else if (width >= 900) setItemsToShow(10);
    else if (width >= 700) setItemsToShow(8);
    else setItemsToShow(6);
  }, []);

  // Smooth scrolling animation
  const startScrolling = useCallback(() => {
    if (!tags.length || isHovered) return;

    const scroll = () => {
      setScrollPosition((prev) => {
        const pillWidth = 80; // Approximate pill width + gap
        const totalWidth = tags.length * pillWidth;
        const newPosition = prev + 0.8; // Adjust speed here (pixels per frame)

        // Reset to 0 when we've scrolled through half the content (since we duplicate items)
        if (newPosition >= totalWidth) {
          return 0;
        }
        return newPosition;
      });

      if (!isHovered) {
        animationRef.current = requestAnimationFrame(scroll);
      }
    };

    animationRef.current = requestAnimationFrame(scroll);
  }, [tags.length, isHovered]);

  const stopScrolling = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  // Handle responsive breakpoints for loading state and screen width
  useEffect(() => {
    updateResponsiveValues();
    const handleResize = () => updateResponsiveValues();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateResponsiveValues]);

  // Handle scrolling animation
  useEffect(() => {
    startScrolling();
    return () => stopScrolling();
  }, [startScrolling, stopScrolling]);

  // Reset scroll position when tags change
  useEffect(() => {
    setScrollPosition(0);
  }, [tags.length]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await SuperheroApi.listTrendingTags({
          orderBy: 'score',
          orderDirection: 'DESC',
          limit: 50,
        });
        const items = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);

        if (!cancelled) setTags(items);
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
          <div className="loading-cards">
            {[...Array(itemsToShow)].map((_, i) => (
              <div key={i} className="trending-card-skeleton">
                <div className="skeleton-content">
                  {/* Single Compact Row */}
                  <div className="skeleton-compact-row">
                    <div className="skeleton-tag-name">
                      #loading...
                    </div>
                    <div className="skeleton-right-content">
                      <div className="skeleton-score">
                        •••
                      </div>
                      <div className="skeleton-badge">
                        LOAD
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tags.length) {
    return null;
  }

  // Create seamless loop by duplicating tags exactly once
  const loop = [...tags, ...tags];

  return (
    <div className="trending-pills-carousel">
      <div className="carousel-container">
        <div
          ref={containerRef}
          className="carousel-track-smooth"
          style={{
            transform: `translateX(-${scrollPosition}px)`,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {loop.map((tag, index) => {
            // Check if this tag has a tokenized version
            const hasToken = !!tag?.token?.sale_address;

            // Get card styling based on tokenization status
            const getCardStyle = () => {
              if (hasToken) {
                return {
                  cardBg: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(21,128,61,0.12))',
                  textGradient: 'bg-gradient-to-r from-green-400 via-green-500 to-emerald-600',
                  color: '#22c55e',
                  bg: 'rgba(34,197,94,0.15)',
                  border: 'rgba(34,197,94,0.35)',
                };
              }
              return {
                cardBg: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.12))',
                textGradient: 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600',
                color: '#a855f7',
                bg: 'rgba(168,85,247,0.15)',
                border: 'rgba(168,85,247,0.35)',
              };
            };

            const style = getCardStyle();

            return (
              <div
                key={`${tag.tag}-${index}`}
                className="trending-card"
                style={{
                  background: style.cardBg,
                }}
                onClick={() => {
                  const url = hasToken
                    ? `/trends/tokens/${encodeURIComponent(tag.tag)}`
                    : `/trends/create?tokenName=${encodeURIComponent(tag.tag)}`;
                  window.location.href = url;
                }}
              >
                <div className="trending-card-content">
                  {/* Single Compact Row */}
                  <div className="trending-compact-row">
                    <span className={`trending-tag-name ${style.textGradient} bg-clip-text text-transparent`}>
                      <span className="text-white/60 text-[.9em] mr-0.5 align-baseline">#</span>
                      <span>{tag.tag}</span>
                    </span>
                    <div className="trending-right-content">
                      <div className={`trending-score ${style.textGradient} bg-clip-text text-transparent`}>
                        {Math.round(tag.score)}
                      </div>
                      <div
                        className="trending-status-badge"
                        style={{
                          color: style.color,
                          backgroundColor: style.bg,
                          borderColor: style.border,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        {hasToken ? 'Trade' : 'Tokenize Now'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
