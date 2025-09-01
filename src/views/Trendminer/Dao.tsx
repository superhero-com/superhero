import { AeSdk } from '@aeternity/aepp-sdk';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TrendminerApi } from '../../api/backend';
import AeButton from '../../components/AeButton';
import { useAeSdk } from '../../hooks';
import './Dao.scss';

let bctsl: any;
async function ensureBctsl() {
  if (!bctsl) bctsl = await import('bctsl-sdk');
  return bctsl;
}

export default function Dao() {
  const { sdk } = useAeSdk();
  const { saleAddress } = useParams();
  const [token, setToken] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daoState, setDaoState] = useState<any | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newVote, setNewVote] = useState<{ type: string; value?: string; description?: string; link?: string }>({ type: 'VotePayout', value: '' });

  // Read-only SDK fallback so we can display DAO info without wallet
  let cachedReadOnlySdk: AeSdk | null = null;


  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (saleAddress) {
          const tok = await TrendminerApi.getToken(saleAddress);
          if (!cancel) setToken(tok || null);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'Failed to load DAO');
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, [saleAddress]);

  async function refreshDao() {
    if (!saleAddress) return;
    try {
      const { initFallBack } = await ensureBctsl();
      const factory = await initFallBack(sdk, saleAddress);
      const dao = await factory.checkAndGetDAO();
      const state = await dao.state();
      setDaoState(state);
      const bal = await dao.balanceAettos();
      setBalance(Number(bal) / 1e18);
    } catch (e) {
      // ignore for read errors
    }
  }

  useEffect(() => { refreshDao(); }, [saleAddress]);

  async function createVote() {
    if (!saleAddress) return;
    setCreating(true);
    try {
      const { initFallBack } = await ensureBctsl();
      const factory = await initFallBack(sdk, saleAddress);
      const dao = await factory.checkAndGetDAO();
      const metadata: any = {
        subject_type: newVote.type,
        subject_value: newVote.value,
        description: newVote.description || '',
        link: newVote.link || '',
        subject: { [newVote.type]: [newVote.value] },
      };
      await dao.addVote(metadata);
      await refreshDao();
    } catch (e: any) {
      setError(e?.message || 'Failed to create vote');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="dao-view">
      {token && (
        <div className="token-title">{token.name || token.symbol} [DAO]</div>
      )}
      <div className="topbar">
        <Link to={`/trendminer/tokens/${encodeURIComponent(saleAddress || '')}`}>← Back to token sale</Link>
        <div className="treasury">Treasury: {balance != null ? `${balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} AE` : '—'}</div>
      </div>

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <div className="content">
          <div className="dao-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div><span style={{ opacity: 0.75, fontSize: 12 }}>Proposals:</span> <strong>{Array.isArray((daoState as any)?.votes) ? (daoState as any).votes.length : 0}</strong></div>
            {token?.holders_count != null && <div><span style={{ opacity: 0.75, fontSize: 12 }}>Holders:</span> <strong>{Number(token.holders_count).toLocaleString()}</strong></div>}
            {token?.market_cap != null && <div><span style={{ opacity: 0.75, fontSize: 12 }}>Market Cap:</span> <strong>{(Number(token.market_cap) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} AE</strong></div>}
            <div>
              <a href={`https://aescan.io/contracts/${encodeURIComponent(saleAddress || '')}?type=call-transactions`} target="_blank" rel="noopener noreferrer">View on æScan ↗</a>
            </div>
          </div>
          <div className="hint" style={{ fontSize: 13, opacity: 0.8 }}>
            The DAO manages the token’s treasury. Holders can create proposals and vote. Approved proposals can be applied
            to execute on-chain actions such as payouts.
          </div>
          <div className="create-vote">
            <div className="title">Create Vote</div>
            <div className="form">
              <select className="flat-select" value={newVote.type} onChange={(e) => setNewVote((v) => ({ ...v, type: e.target.value }))}>
                <option value="VotePayout">Payout</option>
                <option value="Generic">Generic</option>
              </select>
              <input placeholder="Subject value (address or data)" value={newVote.value} onChange={(e) => setNewVote((v) => ({ ...v, value: e.target.value }))} />
              <input placeholder="Description (optional)" value={newVote.description || ''} onChange={(e) => setNewVote((v) => ({ ...v, description: e.target.value }))} />
              <input placeholder="Link (optional)" value={newVote.link || ''} onChange={(e) => setNewVote((v) => ({ ...v, link: e.target.value }))} />
              <AeButton onClick={createVote} disabled={creating} loading={creating} size="small" variant="primary">{creating ? 'Creating…' : 'Create vote'}</AeButton>
            </div>
          </div>

          <div className="votes">
            <div className="title">Votes</div>
            {!daoState && <div className="empty">No votes yet</div>}
            {daoState && Array.isArray(daoState.votes) && daoState.votes.map((vote: any, index: number) => (
              <DaoVoteItem key={index} saleAddress={saleAddress!} vote={vote} id={index} onChanged={refreshDao} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DaoVoteItem({ saleAddress, vote, id, onChanged }: { saleAddress: string; vote: any; id: number; onChanged: () => void }) {
  const { sdk } = useAeSdk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(fn: (dao: any) => Promise<any>) {
    setLoading(true); setError(null);
    try {
      const { initFallBack } = await ensureBctsl();
      const factory = await initFallBack(sdk, saleAddress);
      const dao = await factory.checkAndGetDAO();
      await fn(dao);
      await onChanged();
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="vote-item">
      <div className="row">
        <div className="label">Vote #{id}</div>
        <div className="value">State: {(vote && vote[0]) || '—'}</div>
      </div>
      <div className="actions">
        <AeButton disabled={loading} onClick={() => action((dao) => dao.vote(true))} size="small" variant="success">Vote Yes</AeButton>
        <AeButton disabled={loading} onClick={() => action((dao) => dao.vote(false))} size="small" variant="error">Vote No</AeButton>
        <AeButton disabled={loading} onClick={() => action((dao) => dao.revokeVote())} size="small" variant="warning">Revoke</AeButton>
        <AeButton disabled={loading} onClick={() => action((dao) => dao.withdraw())} size="small" variant="secondary">Withdraw</AeButton>
        <AeButton disabled={loading} onClick={() => action((dao) => dao.apply())} size="small" variant="accent">Apply</AeButton>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}


