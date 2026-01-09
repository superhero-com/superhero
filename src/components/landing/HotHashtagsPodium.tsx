import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TokensService } from "@/api/generated";
import { useSectionTheme } from "../layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { Decimal } from "@/libs/decimal";

/**
 * Hot Hashtags Podium with 3D Space Background
 * - Neon floating objects in space background
 * - Immersive 3D feel
 */

export default function HotHashtagsPodium() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const [pulsingTokens, setPulsingTokens] = useState<Set<number>>(new Set());
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);

  const { data: topicsData, isLoading } = useQuery({
    queryKey: ["hotHashtagsPodium"],
    queryFn: () =>
      TokensService.listAll({
        orderBy: "trending_score",
        orderDirection: "DESC",
        limit: 6,
        page: 1,
      }),
    staleTime: 1000 * 60,
  });

  const topics = topicsData?.items || [];
  const top3 = topics.slice(0, 3);
  const rest = topics.slice(3, 6);

  // Simulate random activity pulses
  useEffect(() => {
    const interval = setInterval(() => {
      if (topics.length > 0) {
        const randomIndex = Math.floor(Math.random() * topics.length);
        setPulsingTokens(prev => new Set([...prev, randomIndex]));
        setTimeout(() => {
          setPulsingTokens(prev => {
            const next = new Set(prev);
            next.delete(randomIndex);
            return next;
          });
        }, 1000);
      }
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [topics.length]);

  const formatMarketCap = (mcapAettos: string | number): string => {
    try {
      const decimal = Decimal.fromBigNumberString(String(mcapAettos).split('.')[0]);
      const aeValue = parseFloat(decimal.toAe());
      if (aeValue >= 1000000) return `${(aeValue / 1000000).toFixed(1)}M`;
      if (aeValue >= 1000) return `${(aeValue / 1000).toFixed(1)}K`;
      return aeValue.toFixed(0);
    } catch {
      return "0";
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null; // No emoji for ranks 4+
  };

  const getGlowColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return colors.primary;
  };

  const renderCard = (token: any, index: number, isTopThree: boolean) => {
    const rank = index + 1;
    const isPulsing = pulsingTokens.has(index);
    const isHovered = hoveredToken === index;
    const changePercent = ((Math.random() * 25) - 3).toFixed(1);
    const isPositive = parseFloat(changePercent) >= 0;
    const medalEmoji = getMedalEmoji(rank);

    return (
      <div
        key={token.address}
        className="relative"
        onMouseEnter={() => setHoveredToken(index)}
        onMouseLeave={() => setHoveredToken(null)}
      >
        <Link
          to={`/trends/tokens/${encodeURIComponent(token.name || token.address)}`}
          className="no-underline no-gradient-text block"
        >
          <div
            className={`
              relative overflow-hidden rounded-xl p-4 transition-all duration-300 backdrop-blur-sm
              text-center
              bg-slate-900/60 border border-slate-700/50
              ${isHovered ? 'scale-105 shadow-xl' : 'shadow-md'}
            `}
            style={{
              boxShadow: isHovered 
                ? `0 8px 32px ${getGlowColor(rank)}40, 0 0 60px ${getGlowColor(rank)}20` 
                : isPulsing 
                  ? `0 0 30px ${getGlowColor(rank)}50`
                  : `0 4px 20px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Pulse animation */}
            {isPulsing && (
              <div 
                className="absolute inset-0 rounded-xl animate-ping opacity-20"
                style={{ backgroundColor: getGlowColor(rank) }}
              />
            )}

            {/* Medal for top 3 only */}
            {medalEmoji && (
              <div className="text-2xl mb-2">
                {medalEmoji}
              </div>
            )}

            {/* Token name */}
            <div className="flex items-center gap-1 justify-center">
              <span style={{ color: colors.primary }} className="font-bold">#</span>
              <span className="font-semibold truncate text-white">
                {token.name || token.symbol}
              </span>
            </div>

            {/* Stats */}
            <div className="mt-2">
              <div 
                className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${
                  isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isPositive ? '▲' : '▼'}{Math.abs(parseFloat(changePercent))}%
              </div>
              <div className="text-xs mt-1 text-slate-400">
                {formatMarketCap(token.market_cap || 0)} Æ
              </div>
            </div>

            {/* Activity indicator */}
            <div className="flex items-center gap-1 mt-2 justify-center">
              {[...Array(isTopThree ? (rank === 1 ? 4 : rank === 2 ? 3 : 2) : 2)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${isPulsing ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: getGlowColor(rank), opacity: isPulsing ? 1 : 0.5 }}
                />
              ))}
              <span className="text-xs ml-1">🔥</span>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="my-6">
        <div className="flex items-center justify-center py-12">
          <div 
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="hot-hashtags-podium my-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Hot Hashtags
          </h3>
          <span 
            className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse"
            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
          >
            LIVE
          </span>
        </div>
        <Link
          to="/trends/tokens"
          className={`text-sm font-medium transition-colors no-underline ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          View all →
        </Link>
      </div>

      {/* 3D Space Stage */}
      <div 
        className="relative rounded-2xl overflow-hidden py-8 px-6"
        style={{
          background: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f2a 30%, #1a1a3a 70%, #0f0f2a 100%)',
          minHeight: '280px',
        }}
      >
        {/* Deep space starfield */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Stars */}
          {[...Array(50)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.5,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Neon floating objects - Geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Neon rings */}
          <div 
            className="absolute w-32 h-32 rounded-full border-2 animate-float-slow opacity-20"
            style={{ 
              left: '5%', 
              top: '20%', 
              borderColor: '#00ffff',
              boxShadow: '0 0 20px #00ffff, inset 0 0 20px #00ffff',
            }} 
          />
          <div 
            className="absolute w-20 h-20 rounded-full border animate-float-reverse opacity-15"
            style={{ 
              right: '10%', 
              top: '15%', 
              borderColor: '#ff00ff',
              boxShadow: '0 0 15px #ff00ff',
            }} 
          />
          <div 
            className="absolute w-16 h-16 rounded-full border animate-float opacity-20"
            style={{ 
              left: '15%', 
              bottom: '30%', 
              borderColor: '#00ff88',
              boxShadow: '0 0 15px #00ff88',
            }} 
          />

          {/* Neon triangles */}
          <svg className="absolute w-24 h-24 animate-spin-slow opacity-20" style={{ right: '5%', bottom: '25%' }}>
            <polygon 
              points="48,8 88,80 8,80" 
              fill="none" 
              stroke="#ff6b6b" 
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 10px #ff6b6b)' }}
            />
          </svg>
          <svg className="absolute w-16 h-16 animate-float-slow opacity-15" style={{ left: '8%', top: '60%' }}>
            <polygon 
              points="32,4 60,56 4,56" 
              fill="none" 
              stroke="#ffd700" 
              strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 8px #ffd700)' }}
            />
          </svg>

          {/* Neon hexagons */}
          <svg className="absolute w-28 h-28 animate-float-reverse opacity-15" style={{ right: '20%', top: '10%' }}>
            <polygon 
              points="56,8 100,32 100,80 56,104 12,80 12,32" 
              fill="none" 
              stroke="#00ccff" 
              strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 10px #00ccff)' }}
            />
          </svg>
          <svg className="absolute w-20 h-20 animate-spin-reverse-slow opacity-20" style={{ left: '25%', top: '8%' }}>
            <polygon 
              points="40,4 72,22 72,58 40,76 8,58 8,22" 
              fill="none" 
              stroke="#ff00aa" 
              strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 8px #ff00aa)' }}
            />
          </svg>

          {/* Floating orbs with glow */}
          <div 
            className="absolute w-4 h-4 rounded-full animate-float-slow"
            style={{ 
              left: '75%', 
              top: '40%', 
              background: 'radial-gradient(circle, #00ffff 0%, transparent 70%)',
              boxShadow: '0 0 20px #00ffff',
            }} 
          />
          <div 
            className="absolute w-3 h-3 rounded-full animate-float"
            style={{ 
              left: '85%', 
              top: '60%', 
              background: 'radial-gradient(circle, #ff00ff 0%, transparent 70%)',
              boxShadow: '0 0 15px #ff00ff',
            }} 
          />
          <div 
            className="absolute w-5 h-5 rounded-full animate-float-reverse"
            style={{ 
              left: '10%', 
              top: '45%', 
              background: 'radial-gradient(circle, #ffd700 0%, transparent 70%)',
              boxShadow: '0 0 20px #ffd700',
            }} 
          />

          {/* Grid lines for depth */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              transform: 'perspective(500px) rotateX(60deg)',
              transformOrigin: 'center bottom',
            }}
          />
        </div>

        {/* Top 3 Cards */}
        <div className="relative flex items-end justify-center gap-6 z-10">
          {/* 2nd place - left */}
          {top3[1] && (
            <div className="flex flex-col items-center">
              {renderCard(top3[1], 1, true)}
            </div>
          )}

          {/* 1st place - center */}
          {top3[0] && (
            <div className="flex flex-col items-center -mt-4">
              <span className="text-3xl mb-2 animate-bounce-slow">👑</span>
              {renderCard(top3[0], 0, true)}
            </div>
          )}

          {/* 3rd place - right */}
          {top3[2] && (
            <div className="flex flex-col items-center">
              {renderCard(top3[2], 2, true)}
            </div>
          )}
        </div>
      </div>

      {/* Rest - Row below */}
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {rest.map((token, index) => renderCard(token, index + 3, false))}
        </div>
      )}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-3deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(-10px) rotate(3deg); }
          50% { transform: translateY(5px) rotate(-2deg); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse-slow {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 5s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse-slow { animation: spin-reverse-slow 25s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
