import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendminerApi } from '../../api/backend';
import { CONFIG } from '../../config';
import TradeCard from './TradeCard';
import WebSocketClient from '../../libs/WebSocketClient';
import Sparkline from '../../components/Trendminer/Sparkline';
import TokenChat from '../../components/Trendminer/TokenChat';
import TvCandles from '../../components/Trendminer/TvCandles';
import { QualiChatService, type QualiMessage } from '../../libs/QualiChatService';
import MobileCard from '../../components/MobileCard';
import MobileInput from '../../components/MobileInput';
import './TokenDetails.scss';

export default function TokenDetails() {
  const params = useParams();
  const addressOrName = params.tokenName as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wsUrl = CONFIG.TRENDMINER_WS_URL || '';
  const [holders, setHolders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat'|'tx'|'holders'>('chat');
  const holdersPageRef = useRef(1);
  const txPageRef = useRef(1);
  const [txEnd, setTxEnd] = useState(false);
  const [holdersEnd, setHoldersEnd] = useState(false);
  const [performance, setPerformance] = useState<any | null>(null);
  const [score, setScore] = useState<any | null>(null);
  const pageRef = useRef(1);
  const perfSeries = useMemo(() => {
    if (!performance) return [] as Array<{ x: number; y: number }>;
    const mapKey = (k: string) => Number(String(performance[k] ?? 0));
    return [
      { x: 1, y: mapKey('price_change_24h') },
      { x: 7, y: mapKey('price_change_7d') },
      { x: 30, y: mapKey('price_change_30d') },
    ];
  }, [performance]);
  const [candleSeries, setCandleSeries] = useState<any[]>([]);
  const [intervalSec, setIntervalSec] = useState<number>(5 * 60);
  const [featuredMessage, setFeaturedMessage] = useState<QualiMessage | null>(null);
  const [mcRank, setMcRank] = useState<number | null>(null);
  
  useEffect(() => {
    let cancel = false;
    async function loadFeatured() {
      try {
        const resp = await QualiChatService.getTokenMessages(data?.name || addressOrName, data?.address || data?.contract_address || addressOrName, { from: undefined, limit: 1 });
        const onlyText = (resp?.data || []).filter((m: any) => m?.content?.msgtype === 'm.text');
        if (!cancel) setFeaturedMessage(onlyText[0] || null);
      } catch {
        if (!cancel) setFeaturedMessage(null);
      }
    }
    loadFeatured();
    return () => { cancel = true; };
  }, [data?.address, data?.contract_address, data?.name, addressOrName]);

  // Prefer rank from payload if available; otherwise keep previous value
  useEffect(() => {
    if (!data) return;
    const candidates = [data.rank, data.current_rank, data.currentRank, data.market_cap_rank, data.position];
    const found = candidates.find((x: any) => typeof x === 'number');
    if (typeof found === 'number') setMcRank((prev) => (prev == null ? Number(found) : prev));
  }, [data?.rank, data?.current_rank, data?.currentRank, data?.market_cap_rank, data?.position]);

  useEffect(() => {
    let cancelled = false;
    async function loadRank() {
      try {
        const tokenAddr = (data?.sale_address as string) || (data?.address as string) || addressOrName;
        if (!tokenAddr) return;
        const resp: any = await TrendminerApi.listTokenRankings(tokenAddr, { limit: 10, page: 1 });
        let rank: number | null = null;
        const tryFields = ['rank', 'currentRank', 'current_rank', 'position'];
        for (const k of tryFields) {
          if (resp && typeof resp[k] === 'number') { rank = Number(resp[k]); break; }
        }
        if (rank == null && Array.isArray(resp?.items)) {
          const found = resp.items.find((it: any) => (it.address || it.contract_address || it.sale_address) === tokenAddr);
          if (found) {
            for (const k of tryFields) { if (typeof found[k] === 'number') { rank = Number(found[k]); break; } }
          }
          if (rank == null && typeof resp?.meta?.offset === 'number') {
            const idx = resp.items.findIndex((it: any) => (it.address || it.contract_address || it.sale_address) === tokenAddr);
            if (idx >= 0) rank = Number(resp.meta.offset) + idx + 1;
          }
        }
        if (!cancelled && typeof rank === 'number') setMcRank(rank);
      } catch {
        // keep previous rank on failures
      }
    }
    loadRank();
    return () => { cancelled = true; };
  }, [data?.sale_address, data?.address, addressOrName]);
  
  useEffect(() => {
    let cancelled = false;
    async function loadCandles() {
      if (!data?.sale_address) return;
      try {
        const resp = await TrendminerApi.getTokenHistory(data.sale_address, { interval: intervalSec, convertTo: 'ae', limit: 200, page: 1 });
        const items = Array.isArray(resp?.pages) ? resp.pages.flat() : (Array.isArray(resp) ? resp : []);
        const mapped = items.map((it: any) => ({
          time: new Date(it.timeClose).getTime(),
          open: Number(it.quote.open),
          high: Number(it.quote.high),
          low: Number(it.quote.low),
          close: Number(it.quote.close),
          volume: Number(it.quote.volume),
        })).sort((a: any, b: any) => a.time - b.time);
        if (!cancelled) setCandleSeries(mapped);
      } catch (e) {
        // ignore for now; keep whatever is shown
      }
    }
    loadCandles();
    return () => { cancelled = true; };
  }, [data?.sale_address, intervalSec]);

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  }

  function formatAe(n: number, digits = 6) {
    return `${normalizeAe(n).toFixed(digits)} AE`;
  }

  function formatInt(n: number) {
    if (!isFinite(n)) return '0';
    return Math.round(n).toLocaleString();
  }

  function formatTokenAmount(aettos: number, decimals: number = 18, fractionDigits = 0) {
    if (!isFinite(aettos)) return '0';
    const units = aettos / Math.pow(10, decimals);
    return units.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.fetchJson(`/api/tokens/${encodeURIComponent(addressOrName)}`);
        if (!cancelled) setData(resp);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load token');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (addressOrName) load();
    return () => { cancelled = true; };
  }, [addressOrName]);

  async function loadMoreTx() {
    if (txEnd) return;
    try {
      const tokenAddress = (data?.sale_address as string) || addressOrName;
      if (!tokenAddress) return;
      const resp = await TrendminerApi.listTokenTransactions(tokenAddress, { limit: 10, page: txPageRef.current });
      const list = resp?.items ?? resp ?? [];
      setTransactions((prev) => [...prev, ...list]);
      const totalPages = resp?.meta?.totalPages;
      const currentPage = resp?.meta?.currentPage ?? txPageRef.current;
      txPageRef.current = currentPage + 1;
      if (totalPages && currentPage >= totalPages) setTxEnd(true);
      if (!resp?.meta && list.length < 10) setTxEnd(true);
    } catch {}
  }

  async function loadMoreHolders() {
    if (holdersEnd) return;
    try {
      const tokenAddress = (data?.sale_address as string) || addressOrName;
      if (!tokenAddress) return;
      const resp = await TrendminerApi.listTokenHolders(tokenAddress, { limit: 10, page: holdersPageRef.current });
      const list = resp?.items ?? resp ?? [];
      setHolders((prev) => [...prev, ...list]);
      const totalPages = resp?.meta?.totalPages;
      const currentPage = resp?.meta?.currentPage ?? holdersPageRef.current;
      holdersPageRef.current = currentPage + 1;
      if (totalPages && currentPage >= totalPages) setHoldersEnd(true);
      if (!resp?.meta && list.length < 10) setHoldersEnd(true);
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    // reset pagination and lists when token changes or when sale address becomes available
    setHolders([]);
    setTransactions([]);
    setHoldersEnd(false);
    setTxEnd(false);
    holdersPageRef.current = 1;
    txPageRef.current = 1;

    async function loadExtra() {
      try {
        const perf = await TrendminerApi.getTokenPerformance(addressOrName);
        if (!cancelled) setPerformance(perf || null);
      } catch {}
      try {
        const scoreResp = await TrendminerApi.getTokenScore(addressOrName);
        if (!cancelled) setScore(scoreResp || null);
      } catch {}

      const tokenAddress = (data?.sale_address as string) || addressOrName;
      if (!tokenAddress) return;
      try {
        const resp = await TrendminerApi.listTokenHolders(tokenAddress, { limit: 10, page: holdersPageRef.current });
        const arr = resp?.items ?? resp ?? [];
        if (!cancelled) {
          setHolders(arr);
          const currentPage = resp?.meta?.currentPage ?? 1;
          const totalPages = resp?.meta?.totalPages;
          holdersPageRef.current = currentPage + 1;
          if ((totalPages && currentPage >= totalPages) || (!resp?.meta && arr.length < 10)) setHoldersEnd(true);
        }
      } catch {}
      try {
        const tx = await TrendminerApi.listTokenTransactions(tokenAddress, { limit: 10, page: txPageRef.current });
        const list = tx?.items ?? tx ?? [];
        if (!cancelled) {
          setTransactions(list);
          const currentPage = tx?.meta?.currentPage ?? 1;
          const totalPages = tx?.meta?.totalPages;
          txPageRef.current = currentPage + 1;
          if ((totalPages && currentPage >= totalPages) || (!tx?.meta && list.length < 10)) setTxEnd(true);
        }
      } catch {}
    }
    if (addressOrName) loadExtra();
    return () => { cancelled = true; };
  }, [addressOrName, data?.sale_address]);

  useEffect(() => {
    if (!wsUrl) return;
    WebSocketClient.connect(wsUrl);
  }, [wsUrl]);

  useEffect(() => {
    if (!data?.sale_address) return;
    const unsub = WebSocketClient.subscribe(`TokenUpdated::${data.sale_address}`, (payload) => {
      setData((prev: any) => ({ ...(prev || {}), ...payload }));
    });
    const unsub2 = WebSocketClient.subscribe(`TokenHistory::${data.sale_address}`, (tx: any) => {
      setCandleSeries((curr) => {
        const currentTime = Date.now();
        const last = curr[curr.length - 1];
        const within = last ? (Math.floor(currentTime / 1000) - Math.floor((last.time as any) / 1000) < intervalSec) : false;
        const price = Number(tx?.data?.buy_price?.ae ?? tx?.data?.price ?? 0);
        if (!price) return curr;
        if (within && last) {
          const updated = { ...last } as any;
          updated.high = Math.max(updated.high, price);
          updated.low = Math.min(updated.low, price);
          updated.close = price;
          return [...curr.slice(0, -1), updated];
        }
        return [...curr, { time: currentTime, open: price, high: price, low: price, close: price }];
      });
    });
    return () => { unsub(); unsub2(); };
  }, [data?.sale_address, intervalSec]);

  if (loading) return (
    <div className="token-details-loading">
      <div className="loading-spinner" />
      <span>Loading token details...</span>
    </div>
  );
  
  if (error) return (
    <div className="token-details-error">
      {error}
    </div>
  );
  
  if (!data) return (
    <div className="token-details-not-found">
      Token not found
    </div>
  );

  return (
    <div className="token-details mobile-container tw-container">
      {/* Header */}
      <div className="token-header">
        <div className="token-title-section">
          <h1 className="token-name">#{data.name || data.symbol} {data.symbol ? <span style={{ opacity: 0.7, fontWeight: 500 }}>(#{data.symbol})</span> : null}</h1>
          <div className="token-rank">
            MC RANK {mcRank != null ? `#${mcRank}` : '—'}
          </div>
        </div>
        {featuredMessage?.content?.body && (
          <div className="token-first-message">
            <div className="first-message-body">{featuredMessage.content.body}</div>
            <div className="first-message-meta">
              <span className="first-message-author">{featuredMessage.sender || 'user'}</span>
              <span className="first-message-time">{new Date(featuredMessage.origin_server_ts || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="token-content">
        {/* Trade Card */}
        <div className="trade-section">
          <TradeCard token={data} />
        </div>

        {/* Token Details Card */}
        <MobileCard variant="elevated" padding="medium" className="token-details-card">
          <div className="token-details-header">
            <h3 className="token-details-title">Token Information</h3>
          </div>
          
          <div className="token-details-grid">
            <div className="detail-item">
              <label className="detail-label">Price</label>
              <div className="detail-value">{formatAe(Number(data.price ?? 0))}</div>
            </div>
            <div className="detail-item">
              <label className="detail-label">Market Cap</label>
              <div className="detail-value">{formatAe(Number(data.market_cap ?? 0), 6)}</div>
            </div>
            <div className="detail-item">
              <label className="detail-label">Total Supply</label>
              <div className="detail-value">{formatTokenAmount(Number(data.total_supply ?? 0), Number(data.decimals ?? 18), 0)} Tokens</div>
            </div>
            <div className="detail-item">
              <label className="detail-label">Holders</label>
              <div className="detail-value">{data?.holders_count ?? holders?.length ?? 0}</div>
            </div>
          </div>

          <div className="token-addresses">
            <div className="address-item">
              <label className="address-label">Contract Address</label>
              <div className="address-value">
                {(data.address || data.contract_address || '').slice(0, 8)}…{(data.address || data.contract_address || '').slice(-6)}
              </div>
            </div>
            <div className="address-item">
              <label className="address-label">Sale Address</label>
              <div className="address-value">
                {(data.sale_address || '').slice(0, 8)}…{(data.sale_address || '').slice(-6)}
              </div>
            </div>
          </div>

          <div className="token-description prose prose-invert">
            This token uses a bonding curve: buying mints new tokens at a higher price; selling burns tokens and returns AE along the curve.
            A portion of trades feeds the token's DAO treasury for proposals and payouts.
          </div>

          <div className="token-actions">
            {data.sale_address && (
              <a href={`/trendminer/dao/${encodeURIComponent(data.sale_address)}`} className="action-btn primary">
                Open DAO
              </a>
            )}
            <a href="/trendminer/invite" className="action-btn secondary">
              Invite & Earn
            </a>
            <a
              href={`https://aescan.io/contracts/${encodeURIComponent((data.sale_address || data.address || '') as string)}?type=call-transactions`}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn secondary"
            >
              View on æScan ↗
            </a>
          </div>
        </MobileCard>

        {/* Chart Section */}
        <MobileCard variant="elevated" padding="medium" className="chart-section">
          <div className="chart-header">
            <div className="chart-title">#{data.symbol}/AE on aeternity blockchain</div>
          </div>
          
          {/* Featured comment moved to header */}
          
          <div className="chart-container">
            <TvCandles candles={candleSeries as any} height={300} />
          </div>
          
          <div className="chart-controls">
            <div className="interval-buttons">
              {[
                ['1m', 60],
                ['5m', 5 * 60],
                ['15m', 15 * 60],
                ['1h', 60 * 60],
                ['4h', 4 * 60 * 60],
                ['D', 24 * 60 * 60],
                ['W', 7 * 24 * 60 * 60],
                ['M', 30 * 24 * 60 * 60],
              ].map(([label, sec]) => (
                <button 
                  key={label as string} 
                  onClick={() => setIntervalSec(sec as number)} 
                  className={`interval-btn ${intervalSec === sec ? 'active' : ''}`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>
        </MobileCard>

        {/* Tabs Section */}
        <MobileCard variant="elevated" padding="medium" className="tabs-section">
          <div className="tabs-header">
            <button 
              onClick={() => setActiveTab('chat')} 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('tx')} 
              className={`tab-btn ${activeTab === 'tx' ? 'active' : ''}`}
            >
              Transactions
            </button>
            <button 
              onClick={() => setActiveTab('holders')} 
              className={`tab-btn ${activeTab === 'holders' ? 'active' : ''}`}
            >
              Holders ({data?.holders_count ?? holders?.length ?? 0})
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'chat' && (
              <div className="chat-tab">
                <div className="chat-description">
                  Comments are powered by Quali.chat. Click "Add comment" to post in the public room; messages appear here shortly after.
                </div>
                <TokenChat token={{ name: data.name, address: data.address || data.contract_address }} />
              </div>
            )}
            
            {activeTab === 'tx' && (
              <div className="transactions-tab">
                <div className="transactions-list">
                  {transactions.map((tx, idx) => (
                    <div key={tx.tx_hash || tx.id || idx} className="transaction-item">
                      <div className="tx-hash">{(tx.tx_hash || '').slice(0, 8)}…{(tx.tx_hash || '').slice(-6)}</div>
                      <div className="tx-type">{tx.tx_type || 'TX'}</div>
                      <div className="tx-time">{new Date(tx.created_at || Date.now()).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                {!transactions.length && <div className="empty-state">No transactions</div>}
                {!txEnd && (
                  <button onClick={loadMoreTx} className="load-more-btn">
                    Load more
                  </button>
                )}
              </div>
            )}
            
            {activeTab === 'holders' && (
              <div className="holders-tab">
                <div className="holders-list">
                  {holders.map((h, idx) => (
                    <div key={h.address || h.account_address || idx} className="holder-item">
                      <div className="holder-address">{h.address || h.account_address}</div>
                      <div className="holder-balance">{formatTokenAmount(Number(h.balance ?? 0), Number(data.decimals ?? 18), 6)}</div>
                    </div>
                  ))}
                </div>
                {!holders.length && <div className="empty-state">No holders</div>}
                {!holdersEnd && (
                  <button onClick={loadMoreHolders} className="load-more-btn">
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>
        </MobileCard>

        {/* Performance Section */}
        <div className="performance-section">
          <MobileCard variant="elevated" padding="medium" className="performance-card">
            <h3 className="performance-title">Performance</h3>
            <div className="performance-stats">
              <div className="perf-stat">
                <span className="perf-label">24h:</span>
                <span className="perf-value">{Number(performance?.price_change_24h ?? 0).toFixed(2)}%</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">7d:</span>
                <span className="perf-value">{Number(performance?.price_change_7d ?? 0).toFixed(2)}%</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">30d:</span>
                <span className="perf-value">{Number(performance?.price_change_30d ?? 0).toFixed(2)}%</span>
              </div>
            </div>
            <div className="performance-chart">
              <Sparkline points={perfSeries} width={280} height={64} />
            </div>
          </MobileCard>
        </div>
      </div>
    </div>
  );
}


