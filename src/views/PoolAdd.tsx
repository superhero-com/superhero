import BigNumber from 'bignumber.js';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AeButton from '../components/AeButton';
import ConfirmLiquidityModal from '../components/dex/ConfirmLiquidityModal';
import DexSettings from '../components/dex/DexSettings';
import TokenSelector from '../components/dex/TokenSelector';
import { useToast } from '../components/ToastProvider';
import { CONFIG } from '../config';
import { ACI, DEX_ADDRESSES, MINIMUM_LIQUIDITY, addLiquidity, addLiquidityAe, ensureAllowanceForRouter, fromAettos, getPairInfo, getRouterTokenAllowance, initDexContracts, toAettos } from '../libs/dex';
import { errorToUserMessage } from '../libs/errorMessages';

import { useAeSdk, useDex } from '../hooks';
export default function PoolAdd() {
  const { sdk, activeAccount } = useAeSdk();
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [symbolA, setSymbolA] = useState('');
  const [symbolB, setSymbolB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [decA, setDecA] = useState(18);
  const [decB, setDecB] = useState(18);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slippage = useDex().slippagePct;
  const deadline = useDex().deadlineMins;
  const location = useLocation();
  const [pairPreview, setPairPreview] = useState<{ ratioAinB?: string; ratioBinA?: string; sharePct?: string; lpMintEstimate?: string } | null>(null);
  const [reserves, setReserves] = useState<{ reserveA?: bigint; reserveB?: bigint } | null>(null);
  const [pairExists, setPairExists] = useState<boolean>(false);
  const [linkAmounts, setLinkAmounts] = useState<boolean>(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const toast = useToast();
  const [allowanceInfo, setAllowanceInfo] = useState<string | null>(null);

  const isAePair = tokenA === 'AE' || tokenB === 'AE';

  async function fetchTokenMeta(addr: string): Promise<{ decimals: number; symbol: string }> {
    if (!addr || addr === 'AE') return { decimals: 18, symbol: 'AE' };
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

  // Prefill from query (?from, ?to, ?amountA, ?amountB)
  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search);
      const from = qs.get('from');
      const to = qs.get('to');
      const aA = qs.get('amountA');
      const aB = qs.get('amountB');
      if (from) setTokenA(from);
      if (to) setTokenB(to);
      if (aA) setAmountA(aA);
      if (aB) setAmountB(aB);
    } catch { }
  }, [location.search]);

  // Compute current ratio and estimated pool share
  useEffect(() => {
    (async () => {
      try {
        if (!tokenA || !tokenB) { setPairPreview(null); return; }
        const { factory } = await initDexContracts(sdk);
        const aAddr = tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA;
        const bAddr = tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB;
        const info = await getPairInfo(sdk, factory, aAddr, bAddr);
        if (!info) { setPairPreview(null); setReserves(null); setPairExists(false); return; }
        setReserves({ reserveA: info.reserveA, reserveB: info.reserveB });
        setPairExists(true);
        const rA = new BigNumber(fromAettos(info.reserveA, decA));
        const rB = new BigNumber(fromAettos(info.reserveB, decB));
        const ratioAinB = rB.isZero() ? '-' : rA.div(rB).toFixed(8);
        const ratioBinA = rA.isZero() ? '-' : rB.div(rA).toFixed(8);
        let sharePct = '0.00000000';
        let lpMintEstimate: string | undefined;
        const ain = amountA ? new BigNumber(toAettos(amountA, decA).toString()) : null;
        const bin = amountB ? new BigNumber(toAettos(amountB, decB).toString()) : null;
        if (ain && bin) {
          if (!info.totalSupply || info.totalSupply === 0n) {
            sharePct = '100.00000000';
            // Initial liquidity mints sqrt(A*B) - MIN_LIQUIDITY
            const minted = ain.multipliedBy(bin).sqrt().minus(new BigNumber(MINIMUM_LIQUIDITY.toString()));
            lpMintEstimate = minted.isNegative() ? '0' : minted.toFixed(0);
          } else {
            const prodIn = ain.multipliedBy(bin);
            const prodPool = new BigNumber(info.reserveA.toString()).multipliedBy(info.reserveB.toString());
            const pct = prodIn.multipliedBy(100).div(prodPool.plus(prodIn));
            sharePct = pct.toFixed(8);
            // Approximate LP minted proportional to contribution vs reserves
            const total = new BigNumber(info.totalSupply.toString());
            const mintedA = ain.multipliedBy(total).div(new BigNumber(info.reserveA.toString()));
            const mintedB = bin.multipliedBy(total).div(new BigNumber(info.reserveB.toString()));
            lpMintEstimate = BigNumber.min(mintedA, mintedB).toFixed(0);
          }
        }
        setPairPreview({ ratioAinB, ratioBinA, sharePct, lpMintEstimate });
      } catch { setPairPreview(null); }
    })();
  }, [tokenA, tokenB, amountA, amountB, decA, decB]);

  // Auto-link amounts to current pool ratio when enabled
  useEffect(() => {
    try {
      if (!linkAmounts || !pairExists || !reserves?.reserveA || !reserves?.reserveB) return;
      if (!tokenA || !tokenB) return;
      const rA = new BigNumber(reserves.reserveA.toString());
      const rB = new BigNumber(reserves.reserveB.toString());
      if (rA.isZero() || rB.isZero()) return;
      // If amountA changed, derive amountB when amountB is empty or out-of-sync
      if (amountA && (!amountB || Number(amountB) === 0)) {
        const aIn = new BigNumber(toAettos(amountA, decA).toString());
        const bOpt = aIn.multipliedBy(rB).div(rA);
        const bHuman = fromAettos(BigInt(bOpt.integerValue(BigNumber.ROUND_DOWN).toString()), decB);
        setAmountB(bHuman);
      } else if (amountB && (!amountA || Number(amountA) === 0)) {
        const bIn = new BigNumber(toAettos(amountB, decB).toString());
        const aOpt = bIn.multipliedBy(rA).div(rB);
        const aHuman = fromAettos(BigInt(aOpt.integerValue(BigNumber.ROUND_DOWN).toString()), decA);
        setAmountA(aHuman);
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkAmounts, pairExists, reserves, amountA, amountB, tokenA, tokenB, decA, decB]);

  async function doAdd() {
    setLoading(true); setError(null);
    try {
      const { router } = await initDexContracts(sdk);
      const deadlineMs = Date.now() + Math.max(1, Math.min(60, deadline)) * 60_000;
      let txHash: string | undefined;
      if (isAePair) {
        const token = tokenA === 'AE' ? tokenB : tokenA;
        const decT = tokenA === 'AE' ? decB : decA;
        const humanToken = tokenA === 'AE' ? amountB : amountA;
        const humanAe = tokenA === 'AE' ? amountA : amountB;
        const amtT = toAettos(humanToken, decT);
        const amtAe = toAettos(humanAe, 18);
        if (amtT <= 0n || amtAe <= 0n) throw new Error('Amounts must be greater than zero');
        await ensureAllowanceForRouter(sdk, token, activeAccount as string, amtT);
        try {
          const cur = await getRouterTokenAllowance(sdk, token, activeAccount as string);
          // Update allowance info for feedback
          const sym = token === tokenA ? (symbolA || 'TKN') : (symbolB || 'TKN');
          setAllowanceInfo(`Approved ${fromAettos(cur, decT)} ${sym}`);
        } catch { }
        // If pool exists with reserves, enforce ratio match to avoid insufficient A/B errors
        try {
          const aAddr = tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA;
          const bAddr = tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB;
          const { factory } = await initDexContracts(sdk);
          const info = await getPairInfo(sdk, factory, aAddr, bAddr);
          if (info && info.reserveA > 0n && info.reserveB > 0n) {
            const rA = new BigNumber(info.reserveA.toString());
            const rB = new BigNumber(info.reserveB.toString());
            const desiredT = new BigNumber(amtT.toString());
            const desiredAe = new BigNumber(amtAe.toString());
            const requiredT = tokenA === 'AE' ? desiredAe.multipliedBy(rB).div(rA) : desiredT.multipliedBy(rA).div(rB);
            const pctDiff = requiredT.minus(tokenA === 'AE' ? desiredT : desiredAe).abs().div(requiredT).multipliedBy(100);
            if (pctDiff.gt(5)) {
              throw new Error('Amounts do not match pool ratio. Enable auto-link or adjust amounts.');
            }
          }
        } catch { }
        const res = await addLiquidityAe(sdk, router, {
          token,
          amountTokenDesired: amtT,
          amountAeDesired: amtAe,
          slippagePct: slippage,
          minimumLiquidity: MINIMUM_LIQUIDITY,
          toAccount: activeAccount as string,
          deadlineMs,
        });
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      } else {
        const amtA = toAettos(amountA, decA);
        const amtB = toAettos(amountB, decB);
        if (amtA <= 0n || amtB <= 0n) throw new Error('Amounts must be greater than zero');
        await ensureAllowanceForRouter(sdk, tokenA, activeAccount as string, amtA);
        await ensureAllowanceForRouter(sdk, tokenB, activeAccount as string, amtB);
        try {
          const [curA, curB] = await Promise.all([
            getRouterTokenAllowance(sdk, tokenA, activeAccount as string),
            getRouterTokenAllowance(sdk, tokenB, activeAccount as string),
          ]);
          setAllowanceInfo(`Approved ${fromAettos(curA, decA)} ${symbolA || 'TKN A'} and ${fromAettos(curB, decB)} ${symbolB || 'TKN B'}`);
        } catch { }
        // Enforce ratio if pool has reserves
        try {
          const aAddr = tokenA;
          const bAddr = tokenB;
          const { factory } = await initDexContracts(sdk);
          const info = await getPairInfo(sdk, factory, aAddr, bAddr);
          if (info && info.reserveA > 0n && info.reserveB > 0n) {
            const rA = new BigNumber(info.reserveA.toString());
            const rB = new BigNumber(info.reserveB.toString());
            const desiredA = new BigNumber(amtA.toString());
            const desiredB = new BigNumber(amtB.toString());
            const requiredB = desiredA.multipliedBy(rB).div(rA);
            const pctDiff = requiredB.minus(desiredB).abs().div(requiredB).multipliedBy(100);
            if (pctDiff.gt(5)) {
              throw new Error('Amounts do not match pool ratio. Enable auto-link or adjust amounts.');
            }
          }
        } catch { }
        const res = await addLiquidity(sdk, router, {
          tokenA,
          tokenB,
          amountADesired: amtA,
          amountBDesired: amtB,
          slippagePct: slippage,
          minimumLiquidity: MINIMUM_LIQUIDITY,
          toAccount: activeAccount as string,
          deadlineMs,
        });
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }
      setAmountA(''); setAmountB('');
      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          <div>
            <div>Liquidity added</div>
            {txHash && CONFIG.EXPLORER_URL && (
              <a href={url} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View on explorer</a>
            )}
          </div>
        );
      } catch { }
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'add-liquidity', slippagePct: slippage, deadlineMins: deadline }));
      try {
        const msg = errorToUserMessage(e, { action: 'add-liquidity', slippagePct: slippage, deadlineMins: deadline });
        toast.push(<div><div>Add liquidity failed</div><div style={{ opacity: 0.9 }}>{msg}</div></div>);
      } catch { }
    } finally { setLoading(false); }
  }

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <h2>Add Liquidity</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        <TokenSelector
          label="Token A"
          selected={tokenA}
          exclude={[tokenB].filter(Boolean) as string[]}
          onSelect={(addr, info) => { setTokenA(addr); setSymbolA(info.symbol); }}
        />
        <input
          aria-label="amount-a"
          placeholder="Amount A"
          value={amountA}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '.');
            const decs = decA ?? 18;
            const m = raw.match(/^\d*(?:\.(\d*)?)?$/);
            if (!m) return;
            const frac = m[1] || '';
            const trimmed = frac.length > decs ? `${raw.split('.')[0]}.${frac.slice(0, decs)}` : raw;
            if (trimmed.startsWith('.')) return;
            setAmountA(trimmed);
          }}
          style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
        />
        <TokenSelector
          label="Token B"
          selected={tokenB}
          exclude={[tokenA].filter(Boolean) as string[]}
          onSelect={(addr, info) => { setTokenB(addr); setSymbolB(info.symbol); }}
        />
        <input
          aria-label="amount-b"
          placeholder="Amount B"
          value={amountB}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '.');
            const decs = decB ?? 18;
            const m = raw.match(/^\d*(?:\.(\d*)?)?$/);
            if (!m) return;
            const frac = m[1] || '';
            const trimmed = frac.length > decs ? `${raw.split('.')[0]}.${frac.slice(0, decs)}` : raw;
            if (trimmed.startsWith('.')) return;
            setAmountB(trimmed);
          }}
          style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
        />
        {(amountA && amountB) ? (
          <div style={{ border: '1px solid #3a3a4a', padding: 10, borderRadius: 8, background: '#14141c', fontSize: 12 }}>
            <div style={{ marginBottom: 6 }}>Preview</div>
            <div>Supplying: {amountA} {symbolA || tokenA || 'A'} and {amountB} {symbolB || tokenB || 'B'}</div>
            <div style={{ opacity: 0.9 }}>These are the amounts you will deposit into the pool.</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>
              Providing liquidity exposes you to impermanent loss.
              {' '}<a href="https://www.coinbase.com/learn/crypto-basics/what-is-impermanent-loss" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Learn more</a>
            </div>
            <div style={{ marginTop: 6 }}>Rate</div>
            <div>1 {symbolA || tokenA || 'A'} ≈ {(Number(amountB) || 0) / (Number(amountA) || 1)} {symbolB || tokenB || 'B'}</div>
            <div>1 {symbolB || tokenB || 'B'} ≈ {(Number(amountA) || 0) / (Number(amountB) || 1)} {symbolA || tokenA || 'A'}</div>
          </div>
        ) : null}
        {pairPreview && (
          <div style={{ border: '1px solid #3a3a4a', padding: 10, borderRadius: 8, background: '#14141c', fontSize: 12 }}>
            <div style={{ marginBottom: 6 }}>Pool info</div>
            <div>Price</div>
            <div>1 {symbolA || tokenA || 'A'} = {pairPreview.ratioAinB} {symbolB || tokenB || 'B'}</div>
            <div>1 {symbolB || tokenB || 'B'} = {pairPreview.ratioBinA} {symbolA || tokenA || 'A'}</div>
            {pairPreview.sharePct && (
              <div style={{ marginTop: 6 }}>
                <div>Your pool share: {pairPreview.sharePct}%</div>
                <div style={{ opacity: 0.9 }}>This is your share of the pool after supplying these amounts.</div>
              </div>
            )}
            {pairPreview.lpMintEstimate && (
              <div style={{ marginTop: 6 }}>LP tokens you’ll mint (approx.): {pairPreview.lpMintEstimate}</div>
            )}
          </div>
        )}
        {allowanceInfo && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>{allowanceInfo}</div>
        )}
        {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, opacity: 0.85 }}>
            <input type="checkbox" checked={linkAmounts} onChange={(e) => setLinkAmounts(e.target.checked)} />
            Auto link amounts to pool ratio
          </label>
          <AeButton aria-label="open-settings" onClick={() => setShowSettings((v) => !v)} variant="secondary-dark" size="small">Settings</AeButton>
          <AeButton onClick={() => setShowConfirm(true)} disabled={!address || !tokenA || !tokenB || !amountA || !amountB || loading} loading={loading} variant="secondary-dark" size="large">{loading ? 'Supplying…' : (address ? 'Supply' : 'Connect wallet')}</AeButton>
        </div>
        {showSettings && (<DexSettings />)}
      </div>

      <ConfirmLiquidityModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); void doAdd(); }}
        isAdding
        tokenASymbol={symbolA || (tokenA === 'AE' ? 'AE' : 'TKN A')}
        tokenBSymbol={symbolB || (tokenB === 'AE' ? 'AE' : 'TKN B')}
        amountA={amountA}
        amountB={amountB}
        ratioAinB={pairPreview?.ratioAinB}
        ratioBinA={pairPreview?.ratioBinA}
        sharePct={pairPreview?.sharePct}
        slippagePct={slippage}
        deadlineMins={deadline}
        rateHint={pairPreview?.lpMintEstimate ? `LP tokens you’ll mint (approx.): ${pairPreview.lpMintEstimate}` : undefined}
      />
    </div>
  );
}


