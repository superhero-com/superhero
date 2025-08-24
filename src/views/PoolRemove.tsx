import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ACI, DEX_ADDRESSES, addSlippage, initDexContracts, removeLiquidity, removeLiquidityAe, toAettos, fromAettos, getPairAddress, ensurePairAllowanceForRouter, getPairInfo, subSlippage, getPairAllowanceToRouter } from '../libs/dex';
import ConfirmLiquidityModal from '../components/dex/ConfirmLiquidityModal';
import TokenSelector from '../components/dex/TokenSelector';
import { errorToUserMessage } from '../libs/errorMessages';
import DexSettings from '../components/dex/DexSettings';
import { useToast } from '../components/ToastProvider';
import AeButton from '../components/AeButton';
import { CONFIG } from '../config';

import { useWallet } from '../../hooks';
export default function PoolRemove() {
  const { id } = useParams(); // expect pair address ct_...
  const address = useWallet().address;
  const [percent, setPercent] = useState(0);
  const location = useLocation();
  const [slippage, setSlippage] = useState<number>(() => Number(localStorage.getItem('dex:slippage') || 5));
  const [deadline, setDeadline] = useState<number>(() => Number(localStorage.getItem('dex:deadline') || 30));
  const [liquidity, setLiquidity] = useState('');
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [symbolA, setSymbolA] = useState('');
  const [symbolB, setSymbolB] = useState('');
  const [decA, setDecA] = useState(18);
  const [decB, setDecB] = useState(18);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ ratioAinB?: string; ratioBinA?: string; sharePct?: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const toast = useToast();
  const [minHuman, setMinHuman] = useState<{ a?: string; b?: string }>({});
  const [allowanceInfo, setAllowanceInfo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!tokenA || !tokenB) { setPreview(null); setMinHuman({}); return; }
        const sdk = (window as any).__aeSdk;
        const { factory } = await initDexContracts(sdk);
        const aAddr = tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA;
        const bAddr = tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB;
        const info = await getPairInfo(sdk, factory, aAddr, bAddr);
        if (!info) { setPreview(null); setMinHuman({}); return; }
        const ratioAinB = info.reserveB === 0n ? '-' : (Number(info.reserveA) / Number(info.reserveB)).toFixed(8);
        const ratioBinA = info.reserveA === 0n ? '-' : (Number(info.reserveB) / Number(info.reserveA)).toFixed(8);
        setPreview({ ratioAinB, ratioBinA });
        // Estimate min received based on LP share
        const lp = liquidity ? toAettos(liquidity, 18) : 0n;
        if (lp > 0n && info.totalSupply && info.totalSupply > 0n) {
          const amountAExp = (lp * info.reserveA) / info.totalSupply;
          const amountBExp = (lp * info.reserveB) / info.totalSupply;
          const minA = subSlippage(amountAExp, slippage);
          const minB = subSlippage(amountBExp, slippage);
          setMinHuman({
            a: `${fromAettos(minA, decA)} ${symbolA || (tokenA === 'AE' ? 'AE' : '')}`.trim(),
            b: `${fromAettos(minB, decB)} ${symbolB || (tokenB === 'AE' ? 'AE' : '')}`.trim(),
          });
        } else {
          setMinHuman({});
        }
      } catch { setPreview(null); setMinHuman({}); }
    })();
  }, [tokenA, tokenB, liquidity, slippage, decA, decB, symbolA, symbolB]);

  async function fetchTokenMeta(addr: string): Promise<{ decimals: number; symbol: string }> {
    if (!addr || addr === 'AE') return { decimals: 18, symbol: 'AE' };
    const sdk = (window as any).__aeSdk;
    const t = await sdk.initializeContract({ aci: ACI.AEX9, address: addr });
    const { decodedResult } = await t.meta_info();
    return {
      decimals: Number(decodedResult.decimals ?? 18),
      symbol: decodedResult.symbol || decodedResult.name || 'TKN',
    };
  }

  useEffect(() => {
    void fetchTokenMeta(tokenA)
      .then(({ decimals, symbol }) => { setDecA(decimals); setSymbolA(symbol); })
      .catch(() => { setDecA(18); setSymbolA(tokenA === 'AE' ? 'AE' : ''); });
  }, [tokenA]);
  useEffect(() => {
    void fetchTokenMeta(tokenB)
      .then(({ decimals, symbol }) => { setDecB(decimals); setSymbolB(symbol); })
      .catch(() => { setDecB(18); setSymbolB(tokenB === 'AE' ? 'AE' : ''); });
  }, [tokenB]);

  async function doRemove() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const sdk = (window as any).__aeSdk;
      const { router } = await initDexContracts(sdk);
      const deadlineMs = Date.now() + Math.max(1, Math.min(60, deadline)) * 60_000;
      // naive: user inputs LP amount and token addresses
      const lp = toAettos(liquidity, 18);
      // Compute expected token outputs from reserves and LP share, then apply slippage for safety
      let minA = 0n;
      let minB = 0n;
      try {
        if (tokenA && tokenB) {
          const { factory } = await initDexContracts(sdk);
          const aAddr = tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA;
          const bAddr = tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB;
          const info = await getPairInfo(sdk, factory, aAddr, bAddr);
          if (info && info.totalSupply && info.totalSupply > 0n) {
            const amountAExp = (lp * info.reserveA) / info.totalSupply;
            const amountBExp = (lp * info.reserveB) / info.totalSupply;
            minA = subSlippage(amountAExp, slippage);
            minB = subSlippage(amountBExp, slippage);
          }
        }
      } catch {}
      // Ensure LP allowance for router when removing
      try {
        const { factory } = await initDexContracts(sdk);
        if (tokenA && tokenB) {
          const pairAddr = await getPairAddress(sdk, factory, tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA, tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB);
          if (pairAddr) await ensurePairAllowanceForRouter(sdk, pairAddr, address as string, lp);
          if (pairAddr) {
            try {
              const cur = await getPairAllowanceToRouter(sdk, pairAddr, address as string);
              setAllowanceInfo(`Approved LP: ${fromAettos(cur, 18)} LP`);
            } catch {}
          }
        }
      } catch {}

      let txHash: string | undefined;
      if ((tokenA === 'AE') || (tokenB === 'AE')) {
        const token = tokenA === 'AE' ? tokenB : tokenA;
        const res = await removeLiquidityAe(router, {
          token,
          liquidity: lp,
          minAmountToken: minA,
          minAmountAe: minB,
          toAccount: address as string,
          deadlineMs,
        });
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      } else {
        const res = await removeLiquidity(router, {
          tokenA,
          tokenB,
          liquidity: lp,
          minAmountA: minA,
          minAmountB: minB,
          toAccount: address as string,
          deadlineMs,
        });
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }
      setLiquidity('');
      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          <div>
            <div>Liquidity removed</div>
            {txHash && CONFIG.EXPLORER_URL && (
              <a href={url} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View on explorer</a>
            )}
          </div>
        );
      } catch {}
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'remove-liquidity', slippagePct: slippage, deadlineMins: deadline }));
      try {
        const msg = errorToUserMessage(e, { action: 'remove-liquidity', slippagePct: slippage, deadlineMins: deadline });
        toast.push(<div><div>Remove liquidity failed</div><div style={{ opacity: 0.9 }}>{msg}</div></div>);
      } catch {}
    } finally { setLoading(false); }
  }

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <h2>Remove Liquidity</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        <input placeholder="LP amount" value={liquidity} onChange={(e) => setLiquidity(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
        <TokenSelector label="Token A" selected={tokenA} exclude={[tokenB].filter(Boolean) as string[]} onSelect={(addr, info) => { setTokenA(addr); setSymbolA(info.symbol); }} />
        <TokenSelector label="Token B" selected={tokenB} exclude={[tokenA].filter(Boolean) as string[]} onSelect={(addr, info) => { setTokenB(addr); setSymbolB(info.symbol); }} />
        {preview && (
          <div style={{ border: '1px solid #3a3a4a', padding: 10, borderRadius: 8, background: '#14141c', fontSize: 12 }}>
            <div style={{ marginBottom: 6 }}>Pool info</div>
            <div>Price</div>
            <div>1 {symbolA || tokenA || 'A'} = {preview.ratioAinB} {symbolB || tokenB || 'B'}</div>
            <div>1 {symbolB || tokenB || 'B'} = {preview.ratioBinA} {symbolA || tokenA || 'A'}</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>You will receive tokens in proportion to your withdrawn LP.</div>
            {(minHuman.a || minHuman.b) && (
              <div style={{ marginTop: 6 }}>
                {minHuman.a && <div>Min received (A): {minHuman.a}</div>}
                {minHuman.b && <div>Min received (B): {minHuman.b}</div>}
              </div>
            )}
          </div>
        )}
        {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
        {allowanceInfo && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>{allowanceInfo}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AeButton aria-label="open-settings" onClick={() => setShowSettings((v) => !v)} variant="secondary-dark" size="small">Settings</AeButton>
          <AeButton onClick={() => setShowConfirm(true)} disabled={!address || !liquidity || !tokenA || !tokenB || loading} loading={loading} variant="secondary-dark" size="large">{loading ? 'Removing…' : (address ? 'Remove' : 'Connect wallet')}</AeButton>
        </div>
        {showSettings && (<DexSettings />)}
      </div>
      <ConfirmLiquidityModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); void doRemove(); }}
        isAdding={false}
        tokenASymbol={symbolA || (tokenA === 'AE' ? 'AE' : 'TKN A')}
        tokenBSymbol={symbolB || (tokenB === 'AE' ? 'AE' : 'TKN B')}
        lpAmount={liquidity}
        ratioAinB={preview?.ratioAinB}
        ratioBinA={preview?.ratioBinA}
        slippagePct={slippage}
        deadlineMins={deadline}
        minReceivedA={minHuman.a}
        minReceivedB={minHuman.b}
      />
    </div>
  );
}


