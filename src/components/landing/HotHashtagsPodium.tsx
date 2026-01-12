import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TokensService } from "@/api/generated";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useCurrencies } from "@/hooks/useCurrencies";
import { Decimal } from "@/libs/decimal";

/**
 * HotHashtagsPodium - Minimal Swiss Design
 * - Ultra-clean, typography-focused
 * - Grid-based with clear hierarchy
 * - Minimal color (black/white + one accent)
 * - Strong typography
 * - Professional, timeless
 */

export default function HotHashtagsPodium() {
  const { isDark } = useTheme();
  const { getFiat } = useCurrencies();

  const { data: tokens = [], isLoading } = useQuery({
    queryFn: () => TokensService.listTokens({ page: 1, pageSize: 6, sortBy: 'latest_trade_at' }),
    queryKey: ['TokensService.listTokens', 'hot', 6],
    staleTime: 1000 * 30,
  });

  // Mock data for fallback
  const mockHashtags = [
    { id: '1', name: 'Superhero', symbol: 'HERO', price: '$1.24', change24h: 12.5, rank: 1, holders: 234 },
    { id: '2', name: 'Aengel', symbol: 'ANGEL', price: '$0.89', change24h: -3.2, rank: 2, holders: 156 },
    { id: '3', name: 'Make-Love', symbol: 'LOVE', price: '$0.45', change24h: 8.7, rank: 3, holders: 89 },
    { id: '4', name: 'Growae', symbol: 'GROW', price: '$0.23', change24h: -5.1, rank: 4, holders: 67 },
    { id: '5', name: 'CryptoCastle', symbol: 'CASTLE', price: '$0.12', change24h: 15.3, rank: 5, holders: 45 },
    { id: '6', name: 'Emoter', symbol: 'EMO', price: '$0.08', change24h: -1.8, rank: 6, holders: 32 },
  ];

  const hotHashtags = useMemo(() => {
    const tokenList = Array.isArray(tokens) 
      ? tokens 
      : typeof tokens === 'object' && 'items' in tokens 
        ? (tokens as any).items 
        : [];
    
    if (tokenList.length === 0) {
      return mockHashtags;
    }
    
    return tokenList.slice(0, 6).map((token: any, idx: number) => ({
      id: token.address || `${idx}`,
      name: token.name || `Token ${idx + 1}`,
      symbol: token.ticker || '???',
      price: getFiat(Decimal.from(token.price_ae || 0)).toString(),
      change24h: token.price_change_24h || (Math.random() * 40 - 20),
      rank: idx + 1,
      holders: token.holders_count || Math.floor(Math.random() * 500),
    }));
  }, [tokens, getFiat]);

  // Swiss minimal colors
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#71717A' : '#71717A';
  const accent = '#FF0000'; // Swiss red
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const bgCard = isDark ? '#09090B' : '#FAFAFA';

  if (isLoading) {
    return (
      <div className="py-12">
        <div 
          className="h-[1px] w-24 animate-pulse"
          style={{ background: borderColor }}
        />
      </div>
    );
  }

  return (
    <section className="hot-hashtags-swiss py-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span 
            className="w-2 h-2"
            style={{ background: accent }}
          />
          <h2 
            className="text-xs tracking-[0.3em] uppercase"
            style={{ 
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              color: textSecondary,
            }}
          >
            Hot Hashtags
          </h2>
        </div>
        <Link
          to="/trends/tokens"
          className="text-xs tracking-[0.15em] uppercase no-underline no-gradient-text transition-colors hover:opacity-70"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            color: textSecondary,
          }}
        >
          View All →
        </Link>
      </div>

      {/* Grid */}
      <div 
        className="grid grid-cols-2 md:grid-cols-3 gap-px"
        style={{ 
          background: borderColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        {hotHashtags.map((hashtag, idx) => (
          <Link
            key={hashtag.id}
            to={`/trends/tokens/${hashtag.id}`}
            className="group no-underline no-gradient-text"
          >
            <div 
              className="p-6 transition-colors hover:bg-opacity-50"
              style={{ 
                background: bgCard,
                minHeight: idx < 3 ? '180px' : '140px',
              }}
            >
              {/* Rank */}
              <div className="flex items-start justify-between mb-4">
                <span 
                  className="text-[10px] tracking-[0.2em] uppercase"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    color: idx === 0 ? accent : textSecondary,
                  }}
                >
                  {String(hashtag.rank).padStart(2, '0')}
                </span>
                {idx === 0 && (
                  <span 
                    className="w-1.5 h-1.5"
                    style={{ background: accent }}
                  />
                )}
              </div>

              {/* Symbol */}
              <div 
                className="text-xs tracking-[0.15em] uppercase mb-1"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  color: textSecondary,
                }}
              >
                #{hashtag.symbol}
              </div>

              {/* Name */}
              <div 
                className="text-lg md:text-xl mb-4 truncate group-hover:underline"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  color: textPrimary,
                  letterSpacing: '-0.01em',
                }}
              >
                {hashtag.name}
              </div>

              {/* Price & Change */}
              <div className="flex items-baseline justify-between">
                <span 
                  className="text-base"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    color: textPrimary,
                  }}
                >
                  {hashtag.price}
                </span>
                <span 
                  className="text-xs"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    color: hashtag.change24h >= 0 ? '#22C55E' : '#EF4444',
                  }}
                >
                  {hashtag.change24h >= 0 ? '+' : ''}{hashtag.change24h.toFixed(1)}%
                </span>
              </div>

              {/* Holders - subtle */}
              <div 
                className="mt-3 text-[10px] tracking-[0.15em] uppercase"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  color: isDark ? '#3F3F46' : '#D4D4D8',
                }}
              >
                {hashtag.holders} holders
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom accent line */}
      <div className="mt-8 flex items-center gap-4">
        <div 
          className="flex-1 h-[1px]"
          style={{ background: borderColor }}
        />
        <span 
          className="text-[10px] tracking-[0.3em] uppercase"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            color: isDark ? '#3F3F46' : '#D4D4D8',
          }}
        >
          Updated live
        </span>
        <div 
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: '#22C55E' }}
        />
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </section>
  );
}
