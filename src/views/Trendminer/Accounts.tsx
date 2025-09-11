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
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-white mb-4">Top Accounts</h2>
      <div className="flex gap-2 items-center my-2">
        <select 
          className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" 
          value={orderBy} 
          onChange={(e) => setOrderBy(e.target.value as any)}
        >
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
        <select 
          className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" 
          value={orderDirection} 
          onChange={(e) => setOrderDirection(e.target.value as any)}
        >
          <option value="DESC">Desc</option>
          <option value="ASC">Asc</option>
        </select>
      </div>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.address} className="flex justify-between p-3 border border-white/10 rounded-lg bg-black/20 backdrop-blur-lg">
            <div className="max-w-72 overflow-hidden text-ellipsis text-white font-mono text-sm">
              {r.address}
            </div>
            <div className="flex gap-4 opacity-85 text-sm text-white/85">
              <div>Vol: {Number(r.total_volume || 0).toLocaleString()} AE</div>
              <div>Tx: {r.total_tx_count || 0}</div>
              <div>Tokens: {r.total_created_tokens || 0}</div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-3">
          <button 
            onClick={() => setPage((p) => p)} 
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}


