/* eslint-disable
  @typescript-eslint/no-unused-vars,
  react/function-component-definition,
  no-use-before-define
*/
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SuperheroApi } from '../../api/backend';
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
          SuperheroApi.listTokens({
            ownerAddress: address, limit: 50, orderBy: 'market_cap', orderDirection: 'DESC',
          }),
          SuperheroApi.listTokens({
            creatorAddress: address, limit: 50, orderBy: 'created_at', orderDirection: 'DESC',
          }),
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
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-16 h-16 rounded-lg bg-black/20 border border-white/10" />
        <div>
          <div className="text-2xl font-extrabold text-white">{address}</div>
          <div className="text-xs opacity-70 text-white/70">Account Details</div>
        </div>
        <div className="ml-auto">
          <AeButton
            onClick={() => { navigator.clipboard.writeText(address || ''); }}
            variant="utility"
          >
            Copy Address
          </AeButton>
        </div>
      </div>

      <div className="flex gap-3 border-b border-white/10 mb-3">
        <AeButton
          onClick={() => setTab('owned')}
          variant="tab"
          active={tab === 'owned'}
        >
          Tokens Owned
        </AeButton>
        <AeButton
          onClick={() => setTab('created')}
          variant="tab"
          active={tab === 'created'}
        >
          Tokens Created
        </AeButton>
        <AeButton
          onClick={() => setTab('transactions')}
          variant="tab"
          active={tab === 'transactions'}
        >
          Transactions
        </AeButton>
      </div>

      {loading && <div className="text-white/80">Loading…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && tab === 'owned' && (
        <TokenGrid items={owned} />
      )}
      {!loading && !error && tab === 'created' && (
        <TokenGrid items={created} />
      )}
      {!loading && !error && tab === 'transactions' && (
        <div className="text-white/60">
          Transactions view will be added once backend endpoint is exposed.
        </div>
      )}
    </div>
  );
}

const TokenGrid = ({ items }: { items: TokenItem[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {items.map((it) => (
      <Link
        key={it.address}
        to={`/trending/tokens/${encodeURIComponent(it.name || it.address)}`}
        className="no-underline text-inherit"
      >
        <div className="p-3 border border-white/10 rounded-lg bg-black/20 backdrop-blur-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
          <div className="font-bold text-white">
            {it.name}
            {' '}
            <span className="opacity-70 text-white/70">
              (
              {it.symbol}
              )
            </span>
          </div>
          <div className="flex justify-between mt-2 text-sm opacity-85 text-white/85">
            <div>
              MC:
              {Number(it.market_cap ?? 0).toLocaleString()}
            </div>
            <div>
              Holders:
              {it.holders_count ?? 0}
            </div>
          </div>
        </div>
      </Link>
    ))}
    {!items.length && <div className="opacity-70 text-white/70 text-center py-8">No tokens</div>}
  </div>
);
