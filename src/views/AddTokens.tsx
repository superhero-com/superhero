/* eslint-disable
  react/function-component-definition,
  @typescript-eslint/no-unused-vars,
  no-plusplus,
  no-await-in-loop,
  no-restricted-syntax,
  no-empty,
  no-void,
  react-hooks/exhaustive-deps,
  max-len
*/
import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Contract } from '@aeternity/aepp-sdk';
import AeButton from '../components/AeButton';
import DexTabs from '../components/dex/DexTabs';
import { useToast } from '../components/ToastProvider';
import { CONFIG } from '../config';
import {
  ACI, DEX_ADDRESSES, fromAettos, getPairAddress, initDexContracts,
} from '../libs/dex';

import { useAeSdk } from '../hooks';

export default function AddTokens() {
  const { t } = useTranslation('addTokens');
  const { t: tDex } = useTranslation('dex');
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
            break;
          }
          const mdw = await r.json();
          const items: any[] = Array.isArray(mdw?.data) ? mdw.data : [];
          for (const it of items) {
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
                  tokensFromMdw.push({
                    address: String(ct), symbol: sym, name: nm, decimals: decs, balance: fromAettos(bn, decs),
                  });
                } else {
                }
              } catch (e) {
              }
            }
          }
          cursor = mdw?.next || null;
        }
      } catch { }

      if (scanSeqRef.current === mySeq && !tokensFromMdw.length) {
        // Fallback: probe listed tokens and pool tokens with on-chain balance check
        const { getListedTokens, getPairs } = await import('../libs/dexBackend');
        const listed = await getListedTokens();
        const pairs = await getPairs(false);
        const candidates = new Map<string, { address: string; symbol?: string; name?: string; decimals?: number }>();
        for (const item of listed || []) {
          if (item?.address) {
            candidates.set(item.address, {
              address: item.address, symbol: item.symbol, name: item.name, decimals: item.decimals,
            });
          }
        }
        for (const p of pairs || []) {
          const t0 = p.token0 || p.token0Address;
          const t1 = p.token1 || p.token1Address;
          if (t0) candidates.set(t0, { address: t0, symbol: p.token0Symbol });
          if (t1) candidates.set(t1, { address: t1, symbol: p.token1Symbol });
        }
        for (const item of candidates.values()) {
          try {
            const c = await Contract.initialize({
              ...sdk.getContext(),
              aci: ACI.AEX9,
              address: item.address as `ct_${string}`,
            });
            const { decodedResult: bal } = await c.balance(activeAccount);
            const bn = BigInt(bal ?? 0);
            if (bn > 0n) {
              // Enrich meta
              let sym = item.symbol || 'TKN';
              let nm = item.name || sym;
              let dec = Number(item.decimals ?? 0) || 18;
              try {
                if (!item.decimals) {
                  const { decodedResult: meta } = await c.meta_info();
                  sym = meta?.symbol || sym;
                  nm = meta?.name || nm;
                  dec = Number(meta?.decimals ?? dec) || 18;
                }
              } catch { }
              tokensFromMdw.push({
                address: item.address, symbol: String(sym), name: String(nm), decimals: dec, balance: fromAettos(bn, dec),
              });
            }
          } catch { }
        }
      }

      // De-duplicate by address and set; keep max balance if dup (debug logs)
      const map = new Map<string, { address: string; symbol: string; name: string; decimals: number; balance: string }>();
      for (const item of tokensFromMdw) {
        const prev = map.get(item.address);
        if (!prev) {
          map.set(item.address, {
            address: item.address, symbol: String(item.symbol || 'TKN'), name: String(item.name || item.symbol || 'Token'), decimals: Number(item.decimals || 18), balance: String(item.balance),
          });
        } else {
          const nextHigher = new BigNumber(item.balance).isGreaterThan(prev.balance) ? String(item.balance) : prev.balance;
          map.set(item.address, { ...prev, balance: nextHigher });
        }
      }
      const out = Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
      if (scanSeqRef.current === mySeq) setWalletTokens(out);

      // Determine if token has an AE pool (token <> WAE)
      try {
        const { factory } = await initDexContracts(sdk);
        const entries = await Promise.all(out.map(async (item) => {
          try {
            const addr = await getPairAddress(sdk, factory, item.address, DEX_ADDRESSES.wae);
            return [item.address, !!addr] as const;
          } catch { return [item.address, false] as const; }
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
    return walletTokens.filter((item) => !term || item.symbol.toLowerCase().includes(term) || item.address.toLowerCase().includes(term) || (item.name || '').toLowerCase().includes(term));
  }, [walletTokens, filter]);

  return (
    <div className="max-w-[900px] mx-auto py-4 px-4">
      <DexTabs />
      <h2 className="text-2xl font-bold text-white mb-2">{t('title')}</h2>
      <p className="text-sm text-white/80 mb-3 leading-relaxed">
        {t('description')}
      </p>
      <div className="flex gap-2 items-center mb-2">
        <input
          placeholder={tDex('filterBySymbolAddress')}
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
          {loading ? tDex('scanning') : tDex('rescan')}
        </AeButton>
      </div>
      {error && <div className="text-red-400 mb-2 p-2 bg-red-500/10 rounded border border-red-500/20">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white/5 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-white/10">
              <th className="text-left p-3 text-sm font-semibold text-white/80">{t('token')}</th>
              <th className="text-left p-3 text-sm font-semibold text-white/80">{t('address')}</th>
              <th className="text-right p-3 text-sm font-semibold text-white/80">{t('balance')}</th>
              <th className="text-center p-3 text-sm font-semibold text-white/80">{t('aePool')}</th>
              <th className="text-right p-3 text-sm font-semibold text-white/80">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.address} className="border-b border-white/10 hover:bg-white/5">
                <td className="p-3">
                  <span className="text-white font-medium">{item.symbol}</span>
                  {' '}
                  <span className="text-white/60 text-xs">
                    (
                    {item.name}
                    )
                  </span>
                </td>
                <td className="p-3 font-mono text-xs text-white/80">{item.address}</td>
                <td className="text-right p-3 text-white">{item.balance}</td>
                <td className="text-center p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    poolExists[item.address]
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                  >
                    {poolExists[item.address] ? t('exists') : t('notFound')}
                  </span>
                </td>
                <td className="text-right p-3">
                  <div className="flex gap-1 justify-end">
                    {poolExists[item.address] ? (
                      <AeButton
                        onClick={() => navigate(`/pool/add?from=AE&to=${item.address}`)}
                        variant="secondary-dark"
                        size="small"
                      >
                        {tDex('addLiquidityButton')}
                      </AeButton>
                    ) : (
                      <AeButton
                        onClick={() => navigate(`/pool/deploy?token=${item.address}`)}
                        title={tDex('createNewPoolAndLiquidity')}
                        variant="secondary-dark"
                        size="small"
                      >
                        {tDex('createPool')}
                      </AeButton>
                    )}
                    <AeButton
                      onClick={() => navigate(`/defi/swap?from=AE&to=${item.address}`)}
                      variant="secondary-dark"
                      size="small"
                    >
                      {tDex('swapButton')}
                    </AeButton>
                  </div>
                </td>
              </tr>
            ))}
            {(!filtered.length && !loading) && (
              <tr>
                <td colSpan={5} className="text-white/60 p-6 text-center">
                  {t('noTokensInWallet')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
