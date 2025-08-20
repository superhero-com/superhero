import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendminerApi } from '../../api/backend';
import GlobalStatsAnalytics from '../../components/Trendminer/GlobalStatsAnalytics';
import { useSelector } from 'react-redux';

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
  const address = useSelector((s: any) => s.root.address as string | null);
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
      <div style={{ padding: '16px 12px', borderRadius: 8, background: 'linear-gradient(rgba(0,0,0,0.03), rgba(0,0,0,0.03))' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Tokenize Trends. Own the Hype. Build Communities.</div>
          <div style={{ minWidth: 360, flex: 1 }}>
            <GlobalStatsAnalytics />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tokens or tags" style={{ flex: 1, minWidth: 220, padding: '8px 12px' }} />
        <select className="flat-select" value={collection} onChange={(e) => setCollection(e.target.value as any)}>
          <option value="all">All</option>
          <option value="word">Words</option>
          <option value="number">Numbers</option>
        </select>
        <select className="flat-select" value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="trending_score">Trending</option>
          <option value="market_cap">Market Cap</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="holders_count">Holders</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
          My tokens only
        </label>
        <a href="/trendminer/invite" style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', textDecoration: 'none', color: '#111' }}>Invite & Earn</a>
      </div>
      {error && <div style={{ color: 'tomato' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {items.map((it) => (
          <Link key={it.address} to={`/trendminer/tokens/${encodeURIComponent(it.name || it.address)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: 12, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700 }}>#{it.name || it.symbol} {it.symbol ? <span style={{ opacity: 0.7 }}>(#{it.symbol})</span> : null}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                <div>MC: {Number(it.market_cap ?? 0).toLocaleString()}</div>
                <div>Holders: {it.holders_count ?? 0}</div>
                <div> {Number(it.price ?? 0).toFixed(4)}</div>
              </div>
              {typeof (it as any).trending_score !== 'undefined' && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Score: {Number((it as any).trending_score).toFixed(2)}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
      <div ref={observerRef} style={{ height: 24 }} />
      {loading && <div>Loading…</div>}
      {!loading && !items.length && <div>No tokens found.</div>}
    </div>
  );
}


