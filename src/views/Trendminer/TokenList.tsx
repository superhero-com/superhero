import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendminerApi } from '../../api/backend';
import GlobalStatsAnalytics from '../../components/Trendminer/GlobalStatsAnalytics';

import { useWallet } from '../../hooks';
type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  created_at: string;
  holders_count: number;
  sale_address?: string;
};

export default function TokenList() {
  const [items, setItems] = useState<TokenItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'trending_score'|'market_cap'|'newest'|'oldest'|'holders_count'>('trending_score');
  const [collection, setCollection] = useState<'all'|'word'|'number'>('all');
  const address = useWallet().address;
  const [myOnly, setMyOnly] = useState<boolean>(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const orderBy = useMemo(() => (sort === 'newest' || sort === 'oldest') ? 'created_at' : sort, [sort]);
  const orderDirection = useMemo<'ASC'|'DESC'>(() => sort === 'oldest' ? 'ASC' : 'DESC', [sort]);

  useEffect(() => {
    let stop = false;
    async function load(reset = false) {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.listTokens({
          orderBy: orderBy as any,
          orderDirection,
          page: reset ? 1 : page,
          limit: 20,
          search: search || undefined,
          collection,
          ownerAddress: myOnly && address ? address : undefined,
          creatorAddress: undefined,
        });
        const list: TokenItem[] = resp?.items ?? resp ?? [];
        if (!stop) {
          setItems((prev) => reset ? list : [...prev, ...list]);
          const currentPage = resp?.meta?.currentPage ?? (reset ? 1 : page);
          const totalPages = resp?.meta?.totalPages ?? (list.length === 20 ? currentPage + 1 : currentPage);
          setHasMore(currentPage < totalPages);
          setPage(currentPage + 1);
        }
      } catch (e: any) {
        if (!stop) setError(e?.message || 'Failed to load tokens');
      } finally {
        if (!stop) setLoading(false);
      }
    }
    // Initial or when sort/search changes
    setPage(1);
    load(true);
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderBy, orderDirection, search, collection, myOnly, address]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el || !hasMore || loading) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        TrendminerApi.listTokens({
            orderBy: orderBy as any,
            orderDirection,
            page,
            limit: 20,
            search: search || undefined,
            collection,
            ownerAddress: myOnly && address ? address : undefined,
            creatorAddress: undefined,
          })
          .then((resp) => {
            const list: TokenItem[] = resp?.items ?? resp ?? [];
            setItems((prev) => [...prev, ...list]);
            const currentPage = resp?.meta?.currentPage ?? page;
            const totalPages = resp?.meta?.totalPages ?? (list.length === 20 ? currentPage + 1 : currentPage);
            setHasMore(currentPage < totalPages);
            setPage(currentPage + 1);
          })
          .catch((e) => setError(e?.message || 'Failed to load more tokens'));
      }
    }, { threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, [page, hasMore, loading, orderBy, orderDirection, search]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="p-4 rounded-lg bg-gradient-to-b from-black/10 to-black/5 backdrop-blur-sm border border-white/10">
        <div className="flex gap-3 items-center justify-between flex-wrap">
          <div className="text-2xl md:text-3xl font-bold text-white">
            Tokenize Trends. Own the Hype. Build Communities.
          </div>
          <div className="min-w-80 flex-1">
            <GlobalStatsAnalytics />
          </div>
        </div>
      </div>
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search tokens or tags" 
          className="flex-1 min-w-56 px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" 
        />
        <select 
          className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" 
          value={collection} 
          onChange={(e) => setCollection(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="word">Words</option>
          <option value="number">Numbers</option>
        </select>
        <select 
          className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" 
          value={sort} 
          onChange={(e) => setSort(e.target.value as any)}
        >
          <option value="trending_score">Trending</option>
          <option value="market_cap">Market Cap</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="holders_count">Holders</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-white">
          <input 
            type="checkbox" 
            checked={myOnly} 
            onChange={(e) => setMyOnly(e.target.checked)} 
            className="rounded"
          />
          My tokens only
        </label>
        <a 
          href="/trendminer/invite" 
          className="px-3 py-2 rounded-full border border-white/20 bg-white text-gray-900 no-underline hover:bg-gray-100 transition-colors duration-200 text-sm font-medium"
        >
          Invite & Earn
        </a>
      </div>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <Link 
            key={it.address} 
            to={`/trendminer/tokens/${encodeURIComponent(it.name || it.address)}`} 
            className="no-underline text-inherit"
          >
            <div className="p-3 border border-white/10 rounded-lg bg-black/20 backdrop-blur-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <div className="font-bold text-white">
                #{it.name || it.symbol} {it.symbol ? (
                  <span className="opacity-70 text-white/70">(#{it.symbol})</span>
                ) : null}
              </div>
              <div className="flex justify-between mt-2 text-sm opacity-85 text-white/85">
                <div>MC: {Number(it.market_cap ?? 0).toLocaleString()}</div>
                <div>Holders: {it.holders_count ?? 0}</div>
                <div>{Number(it.price ?? 0).toFixed(4)}</div>
              </div>
              {typeof (it as any).trending_score !== 'undefined' && (
                <div className="mt-1.5 text-xs opacity-80 text-white/80">
                  Score: {Number((it as any).trending_score).toFixed(2)}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
      <div ref={observerRef} className="h-6" />
      {loading && <div className="text-center py-4 text-white/80">Loading…</div>}
      {!loading && !items.length && <div className="text-center py-4 text-white/80">No tokens found.</div>}
    </div>
  );
}


