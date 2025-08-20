import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TrendminerApi } from '../../api/backend';
import AeButton from '../../components/AeButton';

type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price?: number;
  market_cap?: number;
  holders_count?: number;
  sale_address?: string;
  created_at?: string;
};

export default function AccountDetails() {
  const { address } = useParams();
  const [tab, setTab] = useState<'owned'|'created'|'transactions'>('owned');
  const [owned, setOwned] = useState<TokenItem[]>([]);
  const [created, setCreated] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!address) return;
      setLoading(true);
      setError(null);
      try {
        const [ownedResp, createdResp] = await Promise.all([
          TrendminerApi.listTokens({ ownerAddress: address, limit: 50, orderBy: 'market_cap', orderDirection: 'DESC' }),
          TrendminerApi.listTokens({ creatorAddress: address, limit: 50, orderBy: 'created_at', orderDirection: 'DESC' }),
        ]);
        if (!cancel) {
          setOwned(ownedResp?.items ?? ownedResp ?? []);
          setCreated(createdResp?.items ?? createdResp ?? []);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'Failed to load account');
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, [address]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 0, background: 'rgba(0,0,0,0.08)' }} />
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{address}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Account Details</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <AeButton onClick={() => { navigator.clipboard.writeText(address || ''); }} variant="utility">Copy Address</AeButton>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 12 }}>
        <AeButton onClick={() => setTab('owned')} variant="tab" active={tab === 'owned'}>Tokens Owned</AeButton>
        <AeButton onClick={() => setTab('created')} variant="tab" active={tab === 'created'}>Tokens Created</AeButton>
        <AeButton onClick={() => setTab('transactions')} variant="tab" active={tab === 'transactions'}>Transactions</AeButton>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'tomato' }}>{error}</div>}

      {!loading && !error && tab === 'owned' && (
        <TokenGrid items={owned} />
      )}
      {!loading && !error && tab === 'created' && (
        <TokenGrid items={created} />
      )}
      {!loading && !error && tab === 'transactions' && (
        <div style={{ color: 'rgba(0,0,0,0.6)' }}>Transactions view will be added once backend endpoint is exposed.</div>
      )}
    </div>
  );
}

function TokenGrid({ items }: { items: TokenItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {items.map((it) => (
        <Link key={it.address} to={`/trendminer/tokens/${encodeURIComponent(it.name || it.address)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ padding: 12, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>{it.name} <span style={{ opacity: 0.7 }}>({it.symbol})</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, opacity: 0.85 }}>
              <div>MC: {Number(it.market_cap ?? 0).toLocaleString()}</div>
              <div>Holders: {it.holders_count ?? 0}</div>
            </div>
          </div>
        </Link>
      ))}
      {!items.length && <div style={{ opacity: 0.7 }}>No tokens</div>}
    </div>
  );
}


