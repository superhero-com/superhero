import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendminerApi } from '../../api/backend';
import MobileCard from '../../components/MobileCard';
import Sparkline from '../../components/Trendminer/Sparkline';
import TokenChat from '../../components/Trendminer/TokenChat';
import TvCandles from '../../components/Trendminer/TvCandles';
import { CONFIG } from '../../config';
import { QualiChatService, type QualiMessage } from '../../libs/QualiChatService';
import WebSocketClient from '../../libs/WebSocketClient';
import TradeCard from './TradeCard';
import { TokenSummary } from '../../features/bcl/components';

export default function TokenDetails() {
  const params = useParams();
  const addressOrName = params.tokenName as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wsUrl = CONFIG.TRENDMINER_WS_URL || '';
  const [holders, setHolders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'tx' | 'holders'>('chat');
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
    } catch { }
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
    } catch { }
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
      } catch { }
      try {
        const scoreResp = await TrendminerApi.getTokenScore(addressOrName);
        if (!cancelled) setScore(scoreResp || null);
      } catch { }

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
      } catch { }
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
      } catch { }
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
    <div className="flex flex-col items-center justify-center min-h-48 p-10 text-center">
      <div className="w-8 h-8 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin mb-4" />
      <span className="text-white/80">Loading token details...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-48 p-10 text-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl">
      {error}
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-48 p-10 text-center text-white/80">
      Token not found
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 flex-wrap mb-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
            #{data.name || data.symbol} {data.symbol ? (
              <span className="opacity-70 font-medium text-white/70">({data.symbol})</span>
            ) : null}
          </h1>
          <div className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white/80 font-semibold text-sm backdrop-blur-[10px]">
            MC RANK {mcRank != null ? `#${mcRank}` : '—'}
          </div>
        </div>
        {featuredMessage?.content?.body && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-sm font-semibold leading-snug text-purple-400 mb-2">
              {featuredMessage.content.body}
            </div>
            <div className="flex gap-3 text-xs text-white/60">
              <span>{featuredMessage.sender || 'user'}</span>
              <span>{new Date(featuredMessage.origin_server_ts || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Left Column: TradeCard, Token Info, Performance */}
        <div className="flex flex-col gap-6">
          {/* Trade Card */}
          <div className="w-full min-w-0">
            <TradeCard token={data} />
          </div>

          {/* Token Information Card */}
          <TokenSummary token={data} holders={holders} />

          {/* Performance Section */}
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <h3 className="text-xl font-bold text-white m-0 mb-6 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
              Performance
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] text-center">
                <div className="text-xs text-white/60 font-medium mb-1">24h</div>
                <div className={`text-lg font-bold ${Number(performance?.price_change_24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(performance?.price_change_24h ?? 0).toFixed(2)}%
                </div>
              </div>
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] text-center">
                <div className="text-xs text-white/60 font-medium mb-1">7d</div>
                <div className={`text-lg font-bold ${Number(performance?.price_change_7d ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(performance?.price_change_7d ?? 0).toFixed(2)}%
                </div>
              </div>
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] text-center">
                <div className="text-xs text-white/60 font-medium mb-1">30d</div>
                <div className={`text-lg font-bold ${Number(performance?.price_change_30d ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(performance?.price_change_30d ?? 0).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Sparkline points={perfSeries} width={280} height={64} />
            </div>
          </div>
        </div>

        {/* Right Column: Chart and Tabs */}
        <div className="flex flex-col gap-6">
          {/* Chart Section */}
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white m-0 mb-2 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
                Price Chart
              </h3>
              <div className="font-mono text-xs text-white/60">
                #{data.symbol}/AE on aeternity blockchain
              </div>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl bg-white/[0.05] border border-white/10">
              <TvCandles candles={candleSeries as any} height={400} />
            </div>

            <div className="flex gap-2 flex-wrap">
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
                  className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${intervalSec === sec
                      ? 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white border-transparent shadow-[0_4px_12px_rgba(255,107,107,0.3)]'
                      : 'border border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
                    }`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
                Community & Activity
              </h3>
            </div>

            <div className="flex gap-2 mb-6 bg-white/[0.05] border border-white/10 rounded-2xl p-1 backdrop-blur-[10px]">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeTab === 'chat'
                    ? 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white shadow-[0_4px_12px_rgba(255,107,107,0.3)]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                  }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('tx')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeTab === 'tx'
                    ? 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white shadow-[0_4px_12px_rgba(255,107,107,0.3)]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                  }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('holders')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeTab === 'holders'
                    ? 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white shadow-[0_4px_12px_rgba(255,107,107,0.3)]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                  }`}
              >
                Holders ({data?.holders_count ?? holders?.length ?? 0})
              </button>
            </div>

            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] min-h-[400px]">
              {activeTab === 'chat' && (
                <div>
                  <div className="text-xs text-white/60 mb-4 bg-white/[0.05] border border-white/10 rounded-xl p-3">
                    Comments are powered by Quali.chat. Click "Add comment" to post in the public room; messages appear here shortly after.
                  </div>
                  <TokenChat token={{ name: data.name, address: data.address || data.contract_address }} />
                </div>
              )}

              {activeTab === 'tx' && (
                <div>
                  <div className="flex flex-col gap-3 mb-4">
                    {transactions.map((tx, idx) => (
                      <div key={tx.tx_hash || tx.id || idx} className="flex justify-between items-center text-sm py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl">
                        <div className="font-mono text-white/80 max-w-48 overflow-hidden text-ellipsis whitespace-nowrap">
                          {(tx.tx_hash || '').slice(0, 8)}…{(tx.tx_hash || '').slice(-6)}
                        </div>
                        <div className="font-medium text-white">{tx.tx_type || 'TX'}</div>
                        <div className="text-white/60 text-xs">
                          {new Date(tx.created_at || Date.now()).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!transactions.length && (
                    <div className="text-white/60 text-sm text-center py-8">
                      No transactions
                    </div>
                  )}
                  {!txEnd && (
                    <button
                      onClick={loadMoreTx}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'holders' && (
                <div>
                  <div className="flex flex-col gap-3 mb-4">
                    {holders.map((h, idx) => (
                      <div key={h.address || h.account_address || idx} className="flex justify-between items-center text-sm py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl">
                        <div className="font-mono text-white/80 max-w-48 overflow-hidden text-ellipsis whitespace-nowrap">
                          {h.address || h.account_address}
                        </div>
                        <div className="font-medium text-white">
                          {formatTokenAmount(Number(h.balance ?? 0), Number(data.decimals ?? 18), 6)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!holders.length && (
                    <div className="text-white/60 text-sm text-center py-8">
                      No holders
                    </div>
                  )}
                  {!holdersEnd && (
                    <button
                      onClick={loadMoreHolders}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


