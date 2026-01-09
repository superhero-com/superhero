import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnalyticsService } from "@/api/generated";
import { Decimal } from "@/libs/decimal";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useSectionTheme } from "../layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";
import { AnimatedCounter, Sparkline } from "./AnimatedCounter";

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * HeroSection - Minimal Swiss Design
 * - Ultra-clean, typography-focused
 * - Grid-based, lots of whitespace
 * - Minimal color palette
 * - Strong typography hierarchy
 * - Professional, timeless
 */

export default function HeroSection() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { getFiat, currentCurrencyInfo } = useCurrencies();

  const { data: last24HoursData } = useQuery({
    queryFn: () => AnalyticsService.getPast24HoursAnalytics(),
    queryKey: ["AnalyticsService.getPast24HoursAnalytics"],
    staleTime: 1000 * 60,
  });

  const { data: tradeVolumeData } = useQuery({
    queryFn: () => {
      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      return AnalyticsService.dailyTradeVolume({
        startDate: formatDate(start),
        endDate: formatDate(end),
      });
    },
    queryKey: ['AnalyticsService.getDailyTradeVolume'],
    staleTime: 1000 * 60,
  });

  const totalMarketCapValue = React.useMemo(
    () => Decimal.from(last24HoursData?.total_market_cap_sum ?? 0),
    [last24HoursData]
  );

  const fiatValue = getFiat(totalMarketCapValue);
  const fiatNumber = parseFloat(fiatValue.toString()) || 0;

  const volumeStats = React.useMemo(() => {
    if (!Array.isArray(tradeVolumeData) || tradeVolumeData.length < 2) {
      return { volume24h: 0, changePercent: 0, isPositive: true };
    }
    const sorted = [...tradeVolumeData].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const today = Number(sorted[0]?.volume_ae || 0);
    const yesterday = Number(sorted[1]?.volume_ae || 0);
    const changePercent = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;
    return {
      volume24h: today,
      changePercent: Math.abs(changePercent),
      isPositive: changePercent >= 0
    };
  }, [tradeVolumeData]);

  const volume24hFiat = getFiat(Decimal.from(volumeStats.volume24h));
  const volume24hFiatNumber = parseFloat(volume24hFiat.toString()) || 0;

  const mockSparklineData = React.useMemo(() => {
    const base = fiatNumber || 1000;
    return Array.from({ length: 12 }, (_, i) => 
      base * (0.8 + Math.random() * 0.4) * (1 + i * 0.02)
    );
  }, [fiatNumber]);

  // Swiss minimal colors
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#71717A' : '#71717A';
  const accent = '#FF0000'; // Swiss red
  const borderColor = isDark ? '#27272A' : '#E4E4E7';

  return (
    <section className="hero-section relative py-16 md:py-24">
      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        
        {/* Overline */}
        <div className="mb-6">
          <span 
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] uppercase"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 500,
              color: textSecondary,
            }}
          >
            <span 
              className="w-8 h-[1px]"
              style={{ background: accent }}
            />
            Trending Now
          </span>
        </div>
        
        {/* Main Headline */}
        <h1 className="mb-8">
          <span 
            className="block text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Tokenize
          </span>
          <span 
            className="block text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            What's{' '}
            <span style={{ color: accent }}>Trending</span>
          </span>
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-lg md:text-xl max-w-md mb-16 leading-relaxed"
          style={{ 
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 400,
            color: textSecondary,
          }}
        >
          Every hashtag is a token. Own the trends, trade opinions, shape the conversation.
        </p>

        {/* Stats Row */}
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-px mb-16"
          style={{ 
            background: borderColor,
            border: `1px solid ${borderColor}`,
          }}
        >
          {/* Stat 1 */}
          <div 
            className="p-6"
            style={{ background: isDark ? '#09090B' : '#FAFAFA' }}
          >
            <div 
              className="text-xs tracking-[0.2em] uppercase mb-3"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                color: textSecondary,
              }}
            >
              Active
            </div>
            <AnimatedCounter 
              value={last24HoursData?.tokens_traded_count || 0}
              className="text-3xl md:text-4xl"
              duration={1500}
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: textPrimary,
                letterSpacing: '-0.02em',
              }}
            />
          </div>

          {/* Stat 2 */}
          <div 
            className="p-6"
            style={{ background: isDark ? '#09090B' : '#FAFAFA' }}
          >
            <div 
              className="text-xs tracking-[0.2em] uppercase mb-3"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                color: textSecondary,
              }}
            >
              Volume 24h
            </div>
            <div className="flex items-baseline gap-2">
              <AnimatedCounter 
                value={volume24hFiatNumber}
                className="text-3xl md:text-4xl"
                duration={2000}
                prefix={currentCurrencyInfo.symbol}
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  color: textPrimary,
                  letterSpacing: '-0.02em',
                }}
              />
              <span 
                className="text-sm"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  color: volumeStats.isPositive ? '#22C55E' : '#EF4444',
                }}
              >
                {volumeStats.isPositive ? '+' : '-'}{volumeStats.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Stat 3 */}
          <div 
            className="p-6"
            style={{ background: isDark ? '#09090B' : '#FAFAFA' }}
          >
            <div 
              className="text-xs tracking-[0.2em] uppercase mb-3"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                color: textSecondary,
              }}
            >
              Total Value
            </div>
            <AnimatedCounter 
              value={fiatNumber}
              className="text-3xl md:text-4xl"
              duration={2500}
              prefix={currentCurrencyInfo.symbol}
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: textPrimary,
                letterSpacing: '-0.02em',
              }}
            />
          </div>

          {/* Stat 4 */}
          <div 
            className="p-6"
            style={{ background: isDark ? '#09090B' : '#FAFAFA' }}
          >
            <div 
              className="text-xs tracking-[0.2em] uppercase mb-3"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                color: textSecondary,
              }}
            >
              Traders
            </div>
            <div className="flex items-baseline gap-2">
              <AnimatedCounter 
                value={last24HoursData?.unique_traders_count || 0}
                className="text-3xl md:text-4xl"
                duration={1500}
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  color: textPrimary,
                  letterSpacing: '-0.02em',
                }}
              />
              <span 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#22C55E' }}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-6">
          <Link
            to="/trends/create"
            className="group inline-flex items-center gap-3 px-8 py-4 no-underline no-gradient-text transition-all hover:gap-4"
            style={{ 
              background: textPrimary,
              color: isDark ? '#000' : '#FFF',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            Create Hashtag
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          
          <Link
            to="/trends/tokens"
            className="inline-flex items-center gap-2 no-underline no-gradient-text transition-all hover:gap-3"
            style={{ 
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
              fontWeight: 700,
              color: textSecondary,
            }}
          >
            Explore All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Minimal decoration - vertical line */}
      <div 
        className="absolute top-0 bottom-0 left-8 w-[1px] hidden lg:block"
        style={{ background: borderColor }}
      />

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </section>
  );
}
