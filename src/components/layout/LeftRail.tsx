import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SuperheroApi } from '../../api/backend';
import { useAeSdk } from '../../hooks';
import { formatCompactNumber } from '../../utils/number';

interface TrendingTag {
  tag: string;
  score: number;
  source?: string;
}

const LeftRail = () => {
  const { t } = useTranslation('common');
  const { currentBlockHeight } = useAeSdk();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showTips, setShowTips] = useState(false);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [marketStats, setMarketStats] = useState<any>(null);
  // Removed local API status (moved to footer)

  // Timer, online status, and block height
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced time formatting with emoji and block height
  const formatTime = (date: Date) => {
    const hour = date.getHours();
    let timeEmoji = '🌅';
    if (hour >= 6 && hour < 12) timeEmoji = '🌅';
    else if (hour >= 12 && hour < 17) timeEmoji = '☀️';
    else if (hour >= 17 && hour < 20) timeEmoji = '🌆';
    else timeEmoji = '🌙';

    const timeString = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const dateString = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return { timeEmoji, timeString, dateString };
  };

  // Load trending data
  useEffect(() => {
    let cancelled = false;
    async function loadTrendingData() {
      try {
        const [tagsResp, statsResp] = await Promise.all([
          SuperheroApi.listTrendingTags({
            orderBy: 'score',
            orderDirection: 'DESC',
            limit: 10,
          }),
          SuperheroApi.fetchJson('/api/analytics/past-24-hours'),
        ]);

        if (!cancelled) {
          try {
            const tags = Array.isArray(tagsResp?.items) ? tagsResp.items : [];
            const mappedTags = tags.map((it: any) => ({
              tag: it.tag ?? it.name ?? '',
              score: Number(it.score ?? it.value ?? 0),
              source: it.source || it.platform || undefined,
            }));
            setTrendingTags(mappedTags.filter((t) => t.tag));

            setMarketStats(statsResp);
          } catch {
            // Set empty arrays as fallback
            setTrendingTags([]);
            setMarketStats(null);
          }
        }
      } catch {
        // Set empty arrays as fallback
        if (!cancelled) {
          setTrendingTags([]);
          setMarketStats(null);
        }
      }
    }
    loadTrendingData();
    return () => {
      cancelled = true;
    };
  }, []);

  // API status moved to footer

  const handleTrendingTopic = (topic: string) => {
    navigate(`/trends?q=${encodeURIComponent(topic)}`);
  };

  const formatMarketCap = (amount: number): string => `$${formatCompactNumber(amount, 0, 1)}`;

  const enhancedTips = [
    {
      icon: '💎',
      color: 'var(--neon-teal)',
      textKey: 'tips.hardwareWallets',
      expandedKey: 'tips.hardwareWalletsExpanded',
      categoryKey: 'tips.categorySecurity',
    },
    {
      icon: '🔒',
      color: 'var(--neon-pink)',
      textKey: 'tips.verifyAddresses',
      expandedKey: 'tips.verifyAddressesExpanded',
      categoryKey: 'tips.categorySecurity',
    },
    {
      icon: '⚡',
      color: 'var(--neon-blue)',
      textKey: 'tips.keepAeForGas',
      expandedKey: 'tips.keepAeForGasExpanded',
      categoryKey: 'tips.categoryTrading',
    },
    {
      icon: '🛡️',
      color: 'var(--neon-yellow)',
      textKey: 'tips.neverShareKeys',
      expandedKey: 'tips.neverShareKeysExpanded',
      categoryKey: 'tips.categorySecurity',
    },
    {
      icon: '📱',
      color: 'var(--neon-purple)',
      textKey: 'tips.enable2fa',
      expandedKey: 'tips.enable2faExpanded',
      categoryKey: 'tips.categorySecurity',
    },
    {
      icon: '🚀',
      color: 'var(--neon-green)',
      textKey: 'tips.diversify',
      expandedKey: 'tips.diversifyExpanded',
      categoryKey: 'tips.categoryInvestment',
    },
  ];

  return (
    <div className="scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-[rgba(0,255,157,0.6)] scrollbar-thumb-via-pink-500/60 scrollbar-thumb-to-[rgba(0,255,157,0.6)] scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-via-pink-500/80 hover:scrollbar-thumb-to-[rgba(0,255,157,0.8)]">
      {/* Enhanced Quick Stats Dashboard */}
      <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[20px] rounded-[20px] p-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--neon-teal)] before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            📊
          </span>
          <h4 className="m-0 text-[var(--neon-teal)] text-base font-bold">
            {t('layout.liveDashboard')}
          </h4>
          <div
            className={`ml-auto w-2 h-2 rounded-full ${
              isOnline
                ? 'bg-[var(--neon-green)] animate-pulse'
                : 'bg-[var(--neon-pink)]'
            }`}
          />
        </div>

        <div className="grid gap-2.5">
          <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-[10px]">
            <span className="text-xs text-[#b8c5d6]">{t('layout.blockchainStatus')}</span>
            <span
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                isOnline
                  ? 'text-[var(--neon-green)]'
                  : 'text-[var(--neon-pink)]'
              }`}
            >
              {isOnline ? t('layout.connected') : t('layout.offline')}
            </span>
          </div>

          {/* Enhanced Current Time Display */}
          <div className="p-4 bg-gradient-to-br from-teal-500/10 to-blue-500/5 rounded-2xl border border-teal-500/20 backdrop-blur-[15px] relative overflow-hidden">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/5 to-transparent animate-[shimmer_3s_infinite] z-0" />

            <div className="relative z-10">
              {/* Time Emoji and Label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-base text-[var(--neon-teal)] font-semibold uppercase tracking-wider">
                  {t('layout.currentTime')}
                </span>
                <span className="text-xl drop-shadow-[0_0_8px_rgba(78,205,196,0.5)]">
                  {formatTime(currentTime).timeEmoji}
                </span>
              </div>

              {/* Main Time Display */}
              <div className="text-center mb-1.5">
                <div className="text-lg text-white font-extrabold font-mono text-shadow-[0_0_10px_rgba(78,205,196,0.5)] tracking-wide">
                  {formatTime(currentTime).timeString}
                </div>
              </div>

              {/* Date Display */}
              <div className="text-center mb-2">
                <div className="text-[11px] text-[var(--neon-blue)] font-semibold uppercase tracking-wider">
                  {formatTime(currentTime).dateString}
                </div>
              </div>

              {/* Block Height (if available) */}
              {currentBlockHeight !== null && (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
                  <span className="text-[10px] text-[var(--neon-green)] font-semibold font-mono">
                    {t('layout.blockNumber')}
                    {currentBlockHeight.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {marketStats && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="py-2 px-3 bg-teal-500/10 rounded-lg border border-teal-500/20 text-center transition-all duration-300 hover:-translate-y-0.5">
                <div className="text-[10px] text-[var(--neon-teal)] font-semibold">
                  {t('layout.marketCap')}
                </div>
                <div className="text-[11px] text-white font-bold">
                  {formatMarketCap(marketStats.total_market_cap_sum || 0)}
                </div>
              </div>
              <div className="py-2 px-3 bg-pink-500/10 rounded-lg border border-pink-500/20 text-center transition-all duration-300 hover:-translate-y-0.5">
                <div className="text-[10px] text-[var(--neon-pink)] font-semibold">
                  {t('layout.totalTokens')}
                </div>
                <div className="text-[11px] text-white font-bold">
                  {marketStats.total_tokens || 0}
                </div>
              </div>
            </div>
          )}

          {/* Network Status moved to footer */}
        </div>
      </div>

      {/* Enhanced Quick Actions - moved to RightRail */}

      {/* Live Trending Topics */}
      <div className="genz-card" style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🔥</span>
          <h4
            style={{ margin: 0, color: 'var(--neon-yellow)', fontSize: '16px' }}
          >
            {t('layout.liveTrending')}
          </h4>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--neon-teal)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              marginLeft: 'auto',
            }}
            onClick={() => navigate('/trends')}
            title={t('titles.exploreAllTrends')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 157, 0.1)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔍
          </button>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--neon-pink)',
              animation: 'pulse 1s infinite',
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          {trendingTags.slice(0, 6).map((tag, index) => (
            <button
              type="button"
              key={tag.tag}
              className="trending-topic"
              style={{
                padding: '8px 12px',
                background: `rgba(255,255,255,${0.03 + index * 0.02})`,
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '11px',
                color: '#b8c5d6',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => handleTrendingTopic(tag.tag)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `rgba(255,255,255,${
                  0.03 + index * 0.02
                })`;
                e.currentTarget.style.color = '#b8c5d6';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
              title={t('layout.searchForTag', { tag: tag.tag, score: tag.score })}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '6px',
                  fontSize: '8px',
                  color: 'var(--neon-pink)',
                  fontWeight: '600',
                }}
              >
                #
                {index + 1}
              </span>
              {tag.tag}
            </button>
          ))}
        </div>
      </div>

      {/* Top Tokens - moved to RightRail */}

      {/* Live Activity Feed - moved to RightRail */}

      {/* Price Alerts - moved to RightRail */}

      {/* Enhanced Pro Tips */}
      <div className="genz-card">
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
          onClick={() => setShowTips(!showTips)}
          title={t('titles.clickToExpandTips')}
        >
          <span style={{ fontSize: '18px' }}>💡</span>
          <h4
            style={{ margin: 0, color: 'var(--neon-purple)', fontSize: '16px' }}
          >
            Pro Tips
          </h4>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--neon-purple)',
              marginLeft: 'auto',
              transition: 'transform 0.3s ease',
              transform: showTips ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </button>

        <div
          style={{
            fontSize: '11px',
            color: '#b8c5d6',
            lineHeight: '1.4',
            maxHeight: showTips ? '600px' : '80px',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}
        >
          {enhancedTips.map((tip) => (
            <div key={`${tip.categoryKey}-${tip.textKey}`} style={{ marginBottom: '12px' }}>
              <div
                className="pro-tip"
                style={
                  {
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background 0.2s ease',
                    '--tip-color': tip.color,
                  } as React.CSSProperties
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                title={`${t(tip.categoryKey)}: ${t(tip.textKey)}`}
              >
                <strong style={{ color: tip.color, fontSize: '14px' }}>
                  {tip.icon}
                </strong>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>
                    {t(tip.textKey)}
                  </span>
                  <div
                    style={{
                      fontSize: '8px',
                      color: tip.color,
                      marginTop: '2px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {t(tip.categoryKey)}
                  </div>
                </div>
              </div>
              {showTips && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    marginLeft: '26px',
                    marginTop: '6px',
                    fontStyle: 'italic',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  {t(tip.expandedKey)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default LeftRail;
