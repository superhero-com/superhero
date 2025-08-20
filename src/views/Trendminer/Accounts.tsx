import React, { useEffect, useState } from 'react';
import { TrendminerApi } from '../../api/backend';

export default function Accounts() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [orderBy, setOrderBy] = useState<'total_volume'|'total_tx_count'|'total_buy_tx_count'|'total_sell_tx_count'|'total_created_tokens'|'total_invitation_count'|'total_revoked_invitation_count'|'created_at'>('total_volume');
  const [orderDirection, setOrderDirection] = useState<'ASC'|'DESC'>('DESC');

  useEffect(() => {
    let cancel = false;
    async function load(reset = false) {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.listAccounts({ orderBy, orderDirection, limit: 20, page: reset ? 1 : page });
        const items = resp?.items ?? resp ?? [];
        if (!cancel) {
          setRows((prev) => reset ? items : [...prev, ...items]);
          const currentPage = resp?.meta?.currentPage ?? (reset ? 1 : page);
          const totalPages = resp?.meta?.totalPages ?? (items.length === 20 ? currentPage + 1 : currentPage);
          setHasMore(currentPage < totalPages);
          setPage(currentPage + 1);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'Failed to load accounts');
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    setPage(1);
    load(true);
    return () => { cancel = true; };
  }, [orderBy, orderDirection]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1rem' }}>
      <h2>Top Accounts</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
        <select className="flat-select" value={orderBy} onChange={(e) => setOrderBy(e.target.value as any)}>
          <option value="total_volume">Total Volume</option>
          <option value="total_tx_count">Total TX</option>
          <option value="total_buy_tx_count">Buy TX</option>
          <option value="total_sell_tx_count">Sell TX</option>
          <option value="total_created_tokens">Created Tokens</option>
          <option value="total_invitation_count">Invitations</option>
          {/* Claimed invites metric removed */}
          <option value="total_revoked_invitation_count">Revoked Invites</option>
          <option value="created_at">Newest</option>
        </select>
        <select className="flat-select" value={orderDirection} onChange={(e) => setOrderDirection(e.target.value as any)}>
          <option value="DESC">Desc</option>
          <option value="ASC">Asc</option>
        </select>
      </div>
      {error && <div style={{ color: 'tomato' }}>{error}</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.address} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }}>
            <div style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.address}</div>
            <div style={{ display: 'flex', gap: 16, opacity: 0.85 }}>
              <div>Vol: {Number(r.total_volume || 0).toLocaleString()} AE</div>
              <div>Tx: {r.total_tx_count || 0}</div>
              <div>Tokens: {r.total_created_tokens || 0}</div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => setPage((p) => p)} disabled={loading}>Load more</button>
        </div>
      )}
    </div>
  );
}


