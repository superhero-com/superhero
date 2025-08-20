import React, { useEffect, useMemo, useState } from 'react';
import WebSocketClient from '../libs/WebSocketClient';
import { CONFIG } from '../config';
import { TrendminerApi } from '../api/backend';
import GlobalStatsAnalytics from '../components/Trendminer/GlobalStatsAnalytics';
import TokenMiniChart from '../components/Trendminer/TokenMiniChart';
import LatestTransactionsCarousel from '../components/Trendminer/LatestTransactionsCarousel';
import TrendingPillsCarousel from '../components/Trendminer/TrendingPillsCarousel';
import WalletConnectBtn from '../components/WalletConnectBtn';
import AeButton from '../components/AeButton';
import MobileTrendingLayout from '../components/Trendminer/MobileTrendingLayout';
import MobileTrendingBanner from '../components/Trendminer/MobileTrendingBanner';
import MobileTrendingControls from '../components/Trendminer/MobileTrendingControls';
import MobileTrendingTokenCard from '../components/Trendminer/MobileTrendingTokenCard';
import MobileTrendingTagCard from '../components/Trendminer/MobileTrendingTagCard';
import MobileTrendingPagination from '../components/Trendminer/MobileTrendingPagination';
import './Trending.scss';

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

export default function Trending() {
  const [tags, setTags] = useState<Array<{ tag: string; score: number; source?: string }>>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [recent, setRecent] = useState<TokenItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<'trending_score'|'market_cap'|'name'|'price'|'holders_count'|'created_at'>('market_cap');
  const [orderDirection, setOrderDirection] = useState<'ASC'|'DESC'>('DESC');
  const [timeframe, setTimeframe] = useState<'30D'|'7D'|'1D'>('30D');
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, TokenItem>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 100;
  
  // Mobile detection - using multiple methods for reliable detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      // Check screen width
      const screenMobile = window.matchMedia('(max-width: 768px)').matches;
      // Check user agent for mobile devices
      const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      // Check touch capability
      const touchMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const mobile = screenMobile || (userAgentMobile && touchMobile);
      setIsMobile(mobile);
    };
    
    checkMobile();
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    mediaQuery.addEventListener('change', checkMobile);
    return () => mediaQuery.removeEventListener('change', checkMobile);
  }, []);

  const selectValue = useMemo(() => {
    if (orderBy === 'created_at') return orderDirection === 'ASC' ? 'oldest' : 'newest';
    return orderBy;
  }, [orderBy, orderDirection]);

  function setSortFromSelect(value: string) {
    if (value === 'newest') { setOrderBy('created_at'); setOrderDirection('DESC'); return; }
    if (value === 'oldest') { setOrderBy('created_at'); setOrderDirection('ASC'); return; }
    setOrderBy(value as any);
    setOrderDirection('DESC');
  }

  function toggleSort(key: 'trending_score'|'market_cap'|'name'|'price'|'holders_count'|'created_at') {
    if (orderBy === key) {
      setOrderDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setOrderBy(key);
      setOrderDirection(key === 'name' ? 'ASC' : 'DESC');
    }
  }

  function SortHeader({ label, keyName }: { label: string; keyName: 'trending_score'|'market_cap'|'name'|'price'|'holders_count'|'created_at' }) {
    const active = orderBy === keyName;
    const arrow = active ? (orderDirection === 'ASC' ? '▲' : '▼') : '';
    return (
      <button
        onClick={() => toggleSort(keyName)}
        style={{ 
          border: 0, 
          background: 'transparent', 
          textAlign: 'left', 
          padding: 0, 
          fontSize: 12, 
          opacity: active ? 1 : 0.7, 
          fontWeight: active ? 700 as any : 500,
          color: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        aria-label={`Sort by ${label}`}
      >
        {label} {arrow}
      </button>
    );
  }

  useEffect(() => {
    // Connect WS for live updates on trending lists
    if (CONFIG.TRENDMINER_WS_URL) WebSocketClient.connect(CONFIG.TRENDMINER_WS_URL);
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [tagsResp, tokensResp, recentResp] = await Promise.all([
          TrendminerApi.listTrendingTags({ orderBy: 'score', orderDirection: 'DESC', limit: 50 }),
          TrendminerApi.listTokens({ orderBy: orderBy as any, orderDirection, limit: PAGE_SIZE, page, search: search || undefined }),
          TrendminerApi.listTokens({ orderBy: 'created_at' as any, orderDirection: 'DESC', limit: 6, page: 1 }),
        ]);
        const tagsItems = Array.isArray(tagsResp?.items) ? tagsResp.items : (Array.isArray(tagsResp) ? tagsResp : []);
        const mappedTags = tagsItems.map((it: any) => ({ tag: it.tag ?? it.name ?? '', score: Number(it.score ?? it.value ?? 0), source: it.source || it.platform || undefined }));
        const list: TokenItem[] = tokensResp?.items ?? tokensResp ?? [];
        const recentList: TokenItem[] = recentResp?.items ?? recentResp ?? [];
        if (!cancelled) {
          setTags(mappedTags);
          setTokens(list);
          setRecent(recentList);
          const apiTotalPages = tokensResp?.meta?.totalPages;
          const inferred = list.length === PAGE_SIZE ? page + 1 : page;
          setTotalPages(apiTotalPages ?? inferred);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load trending data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [orderBy, orderDirection, search, page]);

  // Reset to page 1 when sort or search changes
  useEffect(() => { setPage(1); }, [orderBy, orderDirection, search]);

  // Build a mapping of trending tags -> tokenized token info (if exists)
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

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    // If value looks like aettos (>= 1e12), convert to AE
    return n >= 1e12 ? n / 1e18 : n;
  }

  // Mobile layout
  if (isMobile) {
    return (
      <MobileTrendingLayout
          title="Trending"
          subtitle="Discover and tokenize the latest trends"
        >
        <MobileTrendingBanner />
        
        <LatestTransactionsCarousel />
        
        <TrendingPillsCarousel tagTokenMap={tagTokenMap} />
        
        <MobileTrendingControls
          search={search}
          onSearchChange={setSearch}
          orderBy={selectValue}
          onOrderByChange={setSortFromSelect}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          loading={loading}
        />
        
        {/* Tokenized Trends Section */}
        <div className="mobile-trending-section">
          <h2 className="section-title">Tokenized Trends</h2>
          
          {loading && (
            <div className="mobile-loading">
              <div className="loading-spinner"></div>
              <span>Loading trending tokens...</span>
            </div>
          )}
          
          {error && (
            <div className="mobile-error">
              <div className="error-icon">⚠️</div>
              <div className="error-title">Error Loading Data</div>
              <div className="error-description">{error}</div>
            </div>
          )}
          
          {!loading && !error && tokens.length === 0 && (
            <div className="mobile-empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No tokens found</div>
              <div className="empty-description">
                {search ? 'Try adjusting your search criteria' : 'Check back later for new trending tokens'}
              </div>
            </div>
          )}
          
          {!loading && !error && tokens.length > 0 && (
            <div className="mobile-tokens-list">
              {tokens.map((token, idx) => (
                <MobileTrendingTokenCard
                  key={token.address}
                  token={token}
                  rank={(page - 1) * PAGE_SIZE + idx + 1}
                  timeframe={timeframe}
                  className={loading ? 'mobile-trending-token-card--loading' : ''}
                />
              ))}
            </div>
          )}
          
          {!loading && !error && tokens.length > 0 && (
            <MobileTrendingPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </div>
        
        {/* Explore Trends Section */}
        <div className="mobile-trending-section">
          <h2 className="section-title">Explore Trends</h2>
          
          <div className="mobile-tags-list">
            {tags.slice(0, 12).map((tag) => {
              const token = tagTokenMap[tag.tag];
              return (
                <MobileTrendingTagCard
                  key={tag.tag}
                  tag={tag.tag}
                  score={tag.score}
                  source={tag.source}
                  token={token}
                  className={loading ? 'mobile-trending-tag-card--loading' : ''}
                />
              );
            })}
          </div>
        </div>
      </MobileTrendingLayout>
    );
  }

  // Desktop layout
  return (
    <div className="trending-page">
      {/* Banner */}
      <div className="trending-banner">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>Tokenize Trends.<br/>Own the Hype.<br/>Build Communities.</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <AeButton 
                variant="primary" 
                size="md" 
                rounded
                onClick={() => window.location.href = '/trendminer/create'}
              >
                Tokenize a Trend
              </AeButton>
              <AeButton 
                variant="secondary" 
                size="md" 
                rounded
                outlined
                onClick={() => window.open('https://wallet.superhero.com', '_blank')}
              >
                Get Superhero Wallet ↘
              </AeButton>
              <AeButton 
                variant="accent" 
                size="md" 
                rounded
                onClick={() => window.location.href = '/trendminer/daos'}
              >
                Explore DAOs
              </AeButton>
              <AeButton 
                variant="ghost" 
                size="md" 
                rounded
                onClick={() => window.location.href = '/trendminer/invite'}
              >
                Invite & Earn
              </AeButton>
              <WalletConnectBtn />
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 10, maxWidth: 720, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Tokenized trends are community tokens launched on a bonding curve. Price moves with buys/sells, no order books.
              Each token mints a DAO treasury that can fund initiatives via on-chain votes. Connect your wallet to trade and participate.
            </div>
          </div>
          <div style={{ minWidth: 300, flex: '0 0 auto' }}>
            <GlobalStatsAnalytics />
          </div>
        </div>
      </div>

      <LatestTransactionsCarousel />
      
      <TrendingPillsCarousel tagTokenMap={tagTokenMap} />

      {/* Main content */}
      <div className="trending-main-content">
        {/* Left: Tokenized Trends */}
        <div style={{ minWidth: 0 }}>
          <div className="trending-controls">
            <div className="controls-title">Tokenized Trends</div>
            <div className="controls-buttons">
              <select className="flat-select" value={selectValue as any} onChange={(e) => setSortFromSelect(e.target.value)}>
                <option value="trending_score">Hot</option>
                <option value="market_cap">Market Cap</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="holders_count">Holders</option>
              </select>
              <input id="trend-search" name="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ padding: '8px 12px', minWidth: 200, maxWidth: 280, borderRadius: 8, border: '1px solid var(--search-nav-border-color)' }} />
              <select className="flat-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value as any)}>
                <option value="30D">30D</option>
                <option value="7D">7D</option>
                <option value="1D">1D</option>
              </select>
            </div>
          </div>

          <div className="trending-table-container">
            <div className="trending-table">
              <div>
                <SortHeader label="Rank" keyName="market_cap" />
              </div>
              <div>
                <SortHeader label="# Token" keyName="name" />
              </div>
              <div>
                <SortHeader label="Price" keyName="price" />
              </div>
              <div>
                <SortHeader label="Market Cap" keyName="market_cap" />
              </div>
              <div>
                <SortHeader label="Holders" keyName="holders_count" />
              </div>
              <div>
                <SortHeader label="Mini Chart" keyName="trending_score" />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 4, minWidth: 'fit-content' }}>
              {tokens.map((t, idx) => (
                <a key={t.address} href={`/trendminer/tokens/${encodeURIComponent(t.name || t.address)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="trending-table-row">
                    <div className="table-rank">{(page - 1) * PAGE_SIZE + idx + 1}</div>
                    <div className="table-name">#{t.name || t.symbol} {t.symbol ? <span style={{ opacity: 0.7 }}>({`#${t.symbol}`})</span> : null}</div>
                    <div className="table-price">{normalizeAe(Number(t.price ?? 0)).toFixed(6)} AE</div>
                    <div className="table-market-cap">{normalizeAe(Number(t.market_cap ?? 0)).toLocaleString()} AE</div>
                    <div className="table-holders">{t.holders_count ?? 0}</div>
                    <div className="table-chart">
                      <TokenMiniChart address={t.sale_address || t.address} width={120} height={28} stroke="#ff6d15" timeframe={timeframe} />
                    </div>
                  </div>
                </a>
              ))}
              {loading && <div style={{ padding: 12 }}>Loading…</div>}
              {error && <div style={{ padding: 12, color: 'tomato' }}>{error}</div>}
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <AeButton 
                variant="ghost" 
                size="sm" 
                rounded
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </AeButton>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Page {page} of {totalPages}</span>
              <AeButton 
                variant="ghost" 
                size="sm" 
                rounded
                disabled={totalPages > 0 ? page >= totalPages : false}
                onClick={() => setPage((p) => Math.min(totalPages || p + 1, p + 1))}
              >
                Next
              </AeButton>
            </div>
          </div>
        </div>

        {/* Right: Explore Trends */}
        <div className="trending-sidebar">
          <div className="sidebar-title">Explore Trends</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select style={{ padding: '6px 10px', borderRadius: 999 }} defaultValue={'Most Trending'}>
              <option>Most Trending</option>
              <option>Latest</option>
            </select>
            <input id="explore-search" name="search" placeholder="Search" style={{ padding: '8px 12px', flex: 1, borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)' }} />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {tags.slice(0, 12).map((it) => {
              const tok = tagTokenMap[it.tag];
              return (
                <div key={it.tag} className="sidebar-item">
                  <div className="item-name">#{it.tag.toUpperCase()}</div>
                  <div className="item-details">
                    {!tok && (
                      <>
                        <span>↑ {it.score.toLocaleString()}</span>
                        {it.source && (
                          <a
                            href={`https://x.com/search?q=${encodeURIComponent('#' + it.tag)}&src=typed_query`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            via {it.source}
                          </a>
                        )}
                      </>
                    )}
                    {tok ? (
                      <>
                        <span>{normalizeAe(Number(tok.price ?? 0)).toFixed(6)} AE</span>
                        <span>Holders: {tok.holders_count ?? 0}</span>
                        <AeButton 
                          variant="accent" 
                          size="xs" 
                          outlined
                          onClick={() => window.location.href = `/trendminer/tokens/${encodeURIComponent(tok.name || tok.address)}`}
                          style={{ marginLeft: 8 }}
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
                         style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 999, fontSize: 10 }}
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
      </div>
    </div>
  );
}


