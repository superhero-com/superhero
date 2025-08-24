import React, { useEffect, useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import { DEX_ADDRESSES, initDexContracts, toAettos, fromAettos, subSlippage, addSlippage, ensureAllowanceForRouter } from '../libs/dex';
import AeButton from '../components/AeButton';

import { useWallet, useAeternity } from '../hooks';

type TokenSelection = { address: string | 'native'; symbol: string; decimals: number };

export default function Swap() {
  const { address } = useWallet();
  const { sdk: sdkState, initSdk } = useAeternity();
  const [router, setRouter] = useState<any | null>(null);
  const [factory, setFactory] = useState<any | null>(null);

  // Force ETH->AE flow: from = aeETH on AE after bridging, to = AE
  const [fromToken, setFromToken] = useState<TokenSelection>({ address: DEX_ADDRESSES.aeeth, symbol: 'aeETH', decimals: 18 });
  const [toToken, setToToken] = useState<TokenSelection>({ address: 'native', symbol: 'AE', decimals: 18 });
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [isExactIn, setIsExactIn] = useState(true);
  const [slippage, setSlippage] = useState(5);
  const [showFromSel, setShowFromSel] = useState(false);
  const [showToSel, setShowToSel] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!sdkState) {
        await initSdk();
      }
    })();
  }, [initSdk, sdkState]);

  useEffect(() => {
    (async () => {
      const sdk = (window as any).__aeSdk;
      if (!sdk) return;
      const { router: r, factory: f } = await initDexContracts(sdk);
      setRouter(r);
      setFactory(f);
    })();
  }, [sdkState]);

  const path = useMemo(() => {
    const a = fromToken.address === 'native' ? DEX_ADDRESSES.wae : (fromToken.address as string);
    const b = toToken.address === 'native' ? DEX_ADDRESSES.wae : (toToken.address as string);
    return [a, b];
  }, [fromToken, toToken]);

  const connectWallet = async () => {
    try {
      await dispatch<any>(scanForWallets());
    } catch (e: any) {
      setError(e?.message || 'Failed to connect wallet');
    }
  };

  async function quote() {
    const sdk = (window as any).__aeSdk;
    if (!router || !sdk) return;
    setQuoting(true);
    setError(null);
    try {
      if (isExactIn) {
        const ain = toAettos(amountIn, fromToken.decimals);
        const { decodedResult } = await router.get_amounts_out(ain, path);
        const out = decodedResult[decodedResult.length - 1];
        setAmountOut(fromAettos(out, toToken.decimals));
      } else {
        const aout = toAettos(amountOut, toToken.decimals);
        const { decodedResult } = await router.get_amounts_in(aout, path);
        const ain = decodedResult[0];
        setAmountIn(fromAettos(ain, fromToken.decimals));
      }
    } catch (e: any) {
      setError(e?.message || 'Quote failed');
    } finally {
      setQuoting(false);
    }
  }

  async function doSwap() {
    const sdk = (window as any).__aeSdk;
    if (!router || !sdk || !address) return;
    setSwapping(true);
    setError(null);
    try {
      const deadline = Date.now() + 30 * 60_000;
      const isAEIn = fromToken.address === 'native';
      const isAEOut = toToken.address === 'native';
      if (isExactIn) {
        const ain = toAettos(amountIn, fromToken.decimals);
        if (!isAEIn) {
          await ensureAllowanceForRouter(sdk, fromToken.address as string, address, ain);
        }
        if (isAEIn) {
          const { decodedResult } = await router.get_amounts_out(ain, path);
          const out = decodedResult[decodedResult.length - 1] as bigint;
          const minOut = subSlippage(out, slippage);
          await router.swap_exact_ae_for_tokens(minOut, path, address, deadline, null, { amount: ain.toString() });
        } else if (isAEOut) {
          const { decodedResult } = await router.get_amounts_out(ain, path);
          const out = decodedResult[decodedResult.length - 1] as bigint;
          const minOut = subSlippage(out, slippage);
          await router.swap_exact_tokens_for_ae(ain, minOut, path, address, deadline, null);
        } else {
          const { decodedResult } = await router.get_amounts_out(ain, path);
          const out = decodedResult[decodedResult.length - 1] as bigint;
          const minOut = subSlippage(out, slippage);
          await router.swap_exact_tokens_for_tokens(ain, minOut, path, address, deadline, null);
        }
      } else {
        const aout = toAettos(amountOut, toToken.decimals);
        if (isAEOut) {
          const { decodedResult } = await router.get_amounts_in(aout, path);
          const ain = decodedResult[0] as bigint;
          const maxIn = addSlippage(ain, slippage);
          await ensureAllowanceForRouter(sdk, fromToken.address as string, address, maxIn);
          await router.swap_tokens_for_exact_ae(aout, maxIn, path, address, deadline, null);
        } else if (isAEIn) {
          const { decodedResult } = await router.get_amounts_in(aout, path);
          const ain = decodedResult[0] as bigint;
          const maxAe = addSlippage(ain, slippage).toString();
          await router.swap_ae_for_exact_tokens(aout, path, address, deadline, null, { amount: maxAe });
        } else {
          const { decodedResult } = await router.get_amounts_in(aout, path);
          const ain = decodedResult[0] as bigint;
          const maxIn = addSlippage(ain, slippage);
          await ensureAllowanceForRouter(sdk, fromToken.address as string, address, maxIn);
          await router.swap_tokens_for_exact_tokens(aout, maxIn, path, address, deadline, null);
        }
      }
      setAmountIn('');
      setAmountOut('');
    } catch (e: any) {
      setError(e?.message || 'Swap failed');
    } finally {
      setSwapping(false);
    }
  }

  const canSwap = useMemo(() => {
    const a = new BigNumber(isExactIn ? amountIn : amountOut);
    return !!address && !!router && a.isFinite() && a.gt(0);
  }, [address, router, amountIn, amountOut, isExactIn]);

  return (
    <div className="container" style={{ padding: '16px 0', maxWidth: 560 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>ETHXIT</div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
          Bridge and exit from Ethereum to æternity. Swap bridged aeETH to native AE quickly. For trading other tokens on æternity, use the DEX.{' '}
          <a href="https://swap.superhero.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Learn more</a>
        </p>
        {!address ? (
          <AeButton onClick={connectWallet} size="large">Connect Wallet</AeButton>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Address: {address}</div>
        )}

        <div style={{ display: 'grid', gap: 8, border: '1px solid #3a3a4a', borderRadius: 8, padding: 12 }}>
          <div>From (aeETH on AE)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <AeButton disabled variant="disabled-token" size="small">{fromToken.symbol}</AeButton>
            <input id="amountIn" name="amountIn" value={amountIn} onChange={(e) => { setIsExactIn(true); setAmountIn(e.target.value); }} placeholder="0.0" style={{ flex: 1 }} />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>↓</div>

        <div style={{ display: 'grid', gap: 8, border: '1px solid #3a3a4a', borderRadius: 8, padding: 12 }}>
          <div>To (AE)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <AeButton disabled variant="disabled-token" size="small">{toToken.symbol}</AeButton>
            <input id="amountOut" name="amountOut" value={amountOut} onChange={(e) => { setIsExactIn(false); setAmountOut(e.target.value); }} placeholder="0.0" style={{ flex: 1 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <AeButton onClick={quote} disabled={!router || quoting} loading={quoting} size="large" style={{ flex: 1 }}>{quoting ? 'Quoting…' : 'Get Quote'}</AeButton>
          <AeButton onClick={doSwap} disabled={!canSwap || swapping} loading={swapping} size="large" style={{ flex: 1 }}>{swapping ? 'Swapping…' : 'Swap'}</AeButton>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor="slippage">Slippage</label>
          <input id="slippage" name="slippage" type="number" min={0} max={100} step={0.1} value={slippage} onChange={(e) => setSlippage(Number(e.target.value))} style={{ width: 100 }} />
          <span>%</span>
        </div>

        {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
      </div>

      {/* Token selection disabled for ETHXIT fixed flow */}
    </div>
  );
}



