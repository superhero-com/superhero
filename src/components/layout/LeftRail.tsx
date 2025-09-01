import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Backend, TrendminerApi } from '../../api/backend';
import { useAeSdk } from '../../hooks';
import WebSocketClient from '../../libs/WebSocketClient';
import './LeftRail.scss';

interface TrendingTag {
  tag: string;
  score: number;
  source?: string;
}

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
}

interface LiveTransaction {
  sale_address: string;
  token_name: string;
  type: string;
  created_at: string;
}

export default function LeftRail() {
  const { sdk, currentBlockHeight } = useAeSdk();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>([]);
  const [marketStats, setMarketStats] = useState<any>(null);
  const [topTokens, setTopTokens] = useState<TokenItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<Array<{ token: string, price: number, change: number }>>([]);
  const [apiStatus, setApiStatus] = useState<{
    backend: 'online' | 'offline' | 'checking';
    trendminer: 'online' | 'offline' | 'checking';
    dex: 'online' | 'offline' | 'checking';
  }>({
    backend: 'checking',
    trendminer: 'checking',
    dex: 'checking'
  });

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
      second: '2-digit'
    });

    const dateString = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return { timeEmoji, timeString, dateString };
  };

  // Load trending data
  useEffect(() => {
    let cancelled = false;
    async function loadTrendingData() {
      try {
        const [tagsResp, tokensResp, statsResp] = await Promise.all([
          TrendminerApi.listTrendingTags({ orderBy: 'score', orderDirection: 'DESC', limit: 10 }),
          TrendminerApi.listTokens({ orderBy: 'market_cap', orderDirection: 'DESC', limit: 5 }),
          TrendminerApi.fetchJson('/api/analytics/past-24-hours')
        ]);

        if (!cancelled) {
          try {
            const tags = Array.isArray(tagsResp?.items) ? tagsResp.items : [];
            const mappedTags = tags.map((it: any) => ({
              tag: it.tag ?? it.name ?? '',
              score: Number(it.score ?? it.value ?? 0),
              source: it.source || it.platform || undefined
            }));
            setTrendingTags(mappedTags.filter((t) => t.tag));

            const tokens = tokensResp?.items ?? [];
            // Ensure token data is properly formatted
            const formattedTokens = tokens.map((token: any) => ({
              ...token,
              price: token.price ? Number(token.price) : null,
              market_cap: token.market_cap ? Number(token.market_cap) : 0,
              holders_count: token.holders_count ? Number(token.holders_count) : 0
            }));
            setTopTokens(formattedTokens);

            setMarketStats(statsResp);
          } catch (parseError) {
            console.error('Failed to parse trending data:', parseError);
            // Set empty arrays as fallback
            setTrendingTags([]);
            setTopTokens([]);
            setMarketStats(null);
          }
        }
      } catch (error) {
        console.error('Failed to load trending data:', error);
        // Set empty arrays as fallback
        if (!cancelled) {
          setTrendingTags([]);
          setTopTokens([]);
          setMarketStats(null);
        }
      }
    }
    loadTrendingData();
    return () => { cancelled = true; };
  }, []);

  // Load live transactions
  useEffect(() => {
    let cancelled = false;
    async function loadLiveTransactions() {
      try {
        const [txResp, createdResp] = await Promise.all([
          TrendminerApi.fetchJson('/api/transactions?limit=5'),
          TrendminerApi.fetchJson('/api/tokens?order_by=created_at&order_direction=DESC&limit=3'),
        ]);

        if (!cancelled) {
          try {
            const txItems = txResp?.items ?? [];
            const createdItems = (createdResp?.items ?? []).map((t: any) => ({
              sale_address: t.sale_address || t.address || '',
              token_name: t.name || 'Unknown Token',
              type: 'CREATED',
              created_at: t.created_at || new Date().toISOString(),
            }));
            setLiveTransactions([...createdItems, ...txItems].slice(0, 8));
          } catch (parseError) {
            console.error('Failed to parse live transactions:', parseError);
            setLiveTransactions([]);
          }
        }
      } catch (error) {
        console.error('Failed to load live transactions:', error);
        if (!cancelled) {
          setLiveTransactions([]);
        }
      }
    }
    loadLiveTransactions();

    // WebSocket subscriptions for real-time updates
    const unsub1 = WebSocketClient.subscribe('TokenTransaction', (tx) => {
      setLiveTransactions(prev => [{
        sale_address: tx?.sale_address || tx?.token_address || '',
        token_name: tx?.token_name || 'Unknown',
        type: 'TRADE',
        created_at: new Date().toISOString()
      }, ...prev].slice(0, 8));
    });

    const unsub2 = WebSocketClient.subscribe('TokenCreated', (payload) => {
      setLiveTransactions(prev => [{
        sale_address: payload?.sale_address || payload?.address || '',
        token_name: payload?.name || 'New Token',
        type: 'CREATED',
        created_at: payload?.created_at || new Date().toISOString()
      }, ...prev].slice(0, 8));
    });

    return () => {
      cancelled = true;
      unsub1();
      unsub2();
    };
  }, []);

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      // Check Backend API
      try {
        await Backend.getTopics();
        setApiStatus(prev => ({ ...prev, backend: 'online' }));
      } catch {
        setApiStatus(prev => ({ ...prev, backend: 'offline' }));
      }

      // Check Trendminer API
      try {
        await TrendminerApi.listTrendingTags({ limit: 1 });
        setApiStatus(prev => ({ ...prev, trendminer: 'online' }));
      } catch {
        setApiStatus(prev => ({ ...prev, trendminer: 'offline' }));
      }

      // Check DEX API (simulate)
      try {
        await Backend.getPrice();
        setApiStatus(prev => ({ ...prev, dex: 'online' }));
      } catch {
        setApiStatus(prev => ({ ...prev, dex: 'offline' }));
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Simulate price alerts (in real app, this would come from user preferences)
  useEffect(() => {
    const alerts = [
      { token: 'AE', price: 0.15, change: 2.5 },
      { token: 'SUPER', price: 0.08, change: -1.2 },
      { token: 'MEME', price: 0.003, change: 15.7 }
    ];
    setPriceAlerts(alerts);
  }, []);


  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'explore':
        navigate('/pool/add-tokens');
        break;
      case 'bridge':
        navigate('/dex');
        break;
      case 'nfts':
        navigate('/trendminer');
        break;
      case 'trending':
        navigate('/trending');
        break;
      case 'governance':
        navigate('/voting');
        break;
      case 'meet':
        navigate('/meet');
        break;
      default:
        break;
    }
  };

  const handleTrendingTopic = (topic: string) => {
    navigate(`/trending?q=${encodeURIComponent(topic)}`);
  };

  const handleTokenClick = (token: TokenItem) => {
    navigate(`/trendminer/tokens/${token.name}`);
  };

  const formatMarketCap = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const enhancedTips = [
    {
      icon: '💎',
      color: 'var(--neon-teal)',
      text: 'Use hardware wallets for large amounts',
      expanded: 'Hardware wallets like Ledger or Trezor provide the highest security for storing significant amounts of cryptocurrency.',
      category: 'Security'
    },
    {
      icon: '🔒',
      color: 'var(--neon-pink)',
      text: 'Always verify contract addresses',
      expanded: 'Double-check contract addresses before interacting. One wrong character can lead to permanent loss of funds.',
      category: 'Security'
    },
    {
      icon: '⚡',
      color: 'var(--neon-blue)',
      text: 'Keep some AE for gas fees',
      expanded: 'Always maintain a small balance of AE tokens to pay for transaction fees on the æternity network.',
      category: 'Trading'
    },
    {
      icon: '🛡️',
      color: 'var(--neon-yellow)',
      text: 'Never share your private keys',
      expanded: 'Your private keys are like the password to your bank account. Never share them with anyone, including support.',
      category: 'Security'
    },
    {
      icon: '📱',
      color: 'var(--neon-purple)',
      text: 'Enable 2FA on exchanges',
      expanded: 'Use two-factor authentication on all cryptocurrency exchanges to add an extra layer of security.',
      category: 'Security'
    },
    {
      icon: '🚀',
      color: 'var(--neon-green)',
      text: 'Diversify your portfolio',
      expanded: 'Don\'t put all your eggs in one basket. Spread your investments across different tokens and projects.',
      category: 'Investment'
    }
  ];

  return (
    <div className="left-rail">
      {/* Enhanced Quick Stats Dashboard */}
      <div className="genz-card enhanced-stats" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>📊</span>
          <h4 style={{ margin: 0, color: 'var(--neon-teal)', fontSize: '16px' }}>Live Dashboard</h4>
          <div className="status-indicator" style={{
            marginLeft: 'auto',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOnline ? 'var(--neon-green)' : 'var(--neon-pink)',
            animation: isOnline ? 'pulse 2s infinite' : 'none'
          }} />
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '12px', color: '#b8c5d6' }}>Blockchain Status</span>
            <span style={{
              fontSize: '12px',
              color: isOnline ? 'var(--neon-green)' : 'var(--neon-pink)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {isOnline ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>

          {/* Enhanced Current Time Display */}
          <div className="enhanced-time-display" style={{
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(69, 183, 209, 0.05) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(78, 205, 196, 0.2)',
            backdropFilter: 'blur(15px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated background effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(78, 205, 196, 0.05), transparent)',
              animation: 'shimmer 3s infinite',
              zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Time Emoji and Label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '16px',
                  color: 'var(--neon-teal)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Current Time
                </span>
                <span className="time-emoji" style={{
                  fontSize: '20px',
                  filter: 'drop-shadow(0 0 8px rgba(78, 205, 196, 0.5))'
                }}>
                  {formatTime(currentTime).timeEmoji}
                </span>
              </div>

              {/* Main Time Display */}
              <div style={{
                textAlign: 'center',
                marginBottom: '6px'
              }}>
                <div className="time-main" style={{
                  fontSize: '18px',
                  color: 'white',
                  fontWeight: '800',
                  fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
                  textShadow: '0 0 10px rgba(78, 205, 196, 0.5)',
                  letterSpacing: '1px'
                }}>
                  {formatTime(currentTime).timeString}
                </div>
              </div>

              {/* Date Display */}
              <div style={{
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--neon-blue)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {formatTime(currentTime).dateString}
                </div>
              </div>

              {/* Block Height (if available) */}
              {currentBlockHeight !== null && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span className="block-indicator" style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--neon-green)',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span style={{
                    fontSize: '10px',
                    color: 'var(--neon-green)',
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>
                    Block #{currentBlockHeight.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>





          {marketStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginTop: '8px'
            }}>
              <div className="market-stat" style={{
                padding: '8px 12px',
                background: 'rgba(78, 205, 196, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(78, 205, 196, 0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--neon-teal)', fontWeight: '600' }}>
                  Market Cap
                </div>
                <div style={{ fontSize: '11px', color: 'white', fontWeight: '700' }}>
                  {formatMarketCap(marketStats.total_market_cap_sum || 0)}
                </div>
              </div>
              <div className="market-stat pink" style={{
                padding: '8px 12px',
                background: 'rgba(255, 107, 107, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 107, 107, 0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--neon-pink)', fontWeight: '600' }}>
                  Total Tokens
                </div>
                <div style={{ fontSize: '11px', color: 'white', fontWeight: '700' }}>
                  {marketStats.total_tokens || 0}
                </div>
              </div>
            </div>
          )}

          {/* Network Status */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            marginTop: '8px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '6px',
              fontSize: '9px'
            }}>
              <span style={{ color: '#b8c5d6', marginBottom: '2px' }}>Backend</span>
              <span style={{
                fontSize: '12px',
                animation: apiStatus.backend === 'online' ? 'pulse 2s infinite' :
                  apiStatus.backend === 'checking' ? 'spin 1s linear infinite' : 'none',
                opacity: apiStatus.backend === 'offline' ? 0.5 : 1
              }}>
                {apiStatus.backend === 'online' ? '🟢' : apiStatus.backend === 'offline' ? '🔴' : '🟡'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '6px',
              fontSize: '9px'
            }}>
              <span style={{ color: '#b8c5d6', marginBottom: '2px' }}>Trendminer</span>
              <span style={{
                fontSize: '12px',
                animation: apiStatus.trendminer === 'online' ? 'pulse 2s infinite' :
                  apiStatus.trendminer === 'checking' ? 'spin 1s linear infinite' : 'none',
                opacity: apiStatus.trendminer === 'offline' ? 0.5 : 1
              }}>
                {apiStatus.trendminer === 'online' ? '🟢' : apiStatus.trendminer === 'offline' ? '🔴' : '🟡'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '6px',
              fontSize: '9px'
            }}>
              <span style={{ color: '#b8c5d6', marginBottom: '2px' }}>DEX</span>
              <span style={{
                fontSize: '12px',
                animation: apiStatus.dex === 'online' ? 'pulse 2s infinite' :
                  apiStatus.dex === 'checking' ? 'spin 1s linear infinite' : 'none',
                opacity: apiStatus.dex === 'offline' ? 0.5 : 1
              }}>
                {apiStatus.dex === 'online' ? '🟢' : apiStatus.dex === 'offline' ? '🔴' : '🟡'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="genz-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
          <h4 style={{ margin: 0, color: 'var(--neon-pink)', fontSize: '16px' }}>Quick Actions</h4>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          <button
            className="genz-btn genz-btn-teal"
            style={{ fontSize: '12px', padding: '10px 14px', borderRadius: '12px' }}
            onClick={() => handleQuickAction('explore')}
            title="Explore and add tokens to your wallet"
          >
            🎯 Explore Tokens
          </button>
          <button
            className="genz-btn genz-btn-blue"
            style={{ fontSize: '12px', padding: '10px 14px', borderRadius: '12px' }}
            onClick={() => handleQuickAction('bridge')}
            title="Bridge assets from Ethereum to æternity"
          >
            🌉 Bridge Assets
          </button>
          <button
            className="genz-btn genz-btn-pink"
            style={{ fontSize: '12px', padding: '10px 14px', borderRadius: '12px' }}
            onClick={() => handleQuickAction('trending')}
            title="View trending tokens and topics"
          >
            🔥 Trending
          </button>
          <button
            className="genz-btn genz-btn-yellow"
            style={{ fontSize: '12px', padding: '10px 14px', borderRadius: '12px' }}
            onClick={() => handleQuickAction('governance')}
            title="Participate in governance"
          >
            🗳️ Governance
          </button>
          <button
            className="genz-btn genz-btn-purple"
            style={{ fontSize: '12px', padding: '10px 14px', borderRadius: '12px' }}
            onClick={() => handleQuickAction('meet')}
            title="Join or create a meeting"
          >
            🎥 Meet
          </button>
          <a
            href="https://quali.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="genz-btn genz-btn-teal"
            style={{
              fontSize: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            title="Join the community chat"
          >
            💬 Chat
          </a>
        </div>
      </div>

      {/* Live Trending Topics */}
      <div className="genz-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🔥</span>
          <h4 style={{ margin: 0, color: 'var(--neon-yellow)', fontSize: '16px' }}>Live Trending</h4>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--neon-teal)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              marginLeft: 'auto'
            }}
            onClick={() => navigate('/trending')}
            title="Explore all trends"
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
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--neon-pink)',
            animation: 'pulse 1s infinite'
          }} />
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          {trendingTags.slice(0, 6).map((tag, index) => (
            <div
              key={index}
              className="trending-topic"
              style={{
                padding: '8px 12px',
                background: `rgba(255,255,255,${0.03 + (index * 0.02)})`,
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '11px',
                color: '#b8c5d6',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => handleTrendingTopic(tag.tag)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `rgba(255,255,255,${0.03 + (index * 0.02)})`;
                e.currentTarget.style.color = '#b8c5d6';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
              title={`Search for ${tag.tag} (Score: ${tag.score})`}
            >
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '6px',
                fontSize: '8px',
                color: 'var(--neon-pink)',
                fontWeight: '600'
              }}>
                #{index + 1}
              </span>
              {tag.tag}
            </div>
          ))}
        </div>
      </div>

      {/* Top Tokens */}
      {topTokens.length > 0 && (
        <div className="genz-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px' }}>💎</span>
            <h4 style={{ margin: 0, color: 'var(--neon-purple)', fontSize: '16px' }}>Top Tokens</h4>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {topTokens.slice(0, 4).map((token, index) => (
              <div
                key={token.address}
                className="token-card"
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onClick={() => handleTokenClick(token)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title={`View ${token.name} details`}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: `hsl(${index * 60}, 70%, 60%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'white'
                }}>
                  {token.symbol?.charAt(0) || token.name?.charAt(0) || 'T'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'white', marginBottom: '2px' }}>
                    {token.name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {token.price && !isNaN(Number(token.price)) ? `${Number(token.price).toFixed(6)} AE` : 'N/A'}
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--neon-teal)',
                  fontWeight: '600'
                }}>
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      <div className="genz-card" style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            cursor: 'pointer'
          }}
          onClick={() => setShowLiveFeed(!showLiveFeed)}
          title="Click to toggle live feed"
        >
          <span style={{ fontSize: '18px' }}>📡</span>
          <h4 style={{ margin: 0, color: 'var(--neon-green)', fontSize: '16px' }}>Live Activity</h4>
          <span style={{
            fontSize: '12px',
            color: 'var(--neon-green)',
            marginLeft: 'auto',
            transition: 'transform 0.3s ease',
            transform: showLiveFeed ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </div>

        <div style={{
          maxHeight: showLiveFeed ? '300px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease'
        }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            {liveTransactions.map((tx, index) => (
              <div
                key={index}
                className={`live-activity-item ${tx.type === 'CREATED' ? 'new-token' : ''}`}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.03)',
                  fontSize: '10px',
                  color: '#b8c5d6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: index === 0 ? 'slideIn 0.5s ease' : 'none'
                }}
              >
                <span style={{
                  fontSize: '12px',
                  color: tx.type === 'CREATED' ? 'var(--neon-green)' : 'var(--neon-blue)'
                }}>
                  {tx.type === 'CREATED' ? '🆕' : '💱'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'white' }}>
                    {tx.token_name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {tx.type === 'CREATED' ? 'Token Created' : 'Transaction'}
                  </div>
                </div>
                <div style={{
                  fontSize: '8px',
                  color: '#64748b',
                  fontFamily: 'monospace'
                }}>
                  {new Date(tx.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Price Alerts */}
      {priceAlerts.length > 0 && (
        <div className="genz-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px' }}>📈</span>
            <h4 style={{ margin: 0, color: 'var(--neon-blue)', fontSize: '16px' }}>Price Alerts</h4>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {priceAlerts.map((alert, index) => (
              <div
                key={index}
                className={`price-alert ${alert.change > 0 ? 'positive' : 'negative'}`}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: alert.change > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px'
                }}>
                  {alert.change > 0 ? '📈' : '📉'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'white' }}>
                    {alert.token}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {Number(alert.price).toFixed(6)} AE
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  color: alert.change > 0 ? 'var(--neon-green)' : 'var(--neon-pink)',
                  fontWeight: '600'
                }}>
                  {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Enhanced Pro Tips */}
      <div className="genz-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            cursor: 'pointer'
          }}
          onClick={() => setShowTips(!showTips)}
          title="Click to expand tips"
        >
          <span style={{ fontSize: '18px' }}>💡</span>
          <h4 style={{ margin: 0, color: 'var(--neon-purple)', fontSize: '16px' }}>Pro Tips</h4>
          <span style={{
            fontSize: '12px',
            color: 'var(--neon-purple)',
            marginLeft: 'auto',
            transition: 'transform 0.3s ease',
            transform: showTips ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </div>

        <div style={{
          fontSize: '11px',
          color: '#b8c5d6',
          lineHeight: '1.4',
          maxHeight: showTips ? '600px' : '80px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease'
        }}>
          {enhancedTips.map((tip, index) => (
            <div key={index} style={{ marginBottom: '12px' }}>
              <div
                className="pro-tip"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'background 0.2s ease',
                  '--tip-color': tip.color
                } as React.CSSProperties}
                onClick={() => {
                  // Show expanded tip in a toast or modal
                  alert(`${tip.icon} ${tip.category}: ${tip.expanded}`);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                title={`${tip.category}: Click for more details`}>
                <strong style={{ color: tip.color, fontSize: '14px' }}>{tip.icon}</strong>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{tip.text}</span>
                  <div style={{
                    fontSize: '8px',
                    color: tip.color,
                    marginTop: '2px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {tip.category}
                  </div>
                </div>
              </div>
              {showTips && (
                <div style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  marginLeft: '26px',
                  marginTop: '6px',
                  fontStyle: 'italic',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  {tip.expanded}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
          
          .genz-spinner {
            border: 2px solid rgba(255,255,255,0.1);
            border-top: 2px solid var(--neon-teal);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
        `
      }} />
    </div>
  );
}


