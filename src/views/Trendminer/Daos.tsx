import { AeSdk, Node } from '@aeternity/aepp-sdk';
import { useEffect, useMemo, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import TokenMiniChart from '../../components/Trendminer/TokenMiniChart';
import { CONFIG } from '../../config';

import { useAeSdk } from '../../hooks';
type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  market_cap?: number;
  holders_count?: number;
  created_at?: string;
  sale_address?: string;
  trending_score?: number;
};

export default function Daos() {
  const { sdk, activeAccount } = useAeSdk();
  const [items, setItems] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'market_cap' | 'holders_count' | 'created_at'>('market_cap');
  const [treasuryMap, setTreasuryMap] = useState<Record<string, number>>({});
  const [ownedContracts, setOwnedContracts] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  let bctsl: any;
  async function ensureBctsl() {
    if (!bctsl) bctsl = await import('bctsl-sdk');
    return bctsl;
  }

  // Provide read-only SDK when wallet is not connected
  let cachedReadOnlySdk: AeSdk | null = null;
  async function getSdk(): Promise<AeSdk | null> {
    try {
      if (cachedReadOnlySdk) return cachedReadOnlySdk;
      if (!CONFIG.NODE_URL) return null;
      const node = new Node(CONFIG.NODE_URL);
      cachedReadOnlySdk = new AeSdk({ nodes: [{ name: 'read', instance: node }] });
      return cachedReadOnlySdk;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true); setError(null);
      try {
        const aggregated: TokenItem[] = [];
        let cur = 1;
        const perPage = 200;
        while (true) {
          const resp = await TrendminerApi.listTokens({ orderBy: sort, orderDirection: 'DESC', limit: perPage, page: cur, search: search || undefined });
          const chunk: TokenItem[] = (resp?.items ?? resp ?? []).filter((t: any) => !!t.sale_address);
          if (chunk.length === 0) break;
          aggregated.push(...chunk);
          if (chunk.length < perPage) break;
          cur += 1;
          if (cur > 50) break;
          if (cancelled) return;
        }
        if (!cancelled) {
          setItems(aggregated);
          setPage(1);
        }
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Failed to load DAOs'); }
      finally { if (!cancelled) setLoading(false); }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [search, sort]);

  // Detect which DAO tokens the user holds (by AEX9 balance > 0)
  useEffect(() => {
    let cancelled = false;
    async function loadBalances() {
      try {
        if (!activeAccount) { if (!cancelled) setOwnedContracts(new Set()); return; }
        const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
        if (!base) { if (!cancelled) setOwnedContracts(new Set()); return; }
        const collected: string[] = [];
        let cursor: string | null = `/v3/accounts/${activeAccount}/aex9/balances`;
        let guard = 0;
        while (cursor && guard++ < 20) {
          const r = await fetch(`${base}${cursor.startsWith('/') ? '' : '/'}${cursor}`, { cache: 'no-cache' });
          if (!r.ok) break;
          const mdw = await r.json();
          const items: any[] = Array.isArray(mdw?.data) ? mdw.data : [];
          for (const it of items) {
            const ct = it?.contract_id;
            const bal = it?.amount ?? it?.balance;
            if (ct && (bal != null)) {
              try {
                const bn = typeof bal === 'bigint' ? bal : BigInt(String(bal));
                if (bn > 0n) collected.push(String(ct).toLowerCase());
              } catch { }
            }
          }
          cursor = mdw?.next || null;
        }
        if (cancelled) return;
        const set = new Set(collected);
        setOwnedContracts(set);
      } catch {
        if (!cancelled) setOwnedContracts(new Set());
      }
    }
    loadBalances();
    return () => { cancelled = true; };
  }, [activeAccount]);

  const ownedFirstItems = useMemo(() => {
    if (!items.length) return items;
    const isOwned = (addr?: string | null) => !!addr && ownedContracts.has(String(addr).toLowerCase());
    const owned: TokenItem[] = [];
    const rest: TokenItem[] = [];
    for (const it of items) { (isOwned(it.address) ? owned : rest).push(it); }
    return owned.concat(rest);
  }, [items, ownedContracts]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(ownedFirstItems.length / PAGE_SIZE)), [ownedFirstItems.length]);
  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return ownedFirstItems.slice(start, start + PAGE_SIZE);
  }, [ownedFirstItems, page]);

  useEffect(() => {
    let cancelled = false;
    async function refreshTreasuries() {
      try {
        const sdk = await getSdk();
        if (!sdk) return;
        await ensureBctsl();
        const { initFallBack } = bctsl;
        const sales = Array.from(new Set(visibleItems.map((i) => i.sale_address).filter(Boolean) as string[]));
        const results = await Promise.allSettled(sales.map(async (addr) => {
          const factory = await initFallBack(sdk, addr);
          const dao = await factory.checkAndGetDAO();
          const bal = await dao.balanceAettos();
          return [addr, Number(bal) / 1e18] as const;
        }));
        if (cancelled) return;
        const map: Record<string, number> = {};
        results.forEach((r) => { if (r.status === 'fulfilled') { const [addr, val] = r.value; map[addr] = val; } });
        setTreasuryMap(map);
      } catch {
        // ignore
      }
    }
    if (visibleItems.length) refreshTreasuries();
    return () => { cancelled = true; };
  }, [visibleItems]);

  const sortedItems = useMemo(() => {
    if (!items.length) return items;
    const isOwned = (addr?: string | null) => !!addr && ownedContracts.has(String(addr).toLowerCase());
    const owned: TokenItem[] = [];
    const rest: TokenItem[] = [];
    for (const it of items) {
      if (isOwned(it.address)) owned.push(it); else rest.push(it);
    }
    // Preserve API-provided order within each group
    return owned.concat(rest);
  }, [items, ownedContracts]);

  return (
    <div className="max-w-6xl mx-auto p-4 text-white">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="text-3xl font-extrabold text-white">
          DAOs
        </div>
        <div className="flex gap-2">
          <input 
            placeholder="Search" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="px-4 py-2.5 rounded-2xl border border-white/20 bg-gradient-to-b from-white/8 to-white/4 text-white backdrop-blur-lg shadow-lg placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
          <select 
            className="px-4 py-2.5 rounded-2xl border border-white/20 bg-gradient-to-b from-white/8 to-white/4 text-white backdrop-blur-lg shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" 
            value={sort} 
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="market_cap">Market Cap</option>
            <option value="holders_count">Holders</option>
            <option value="created_at">Newest</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-white/80">Loading…</div>}
      {error && <div className="text-center py-8 text-red-400">{error}</div>}

      <div className="text-sm opacity-80 mt-2 mb-4 text-white/85">
        DAOs hold protocol fees collected from trades. Each card shows the treasury balance for that token, along with basic stats.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        {visibleItems.map((t) => {
          const isOwned = ownedContracts.has(String(t.address).toLowerCase());
          return (
            <div 
              className={`border rounded-2xl p-4 bg-gradient-to-b from-gray-800/85 to-gray-900/70 text-white shadow-lg transition-all duration-150 hover:-translate-y-1 hover:shadow-2xl ${
                isOwned ? 'border-purple-500/50 shadow-purple-500/25 relative' : 'border-black/20'
              }`} 
              key={t.address}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex flex-col gap-1.5">
                  <div className="font-black text-white text-lg tracking-wide">{t.symbol}</div>
                  {isOwned && (
                    <div className="text-xs px-2 py-1 rounded-full bg-purple-500/25 border border-purple-500/50 text-white w-fit">
                      Owned
                    </div>
                  )}
                </div>
                <a 
                  className="px-4 py-2.5 rounded-xl text-white no-underline border-0 bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-600/35 transition-all duration-120 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-600/45" 
                  href={`/trendminer/dao/${encodeURIComponent(t.sale_address || '')}`}
                >
                  Open DAO
                </a>
              </div>
              
              <div className="mt-2 flex justify-end">
                <TokenMiniChart address={t.sale_address || t.address} width={140} height={32} stroke="#ff6d15" />
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs opacity-80 text-white/80">Treasury</div>
                  <div className="font-bold text-white">
                    {t.sale_address && treasuryMap[t.sale_address] != null 
                      ? `${treasuryMap[t.sale_address].toLocaleString()} AE` 
                      : '—'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">Holders</div>
                  <div className="font-bold text-white">{t.holders_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">Created</div>
                  <div className="font-bold text-white">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">Market Cap</div>
                  <div className="font-bold text-white">
                    {t.market_cap != null 
                      ? `${(Number(t.market_cap) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} AE` 
                      : '—'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 text-white/80">Trending</div>
                  <div className="font-bold text-white">
                    {(t as any).trending_score != null 
                      ? Math.round(Number((t as any).trending_score)).toLocaleString() 
                      : '—'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center gap-2 mt-2">
                <div className="text-xs opacity-80 text-white/80">Sale</div>
                <div className="font-mono text-xs opacity-90 text-white/90">
                  {(t.sale_address || '').slice(0, 8)}…{(t.sale_address || '').slice(-6)}
                </div>
              </div>
              
              <div className="flex justify-between items-center gap-2 mt-2">
                <a 
                  className="text-xs opacity-95 text-white no-underline px-3 py-2 rounded-xl border-0 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-150" 
                  href={`/trendminer/tokens/${encodeURIComponent(t.sale_address || t.address)}`}
                >
                  View token
                </a>
                <a 
                  className="text-xs opacity-95 text-white no-underline px-3 py-2 rounded-xl border-0 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-150" 
                  href={`https://aescan.io/contracts/${encodeURIComponent(t.sale_address || t.address)}?type=call-transactions`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  æScan ↗
                </a>
              </div>
            </div>
          );
        })}
        {!loading && !items.length && (
          <div className="col-span-full text-center py-8 opacity-80 text-white/85">
            No DAOs found.
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-center gap-3 mt-4">
        <button 
          className="px-3 py-2 rounded-lg border border-white/20 bg-gradient-to-b from-white/8 to-white/4 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-150" 
          disabled={page <= 1} 
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span className="opacity-85 text-white/90">
          Page {page} / {totalPages}
        </span>
        <button 
          className="px-3 py-2 rounded-lg border border-white/20 bg-gradient-to-b from-white/8 to-white/4 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-150" 
          disabled={page >= totalPages} 
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}


