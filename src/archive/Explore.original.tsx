import React, { useEffect, useMemo, useState } from 'react';
import { getAllTokens, getPairs, getHistory } from '../libs/dexBackend';
import DexTabs from '../components/dex/DexTabs';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';

export default function Explore() {
  const [active, setActive] = useState<'Tokens'|'Pairs'|'Transactions'>('Tokens');
  const [tokens, setTokens] = useState<any[]>([]);
  const [pairs, setPairs] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [tokenSort, setTokenSort] = useState<{ key: 'symbol'|'name'|'pairs'|'decimals'; asc: boolean }>({ key: 'symbol', asc: true });
  const [pairSort, setPairSort] = useState<{ key: 'transactions'|'address'|'pair'; asc: boolean }>({ key: 'transactions', asc: false });
  const [tokenSearch, setTokenSearch] = useState('');
  const [pairSearch, setPairSearch] = useState('');
  const [txType, setTxType] = useState<'all'|'swap'|'add'|'remove'>('all');
  const [txWindow, setTxWindow] = useState<'24h'|'7d'>('24h');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [ts, ps] = await Promise.all([
        getAllTokens(),
        getPairs(false),
      ]);
      setTokens(ts || []);
      setPairs((ps && Object.values(ps)) || []);
    })();
  }, []);

  useEffect(() => {
    if (active !== 'Transactions') return;
    (async () => {
      const now = Date.now();
      const since = txWindow === '24h' ? (now - 24 * 3600_000) : (now - 7 * 24 * 3600_000);
      const params: any = { limit: 100, since };
      if (txType !== 'all') params.type = txType;
      const hist = await getHistory(params);
      setTxs(hist || []);
    })();
  }, [active, txType, txWindow]);

  const tokenToPairsCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pairs) {
      const t0 = p.token0 || p.token0Address;
      const t1 = p.token1 || p.token1Address;
      if (t0) map.set(t0, (map.get(t0) || 0) + 1);
      if (t1) map.set(t1, (map.get(t1) || 0) + 1);
    }
    return map;
  }, [pairs]);

  const sortedTokens = useMemo(() => {
    const key = tokenSort.key;
    const term = tokenSearch.trim().toLowerCase();
    const arr = tokens.filter((t) => !term
      || (t.symbol || '').toLowerCase().includes(term)
      || (t.name || '').toLowerCase().includes(term)
      || (t.address || '').toLowerCase().includes(term));
    arr.sort((a, b) => {
      const av = key === 'pairs' ? (tokenToPairsCount.get(a.address) || 0) : (a[key] ?? '');
      const bv = key === 'pairs' ? (tokenToPairsCount.get(b.address) || 0) : (b[key] ?? '');
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (!tokenSort.asc) arr.reverse();
    return arr;
  }, [tokens, tokenSort, tokenToPairsCount, tokenSearch]);

  const sortedPairs = useMemo(() => {
    const key = pairSort.key;
    const term = pairSearch.trim().toLowerCase();
    const arr = pairs.filter((p: any) => {
      const pairName = `${p.token0Symbol}/${p.token1Symbol}`.toLowerCase();
      return !term
        || pairName.includes(term)
        || (p.address || '').toLowerCase().includes(term)
        || (p.token0 || p.token0Address || '').toLowerCase().includes(term)
        || (p.token1 || p.token1Address || '').toLowerCase().includes(term);
    });
    arr.sort((a, b) => {
      if (key === 'pair') {
        const ap = `${a.token0Symbol}/${a.token1Symbol}`;
        const bp = `${b.token0Symbol}/${b.token1Symbol}`;
        return ap.localeCompare(bp);
      }
      if (typeof a[key] === 'number' && typeof b[key] === 'number') return a[key] - b[key];
      return String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
    });
    if (!pairSort.asc) arr.reverse();
    return arr;
  }, [pairs, pairSort, pairSearch]);

  return (
    <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 0' }}>
      <DexTabs />
      <h2>Explore</h2>
      <div style={{ display: 'flex', gap: 16, fontSize: 18, marginTop: 8 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setActive('Tokens'); }} style={{ color: active==='Tokens' ? 'white' : '#9aa' }}>Tokens</a>
        <a href="#" onClick={(e) => { e.preventDefault(); setActive('Pairs'); }} style={{ color: active==='Pairs' ? 'white' : '#9aa' }}>Pools</a>
        <a href="#" onClick={(e) => { e.preventDefault(); setActive('Transactions'); }} style={{ color: active==='Transactions' ? 'white' : '#9aa' }}>Transactions</a>
      </div>
      <div style={{ marginTop: 12 }}>
        {active === 'Tokens' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, opacity: 0.85 }}>Sort by</label>
              <select value={tokenSort.key} onChange={(e) => setTokenSort((s) => ({ ...s, key: e.target.value as any }))} style={{ padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}>
                <option value="symbol">Symbol</option>
                <option value="name">Name</option>
                <option value="pairs">Pools</option>
                <option value="decimals">Decimals</option>
              </select>
              <button aria-label="toggle-token-sort" onClick={() => setTokenSort((s) => ({ ...s, asc: !s.asc }))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>{tokenSort.asc ? 'Asc' : 'Desc'}</button>
              <input aria-label="filter-tokens" placeholder="Filter tokens" value={tokenSearch} onChange={(e) => setTokenSearch(e.target.value)} style={{ marginLeft: 'auto', padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ textAlign: 'left' }}>Symbol</th><th style={{ textAlign: 'left' }}>Name</th><th>Address</th><th>Pools</th><th>Decimals</th><th>Price (USD)</th><th>24h Vol</th><th>Actions</th></tr></thead>
              <tbody>
                {sortedTokens.map((t) => (
                  <tr key={t.address}>
                    <td>
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/explore/tokens/${t.address}`); }} style={{ color: 'white', textDecoration: 'underline' }}>{t.symbol}</a>
                    </td>
                    <td>{t.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {CONFIG.EXPLORER_URL ? (
                        <a href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/contracts/${t.address}`} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>{t.address}</a>
                      ) : t.address}
                    </td>
                    <td style={{ textAlign: 'center' }}>{tokenToPairsCount.get(t.address) || 0}</td>
                    <td style={{ textAlign: 'center' }}>{t.decimals}</td>
                    <td style={{ textAlign: 'right' }}>{t.priceUsd != null ? Number(t.priceUsd).toFixed(4) : '-'}</td>
                    <td style={{ textAlign: 'right' }}>{t.volume24h != null ? Number(t.volume24h).toLocaleString() : '-'}</td>
                    <td>
                      <button onClick={() => navigate(`/swap?from=AE&to=${t.address}`)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white', marginRight: 6 }}>Swap</button>
                      <button onClick={() => navigate(`/pool/add?from=AE&to=${t.address}`)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>Add</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {active === 'Pairs' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, opacity: 0.85 }}>Sort by</label>
              <select value={pairSort.key} onChange={(e) => setPairSort((s) => ({ ...s, key: e.target.value as any }))} style={{ padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}>
                <option value="transactions">Tx count</option>
                <option value="pair">Pair</option>
                <option value="address">Address</option>
              </select>
              <button aria-label="toggle-pair-sort" onClick={() => setPairSort((s) => ({ ...s, asc: !s.asc }))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>{pairSort.asc ? 'Asc' : 'Desc'}</button>
              <input aria-label="filter-pairs" placeholder="Filter pools" value={pairSearch} onChange={(e) => setPairSearch(e.target.value)} style={{ marginLeft: 'auto', padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ textAlign: 'left' }}>Pair</th><th>Address</th><th>Tx</th><th>TVL (USD)</th><th>24h Vol</th><th>Actions</th></tr></thead>
              <tbody>
                {sortedPairs.map((p: any) => (
                  <tr key={p.address}>
                    <td>
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/explore/tokens/${p.token0 || p.token0Address}`); }} style={{ color: 'white', textDecoration: 'underline' }}>{p.token0Symbol}</a>
                      {' / '}
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/explore/tokens/${p.token1 || p.token1Address}`); }} style={{ color: 'white', textDecoration: 'underline' }}>{p.token1Symbol}</a>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/explore/pools/${p.address}`); }} style={{ color: 'white', textDecoration: 'underline', marginRight: 8 }}>{p.address}</a>
                      {CONFIG.EXPLORER_URL && (
                        <a href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/contracts/${p.address}`} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View</a>
                      )}
                    </td>
                    <td>{p.transactions}</td>
                    <td style={{ textAlign: 'right' }}>{p.tvlUsd != null ? Number(p.tvlUsd).toLocaleString() : (p.tvl != null ? Number(p.tvl).toLocaleString() : '-')}</td>
                    <td style={{ textAlign: 'right' }}>{p.volume24h != null ? Number(p.volume24h).toLocaleString() : '-'}</td>
                    <td>
                      <button onClick={() => navigate(`/swap?from=${p.token0 || p.token0Address}&to=${p.token1 || p.token1Address}`)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white', marginRight: 6 }}>Swap</button>
                      <button onClick={() => navigate(`/pool/add?from=${p.token0 || p.token0Address}&to=${p.token1 || p.token1Address}`)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>Add</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {active === 'Transactions' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, opacity: 0.85 }}>Type</label>
              <select value={txType} onChange={(e) => setTxType(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}>
                <option value="all">All</option>
                <option value="swap">Swaps</option>
                <option value="add">Adds</option>
                <option value="remove">Removes</option>
              </select>
              <label style={{ fontSize: 12, opacity: 0.85, marginLeft: 8 }}>Window</label>
              <select value={txWindow} onChange={(e) => setTxWindow(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}>
                <option value="24h">24h</option>
                <option value="7d">7d</option>
              </select>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th>Type</th><th>Pair</th><th>Amount In</th><th>Amount Out</th><th>Tx</th></tr></thead>
              <tbody>
                {txs.map((t: any, i: number) => (
                  <tr key={i}>
                    <td>{t.type || t.event || '-'}</td>
                    <td>{t.tokenInSymbol || t.token0Symbol} / {t.tokenOutSymbol || t.token1Symbol}</td>
                    <td>{t.amountIn || '-'}</td>
                    <td>{t.amountOut || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {t.txHash && CONFIG.EXPLORER_URL ? (
                        <a href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${t.txHash}`} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>{t.txHash}</a>
                      ) : (t.txHash || '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


