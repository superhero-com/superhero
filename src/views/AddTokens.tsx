import React, { useEffect, useMemo, useState } from 'react';
import DexTabs from '../components/dex/DexTabs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { initSdk, scanForWallets } from '../store/slices/aeternitySlice';
import { ACI, DEX_ADDRESSES, fromAettos, initDexContracts, getPairAddress } from '../libs/dex';
import { useToast } from '../components/ToastProvider';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';
import BigNumber from 'bignumber.js';
import AeButton from '../components/AeButton';

export default function AddTokens() {
  const dispatch = useDispatch<AppDispatch>();
  const address = useSelector((s: RootState) => s.root.address);
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletTokens, setWalletTokens] = useState<Array<{ address: string; symbol: string; name: string; decimals: number; balance: string }>>([]);
  const [filter, setFilter] = useState('');
  const [poolExists, setPoolExists] = useState<Record<string, boolean>>({});
  const scanSeqRef = React.useRef(0);

  async function ensureWallet() {
    await dispatch(initSdk());
    if (!address) await dispatch(scanForWallets());
  }

  async function discoverWalletTokens() {
    const mySeq = ++scanSeqRef.current;
    try {
      setLoading(true); setError(null);
      await ensureWallet();
      const sdk = (window as any).__aeSdk;
      if (!sdk || !address) return;
      // Prefer authoritative balances from MDW; fallback to backend/pools scan
      const tokensFromMdw: Array<{ address: string; symbol?: string; name?: string; decimals?: number; balance: string }> = [];
      try {
        const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
        // Per mdw-swagger.json: /accounts/{accountId}/aex9/balances returns { data: Aex9BalanceResponse[] }
        let cursor: string | null = `/v3/accounts/${address}/aex9/balances`;
        let guard = 0;
        while (cursor && guard++ < 20) { // hard cap pages to avoid infinite loop
          const r = await fetch(`${base}${cursor.startsWith('/') ? '' : '/'}${cursor}`, { cache: 'no-cache' });
          if (!r.ok) {
            // Enhanced error logging for new accounts
            if (r.status === 404) {
              console.info('[add-tokens] Account not found on middleware:', address);
              console.info('[add-tokens] This is normal for new accounts - user needs to bridge ETH first');
            } else {
              console.warn('[add-tokens] Failed to fetch account balances:', r.status, r.statusText);
            }
            break;
          }
          const mdw = await r.json();
          const items: any[] = Array.isArray(mdw?.data) ? mdw.data : [];
          // eslint-disable-next-line no-console
          console.info('[add-tokens] MDW page fetched', { cursor, count: items.length });
          for (const it of items) {
            // eslint-disable-next-line no-console
            console.info('[add-tokens] MDW item', {
              contract_id: it?.contract_id,
              amount: String(it?.amount ?? it?.balance ?? ''),
              decimals: it?.decimals,
              token_symbol: it?.token_symbol,
              token_name: it?.token_name,
              height: it?.height,
            });
          }
          for (const it of items) {
            const ct = it?.contract_id;
            const bal = it?.amount || it?.balance;
            const decs = Number(it?.decimals ?? 18);
            const sym = it?.token_symbol || it?.symbol || 'TKN';
            const nm = it?.token_name || it?.name || sym;
            if (ct && (bal != null)) {
              try {
                const bn = typeof bal === 'bigint'
                  ? bal
                  : BigInt(new BigNumber(String(bal)).integerValue(BigNumber.ROUND_DOWN).toFixed(0));
                if (bn > 0n) {
                  tokensFromMdw.push({ address: String(ct), symbol: sym, name: nm, decimals: decs, balance: fromAettos(bn, decs) });
                  // eslint-disable-next-line no-console
                  console.info('[add-tokens] PUSH', { address: String(ct), symbol: sym, bn: bn.toString(), decimals: decs });
                } else {
                  // eslint-disable-next-line no-console
                  console.info('[add-tokens] SKIP_ZERO', { address: String(ct), symbol: sym });
                }
              } catch (e) {
                // eslint-disable-next-line no-console
                console.info('[add-tokens] SKIP_PARSE', { address: String(ct), symbol: sym, error: String(e) });
              }
            }
          }
          // eslint-disable-next-line no-console
          console.info('[add-tokens] tokensFromMdw page summary', { count: tokensFromMdw.length });
          cursor = mdw?.next || null;
        }
      } catch {}

      if (scanSeqRef.current === mySeq && !tokensFromMdw.length) {
        // Fallback: probe listed tokens and pool tokens with on-chain balance check
        const { getListedTokens, getPairs } = await import('../libs/dexBackend');
        const listed = await getListedTokens();
        const pairs = await getPairs(false);
        const candidates = new Map<string, { address: string; symbol?: string; name?: string; decimals?: number }>();
        for (const t of listed || []) {
          if (t?.address) candidates.set(t.address, { address: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals });
        }
        for (const p of pairs || []) {
          const t0 = p.token0 || p.token0Address;
          const t1 = p.token1 || p.token1Address;
          if (t0) candidates.set(t0, { address: t0, symbol: p.token0Symbol });
          if (t1) candidates.set(t1, { address: t1, symbol: p.token1Symbol });
        }
        for (const t of candidates.values()) {
          try {
            const c = await sdk.initializeContract({ aci: ACI.AEX9, address: t.address });
            const { decodedResult: bal } = await c.balance(address);
            const bn = BigInt(bal ?? 0);
            if (bn > 0n) {
              // Enrich meta
              let sym = t.symbol || 'TKN';
              let nm = t.name || sym;
              let dec = Number(t.decimals ?? 0) || 18;
              try {
                if (!t.decimals) {
                  const { decodedResult: meta } = await c.meta_info();
                  sym = meta?.symbol || sym;
                  nm = meta?.name || nm;
                  dec = Number(meta?.decimals ?? dec) || 18;
                }
              } catch {}
              tokensFromMdw.push({ address: t.address, symbol: String(sym), name: String(nm), decimals: dec, balance: fromAettos(bn, dec) });
            }
          } catch {}
        }
      }

      // De-duplicate by address and set; keep max balance if dup (debug logs)
      const map = new Map<string, { address: string; symbol: string; name: string; decimals: number; balance: string }>();
      for (const t of tokensFromMdw) {
        const prev = map.get(t.address);
        if (!prev) {
          map.set(t.address, { address: t.address, symbol: String(t.symbol || 'TKN'), name: String(t.name || t.symbol || 'Token'), decimals: Number(t.decimals || 18), balance: String(t.balance) });
        } else {
          // eslint-disable-next-line no-console
          console.info('[add-tokens] Duplicate token encountered, choosing higher balance', { address: t.address, prev: prev.balance, next: t.balance });
          const nextHigher = new BigNumber(t.balance).isGreaterThan(prev.balance) ? String(t.balance) : prev.balance;
          map.set(t.address, { ...prev, balance: nextHigher });
        }
      }
      const out = Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
      // eslint-disable-next-line no-console
      console.info('[add-tokens] Aggregated MDW tokens', {
        total: out.length,
        addresses: out.map((t) => t.address),
      });
      if (scanSeqRef.current === mySeq) setWalletTokens(out);

      // Determine if token has an AE pool (token <> WAE)
      try {
        const { factory } = await initDexContracts(sdk);
        const entries = await Promise.all(out.map(async (t) => {
          try {
            const addr = await getPairAddress(sdk, factory, t.address, DEX_ADDRESSES.wae);
            return [t.address, !!addr] as const;
          } catch { return [t.address, false] as const; }
        }));
        const existsMap: Record<string, boolean> = {};
        for (const [k, v] of entries) existsMap[k] = v;
        if (scanSeqRef.current === mySeq) setPoolExists(existsMap);
      } catch {}
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (address) void discoverWalletTokens(); }, [address]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return walletTokens.filter((t) => !term || t.symbol.toLowerCase().includes(term) || t.address.toLowerCase().includes(term) || (t.name || '').toLowerCase().includes(term));
  }, [walletTokens, filter]);

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '16px 0' }}>
      <DexTabs />
      <h2>Add tokens from your wallet</h2>
      <p style={{ margin: '6px 0 12px', fontSize: 13, opacity: 0.8 }}>
        Detect AEX-9 tokens held by your wallet and quickly create pools or add liquidity for them on the DEX.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input placeholder="Filter by symbol/address" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
        <AeButton onClick={() => void discoverWalletTokens()} disabled={loading} loading={loading} variant="secondary-dark" size="small">{loading ? 'Scanning…' : 'Rescan'}</AeButton>
      </div>
      {error && <div style={{ color: '#ff6b6b', marginBottom: 8 }}>{error}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Token</th><th>Address</th><th>Balance</th><th>AE Pool</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.address}>
                <td>{t.symbol} <span style={{ opacity: 0.75, fontSize: 12 }}>({t.name})</span></td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.address}</td>
                <td style={{ textAlign: 'right' }}>{t.balance}</td>
                <td style={{ textAlign: 'center' }}>{poolExists[t.address] ? 'Exists' : 'Not found'}</td>
                <td style={{ textAlign: 'right' }}>
                  {poolExists[t.address] ? (
                    <AeButton onClick={() => navigate(`/pool/add?from=AE&to=${t.address}`)} variant="secondary-dark" size="small" style={{ marginRight: 8 }}>Add liquidity</AeButton>
                  ) : (
                    <AeButton onClick={() => navigate(`/pool/deploy?token=${t.address}`)} title="Create new pool and add liquidity" variant="secondary-dark" size="small" style={{ marginRight: 8 }}>Create pool</AeButton>
                  )}
                  <AeButton onClick={() => navigate(`/swap?from=AE&to=${t.address}`)} variant="secondary-dark" size="small">Swap</AeButton>
                </td>
              </tr>
            ))}
            {(!filtered.length && !loading) && (
              <tr><td colSpan={4} style={{ opacity: 0.8, padding: 10 }}>No tokens with balance found in your wallet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


