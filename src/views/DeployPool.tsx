import React, { useEffect, useMemo, useState } from 'react';
import AeButton from '../components/AeButton';
import DexTabs from '../components/dex/DexTabs';
import TokenSelector from '../components/dex/TokenSelector';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEX_ADDRESSES, getPairAddress, initDexContracts, fromAettos } from '../libs/dex';
import { CONFIG } from '../config';
import BigNumber from 'bignumber.js';

import { useWallet } from '../../hooks';
export default function DeployPool() {
    const address = useWallet().address;
  const [token, setToken] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [amountAe, setAmountAe] = useState('');
  const [amountToken, setAmountToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSeq, setScanSeq] = useState(0);
  const [noPoolTokens, setNoPoolTokens] = useState<Array<{ address: string; symbol: string; name: string; decimals: number; balance: string }>>([]);
  const [filter, setFilter] = useState('');

  // Prefill from /pool/deploy?token=ct_...&amountAe=...&amountToken=...
  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search);
      const t = qs.get('token');
      const a = qs.get('amountAe');
      const b = qs.get('amountToken');
      if (t) setToken(t);
      if (a) setAmountAe(a);
      if (b) setAmountToken(b);
    } catch {}
  }, [location.search]);

  async function scanWalletTokensWithoutPool() {
    const mySeq = scanSeq + 1;
    setScanSeq(mySeq);
    try {
      setLoading(true); setError(null);
      if (!address) return;
      const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
      const collected: Array<{ address: string; symbol: string; name: string; decimals: number; balance: string }> = [];
      // Fetch all pages of AEX9 balances
      let cursor: string | null = `/v3/accounts/${address}/aex9/balances`;
      let guard = 0;
      while (cursor && guard++ < 20) {
        const r = await fetch(`${base}${cursor.startsWith('/') ? '' : '/'}${cursor}`, { cache: 'no-cache' });
        if (!r.ok) {
          // Enhanced error logging for new accounts
          if (r.status === 404) {
            console.info('[deploy-pool] Account not found on middleware:', address);
            console.info('[deploy-pool] This is normal for new accounts - user needs to bridge ETH first');
          } else {
            console.warn('[deploy-pool] Failed to fetch account balances:', r.status, r.statusText);
          }
          break;
        }
        const mdw = await r.json();
        const items: any[] = Array.isArray(mdw?.data) ? mdw.data : [];
        for (const it of items) {
          const ct = it?.contract_id;
          const bal = it?.amount || it?.balance;
          const decs = Number(it?.decimals ?? 18);
          const sym = it?.token_symbol || it?.symbol || 'TKN';
          const nm = it?.token_name || it?.name || sym;
          if (ct && (bal != null)) {
            try {
              const bn = typeof bal === 'bigint' ? bal : BigInt(new BigNumber(String(bal)).integerValue(BigNumber.ROUND_DOWN).toFixed(0));
              if (bn > 0n) collected.push({ address: String(ct), symbol: sym, name: nm, decimals: decs, balance: fromAettos(bn, decs) });
            } catch {}
          }
        }
        cursor = mdw?.next || null;
      }
      // Dedup and check pools
      const map = new Map<string, { address: string; symbol: string; name: string; decimals: number; balance: string }>();
      for (const t of collected) {
        if (!map.has(t.address)) map.set(t.address, t);
      }
      const list = Array.from(map.values());
      // Check pool existence (token-WAE)
      const sdk = (window as any).__aeSdk;
      const { factory } = await initDexContracts(sdk);
      const entries = await Promise.all(list.map(async (t) => {
        try {
          const addr = await getPairAddress(sdk, factory, t.address, DEX_ADDRESSES.wae);
          return [t, !!addr] as const;
        } catch { return [t, false] as const; }
      }));
      const without = entries.filter(([, exists]) => !exists).map(([t]) => t);
      if (scanSeq + 1 === mySeq) setNoPoolTokens(without.sort((a, b) => a.symbol.localeCompare(b.symbol)));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void scanWalletTokensWithoutPool(); }, [address]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return noPoolTokens.filter((t) => !term || t.symbol.toLowerCase().includes(term) || t.address.toLowerCase().includes(term) || (t.name || '').toLowerCase().includes(term));
  }, [noPoolTokens, filter]);

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <DexTabs />
      <h2>Deploy New Pool</h2>
      <p style={{ fontSize: 13, opacity: 0.85 }}>Create a new pool by supplying the first liquidity. The pool for AE and your token will be created automatically.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Your tokens without pool</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
            <AeButton onClick={() => void scanWalletTokensWithoutPool()} disabled={loading} loading={loading} variant="secondary-dark" size="small">{loading ? 'Scanning…' : 'Rescan'}</AeButton>
          </div>
        </div>
        {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
        <div style={{ border: '1px solid #3a3a4a', borderRadius: 8, overflow: 'hidden', background: '#14141c' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#1a1a23' }}><th style={{ textAlign: 'left', padding: '8px 10px' }}>Token</th><th style={{ padding: '8px 10px' }}>Address</th><th style={{ textAlign: 'right', padding: '8px 10px' }}>Balance</th><th style={{ padding: '8px 10px' }}>Action</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.address}>
                  <td style={{ padding: '8px 10px' }}>{t.symbol} <span style={{ opacity: 0.75, fontSize: 12 }}>({t.name})</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, padding: '8px 10px' }}>{t.address}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '8px 10px' }}>{t.balance}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px' }}>
                    <AeButton onClick={() => { setToken(t.address); setTokenSymbol(t.symbol); }} variant="secondary-dark" size="small">Select</AeButton>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={4} style={{ padding: 10, opacity: 0.8 }}>No tokens without pool found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>Token</div>
        <TokenSelector
          label="Token"
          selected={token}
          exclude={[]}
          onSelect={(addr, info) => { setToken(addr); setTokenSymbol(info.symbol); }}
        />
        <div style={{ fontSize: 12, opacity: 0.85 }}>Amounts (initial ratio)</div>
        <input
          placeholder="Amount AE"
          value={amountAe}
          onChange={(e) => setAmountAe(e.target.value.replace(/,/g, '.'))}
          style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
        />
        <input
          placeholder={`Amount ${tokenSymbol || 'TOKEN'}`}
          value={amountToken}
          onChange={(e) => setAmountToken(e.target.value.replace(/,/g, '.'))}
          style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
        />
        <AeButton
          onClick={() => navigate(`/pool/add?from=AE&to=${token}&amountA=${encodeURIComponent(amountAe)}&amountB=${encodeURIComponent(amountToken)}`)}
          disabled={!address || !token || !amountAe || !amountToken}
          variant="secondary-dark"
          size="large"
        >
          {address ? 'Create pool & add liquidity' : 'Connect wallet'}
        </AeButton>
      </div>
    </div>
  );
}


