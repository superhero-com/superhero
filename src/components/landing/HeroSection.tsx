import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnalyticsService } from "@/api/generated";
import { Decimal } from "@/libs/decimal";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useSectionTheme } from "../layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";
import { AnimatedCounter, Sparkline } from "./AnimatedCounter";

// Helper function to format dates as YYYY-MM-DD
const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

export default function HeroSection() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { getFiat, currentCurrencyInfo } = useCurrencies();

  const { data: last24HoursData } = useQuery({
    queryFn: () => AnalyticsService.getPast24HoursAnalytics(),
    queryKey: ["AnalyticsService.getPast24HoursAnalytics"],
    staleTime: 1000 * 60,
  });

  // Fetch last 7 days trade volume data for 24h comparison
  const { data: tradeVolumeData } = useQuery({
    queryFn: () => {
      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 3600 * 1000); // 7 days back
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

  // Calculate 24h volume and change percentage
  const volumeStats = React.useMemo(() => {
    if (!Array.isArray(tradeVolumeData) || tradeVolumeData.length < 2) {
      return { volume24h: 0, changePercent: 0, isPositive: true };
    }
    
    // Sort by date descending to get most recent first
    const sorted = [...tradeVolumeData].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const today = Number(sorted[0]?.volume_ae || 0);
    const yesterday = Number(sorted[1]?.volume_ae || 0);
    
    const changePercent = yesterday > 0 
      ? ((today - yesterday) / yesterday) * 100 
      : 0;
    
    return {
      volume24h: today,
      changePercent: Math.abs(changePercent),
      isPositive: changePercent >= 0
    };
  }, [tradeVolumeData]);

  const volume24hFiat = getFiat(Decimal.from(volumeStats.volume24h));
  const volume24hFiatNumber = parseFloat(volume24hFiat.toString()) || 0;

  // Mock sparkline data - in real app this would come from API
  const mockSparklineData = React.useMemo(() => {
    const base = fiatNumber || 1000;
    return Array.from({ length: 12 }, (_, i) => 
      base * (0.8 + Math.random() * 0.4) * (1 + i * 0.02)
    );
  }, [fiatNumber]);

  return (
    <section className="hero-section relative">
      {/* Minimal Hero - Tagline Only */}
      <div className="text-center py-8 md:py-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span 
            className="text-sm font-medium px-3 py-1.5 rounded-full"
            style={{ 
              backgroundColor: `${colors.primary}15`, 
              color: colors.primary 
            }}
          >
            # Trending Now
          </span>
        </div>
        
        <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Tokenize What's{" "}
          <span 
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: colors.gradient }}
          >
            Trending
          </span>
        </h1>
        
        <p className={`text-base md:text-lg max-w-xl mx-auto mb-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Every hashtag is a token. Own the trends. Trade opinions.
        </p>

        {/* Enhanced Stats Cards - 2x2 Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto mb-8">
          {/* Active Hashtags */}
          <div 
            className={`
              flex flex-col items-center justify-center p-4 rounded-2xl
              backdrop-blur-sm transition-all duration-300 hover:scale-105
              ${isDark ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white/60 border border-gray-200/50'}
            `}
            style={{ boxShadow: `0 4px 20px ${colors.primary}10` }}
          >
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${colors.primary}15` }}
            >
              <svg className="w-4 h-4" fill="none" stroke={colors.primary} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <AnimatedCounter 
              value={last24HoursData?.tokens_traded_count || 0}
              className={`text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}
              duration={1500}
            />
            <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Active Hashtags
            </span>
          </div>

          {/* 24h Volume with Trend Arrow */}
          <div 
            className={`
              flex flex-col items-center justify-center p-4 rounded-2xl relative overflow-hidden
              backdrop-blur-sm transition-all duration-300 hover:scale-105
              ${isDark ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white/60 border border-gray-200/50'}
            `}
            style={{ 
              boxShadow: `0 4px 20px ${volumeStats.isPositive ? '#10B98120' : '#EF444420'}`,
              borderColor: volumeStats.isPositive ? '#10B98130' : '#EF444430'
            }}
          >
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: volumeStats.isPositive ? '#10B98120' : '#EF444420' }}
            >
              <svg className="w-4 h-4" fill="none" stroke={volumeStats.isPositive ? '#10B981' : '#EF4444'} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            
            {/* Volume Value */}
            <div className="flex items-baseline gap-1">
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {currentCurrencyInfo.symbol}
              </span>
              <AnimatedCounter 
                value={volume24hFiatNumber}
                className={`text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}
                duration={2000}
              />
            </div>
            
            {/* Trend Arrow & Percentage */}
            <div className="flex items-center gap-1 mt-1">
              <div 
                className={`
                  flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold
                  ${volumeStats.isPositive 
                    ? 'bg-emerald-500/20 text-emerald-500' 
                    : 'bg-red-500/20 text-red-500'
                  }
                `}
              >
                {volumeStats.isPositive ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                <span>{volumeStats.changePercent.toFixed(1)}%</span>
              </div>
            </div>
            
            <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              24h Volume
            </span>
          </div>

          {/* Total Value - Featured with Sparkline */}
          <div 
            className={`
              flex flex-col items-center justify-center p-4 rounded-2xl relative overflow-hidden
              backdrop-blur-sm transition-all duration-300 hover:scale-105
              ${isDark ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white/60 border border-gray-200/50'}
            `}
            style={{ 
              boxShadow: `0 4px 20px ${colors.primary}20`,
              borderColor: `${colors.primary}30`
            }}
          >
            {/* Background gradient glow */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{ background: colors.gradient }}
            />
            
            <div className="relative z-10 flex flex-col items-center">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ background: colors.gradient }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {/* Animated Odometer Value */}
              <div className="flex items-baseline gap-1">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {currentCurrencyInfo.symbol}
                </span>
                <AnimatedCounter 
                  value={fiatNumber}
                  className={`text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}
                  duration={2500}
                />
              </div>
              
              {/* Mini Sparkline */}
              <div className="mt-1.5">
                <Sparkline 
                  data={mockSparklineData} 
                  width={60} 
                  height={18}
                  color={colors.primary}
                />
              </div>
              
              <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Total Value
              </span>
            </div>
          </div>

          {/* Traders Today */}
          <div 
            className={`
              flex flex-col items-center justify-center p-4 rounded-2xl
              backdrop-blur-sm transition-all duration-300 hover:scale-105
              ${isDark ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white/60 border border-gray-200/50'}
            `}
            style={{ boxShadow: `0 4px 20px ${colors.primary}10` }}
          >
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${colors.primary}15` }}
            >
              <svg className="w-4 h-4" fill="none" stroke={colors.primary} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <AnimatedCounter 
              value={last24HoursData?.unique_traders_count || 0}
              className={`text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}
              duration={1800}
            />
            {/* Live indicator */}
            <div className="flex items-center gap-1 mt-1">
              <div 
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: '#10B981' }}
              />
              <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Live
              </span>
            </div>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Traders Today
            </span>
          </div>
        </div>
      </div>

      {/* Create Hashtag CTA */}
      <div className="flex justify-center mb-8">
        <Link
          to="/trends/create"
          className="group inline-flex items-center gap-3 px-6 py-3 rounded-full text-white font-medium text-sm hover:shadow-lg transition-all duration-300 no-underline no-gradient-text"
          style={{ 
            background: colors.gradient,
            color: 'white',
            boxShadow: `0 4px 20px ${colors.primary}30`
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          Create a Hashtag
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
