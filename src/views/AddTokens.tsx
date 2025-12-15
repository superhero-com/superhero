import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AeButton from '../components/AeButton';
import DexTabs from '../components/dex/DexTabs';
import { useToast } from '../components/ToastProvider';
import { CONFIG } from '../config';
import { ACI, DEX_ADDRESSES, fromAettos, getPairAddress, initDexContracts } from '../libs/dex';

import { useAeSdk } from '../hooks';
export default function AddTokens() {
  const { activeAccount, sdk } = useAeSdk();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletTokens, setWalletTokens] = useState<Array<{ address: string; symbol: string; name: string; decimals: number; balance: string }>>([]);
  const [filter, setFilter] = useState('');
  const [poolExists, setPoolExists] = useState<Record<string, boolean>>({});
  const scanSeqRef = React.useRef(0);



  async function discoverWalletTokens() {
    const mySeq = ++scanSeqRef.current;
    try {
      setLoading(true); setError(null);
      if (!activeAccount) return;
      // Prefer authoritative balances from MDW; fallback to backend/pools scan
      const tokensFromMdw: Array<{ address: string; symbol?: string; name?: string; decimals?: number; balance: string }> = [];
      try {
        const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
        // Per mdw-swagger.json: /accounts/{accountId}/aex9/balances returns { data: Aex9BalanceResponse[] }
        let cursor: string | null = `/v3/accounts/${activeAccount}/aex9/balances`;
        let guard = 0;
        while (cursor && guard++ < 20) { // hard cap pages to avoid infinite loop
          const r = await fetch(`${base}${cursor.startsWith('/') ? '' : '/'}${cursor}`, { cache: 'no-cache' });
          if (!r.ok) {
            // Enhanced error logging for new accounts
            if (r.status === 404) {
              console.info('[add-tokens] Account not found on middleware:', activeAccount);
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
      } catch { }

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
            const { decodedResult: bal } = await c.balance(activeAccount);
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
              } catch { }
              tokensFromMdw.push({ address: t.address, symbol: String(sym), name: String(nm), decimals: dec, balance: fromAettos(bn, dec) });
            }
          } catch { }
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
      } catch { }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (activeAccount) void discoverWalletTokens(); }, [activeAccount]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return walletTokens.filter((t) => !term || t.symbol.toLowerCase().includes(term) || t.address.toLowerCase().includes(term) || (t.name || '').toLowerCase().includes(term));
  }, [walletTokens, filter]);

  return (
    <div className="w-full py-4 md:py-6">
      {/* Main Content - wrapped in card */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 md:p-8" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
      <DexTabs />
      <h2 className="text-2xl font-bold text-white mb-2">Add tokens from your wallet</h2>
      <p className="text-sm text-white/80 mb-3 leading-relaxed">
        Detect AEX-9 tokens held by your wallet and quickly create pools or add liquidity for them on the DEX.
      </p>
      <div className="flex gap-2 items-center mb-2">
        <input 
          placeholder="Filter by symbol/address" 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          className="flex-1 px-2 py-1.5 rounded bg-[#1a1a23] text-white border border-gray-600 text-sm focus:outline-none focus:border-purple-400"
        />
        <AeButton 
          onClick={() => void discoverWalletTokens()} 
          disabled={loading} 
          loading={loading} 
          variant="secondary-dark" 
          size="small"
        >
          {loading ? 'Scanning…' : 'Rescan'}
        </AeButton>
      </div>
      {error && <div className="text-red-400 mb-2 p-2 bg-red-500/10 rounded border border-red-500/20">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white/5 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-white/10">
              <th className="text-left p-3 text-sm font-semibold text-white/80">Token</th>
              <th className="text-left p-3 text-sm font-semibold text-white/80">Address</th>
              <th className="text-right p-3 text-sm font-semibold text-white/80">Balance</th>
              <th className="text-center p-3 text-sm font-semibold text-white/80">AE Pool</th>
              <th className="text-right p-3 text-sm font-semibold text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.address} className="border-b border-white/10 hover:bg-white/5">
                <td className="p-3">
                  <span className="text-white font-medium">{t.symbol}</span>{' '}
                  <span className="text-white/60 text-xs">({t.name})</span>
                </td>
                <td className="p-3 font-mono text-xs text-white/80">{t.address}</td>
                <td className="text-right p-3 text-white">{t.balance}</td>
                <td className="text-center p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    poolExists[t.address] 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {poolExists[t.address] ? 'Exists' : 'Not found'}
                  </span>
                </td>
                <td className="text-right p-3">
                  <div className="flex gap-1 justify-end">
                    {poolExists[t.address] ? (
                      <AeButton 
                        onClick={() => navigate(`/pool/add?from=AE&to=${t.address}`)} 
                        variant="secondary-dark" 
                        size="small"
                      >
                        Add liquidity
                      </AeButton>
                    ) : (
                      <AeButton 
                        onClick={() => navigate(`/pool/deploy?token=${t.address}`)} 
                        title="Create new pool and add liquidity" 
                        variant="secondary-dark" 
                        size="small"
                      >
                        Create pool
                      </AeButton>
                    )}
                    <AeButton 
                      onClick={() => navigate(`/defi/swap?from=AE&to=${t.address}`)} 
                      variant="secondary-dark" 
                      size="small"
                    >
                      Swap
                    </AeButton>
                  </div>
                </td>
              </tr>
            ))}
            {(!filtered.length && !loading) && (
              <tr>
                <td colSpan={5} className="text-white/60 p-6 text-center">
                  No tokens with balance found in your wallet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}


