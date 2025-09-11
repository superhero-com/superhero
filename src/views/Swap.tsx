import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import AeButton from '../components/AeButton';
import { addSlippage, DEX_ADDRESSES, ensureAllowanceForRouter, fromAettos, initDexContracts, subSlippage, toAettos } from '../libs/dex';

import { useAeSdk, useWalletConnect } from '../hooks';

type TokenSelection = { address: string | 'native'; symbol: string; decimals: number };

export default function Swap() {
  const { sdk, activeAccount } = useAeSdk();
  const { connectWallet } = useWalletConnect();
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
      const { router: r, factory: f } = await initDexContracts(sdk);
      setRouter(r);
      setFactory(f);
    })();
  }, []);

  const path = useMemo(() => {
    const a = fromToken.address === 'native' ? DEX_ADDRESSES.wae : (fromToken.address as string);
    const b = toToken.address === 'native' ? DEX_ADDRESSES.wae : (toToken.address as string);
    return [a, b];
  }, [fromToken, toToken]);


  async function quote() {
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
    if (!router || !sdk || !activeAccount) return;
    setSwapping(true);
    setError(null);
    try {
      const deadline = Date.now() + 30 * 60_000;
      const isAEIn = fromToken.address === 'native';
      const isAEOut = toToken.address === 'native';
      if (isExactIn) {
        const ain = toAettos(amountIn, fromToken.decimals);
        if (!isAEIn) {
          await ensureAllowanceForRouter(sdk, fromToken.address as string, activeAccount, ain);
        }
        if (isAEIn) {
          const { decodedResult } = await router.get_amounts_out(ain, path);
          const out = decodedResult[decodedResult.length - 1] as bigint;
          const minOut = subSlippage(out, slippage);
          await router.swap_exact_ae_for_tokens(minOut, path, activeAccount, deadline, null, { amount: ain.toString() });
        } else if (isAEOut) {
          const { decodedResult } = await router.get_amounts_out(ain, path);
          const out = decodedResult[decodedResult.length - 1] as bigint;
          const minOut = subSlippage(out, slippage);
          await router.swap_exact_tokens_for_ae(ain, minOut, path, activeAccount, deadline, null);
        } else {
          const { decodedResult } = await router.get_amounts_out(ain, path);
          const out = decodedResult[decodedResult.length - 1] as bigint;
          const minOut = subSlippage(out, slippage);
          await router.swap_exact_tokens_for_tokens(ain, minOut, path, activeAccount, deadline, null);
        }
      } else {
        const aout = toAettos(amountOut, toToken.decimals);
        if (isAEOut) {
          const { decodedResult } = await router.get_amounts_in(aout, path);
          const ain = decodedResult[0] as bigint;
          const maxIn = addSlippage(ain, slippage);
          await ensureAllowanceForRouter(sdk, fromToken.address as string, activeAccount, maxIn);
          await router.swap_tokens_for_exact_ae(aout, maxIn, path, activeAccount, deadline, null);
        } else if (isAEIn) {
          const { decodedResult } = await router.get_amounts_in(aout, path);
          const ain = decodedResult[0] as bigint;
          const maxAe = addSlippage(ain, slippage).toString();
          await router.swap_ae_for_exact_tokens(aout, path, activeAccount, deadline, null, { amount: maxAe });
        } else {
          const { decodedResult } = await router.get_amounts_in(aout, path);
          const ain = decodedResult[0] as bigint;
          const maxIn = addSlippage(ain, slippage);
          await ensureAllowanceForRouter(sdk, fromToken.address as string, activeAccount, maxIn);
          await router.swap_tokens_for_exact_tokens(aout, maxIn, path, activeAccount, deadline, null);
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
    return !!activeAccount && !!router && a.isFinite() && a.gt(0);
  }, [activeAccount, router, amountIn, amountOut, isExactIn]);

  return (
    <div className="max-w-[560px] mx-auto py-4 px-4">
      <div className="grid gap-3">
        <div className="font-bold text-lg text-white">ETHXIT</div>
        <p className="m-0 text-sm text-white/80 leading-relaxed">
          Bridge and exit from Ethereum to æternity. Swap bridged aeETH to native AE quickly. For trading other tokens on æternity, use the DEX.{' '}
          <a href="https://swap.superhero.com" target="_blank" rel="noreferrer" className="underline text-purple-400 hover:text-purple-300">Learn more</a>
        </p>
        {!activeAccount ? (
          <AeButton onClick={connectWallet} size="large">Connect Wallet</AeButton>
        ) : (
          <div className="text-xs text-white/80">Address: {activeAccount}</div>
        )}

        <div className="grid gap-2 border border-gray-600 rounded-lg p-3 bg-white/5 backdrop-blur-sm">
          <div className="text-white/90 font-medium">From (aeETH on AE)</div>
          <div className="flex gap-2">
            <AeButton disabled variant="disabled-token" size="small">{fromToken.symbol}</AeButton>
            <input 
              id="amountIn" 
              name="amountIn" 
              value={amountIn} 
              onChange={(e) => { setIsExactIn(true); setAmountIn(e.target.value); }} 
              placeholder="0.0" 
              className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <div className="text-center text-white/60 text-lg">↓</div>

        <div className="grid gap-2 border border-gray-600 rounded-lg p-3 bg-white/5 backdrop-blur-sm">
          <div className="text-white/90 font-medium">To (AE)</div>
          <div className="flex gap-2">
            <AeButton disabled variant="disabled-token" size="small">{toToken.symbol}</AeButton>
            <input 
              id="amountOut" 
              name="amountOut" 
              value={amountOut} 
              onChange={(e) => { setIsExactIn(false); setAmountOut(e.target.value); }} 
              placeholder="0.0" 
              className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <AeButton onClick={quote} disabled={!router || quoting} loading={quoting} size="large" className="flex-1">
            {quoting ? 'Quoting…' : 'Get Quote'}
          </AeButton>
          <AeButton onClick={doSwap} disabled={!canSwap || swapping} loading={swapping} size="large" className="flex-1">
            {swapping ? 'Swapping…' : 'Swap'}
          </AeButton>
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="slippage" className="text-white/80 text-sm">Slippage</label>
          <input 
            id="slippage" 
            name="slippage" 
            type="number" 
            min={0} 
            max={100} 
            step={0.1} 
            value={slippage} 
            onChange={(e) => setSlippage(Number(e.target.value))} 
            className="w-24 px-2 py-1 bg-black/20 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-purple-400"
          />
          <span className="text-white/80 text-sm">%</span>
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}
      </div>

      {/* Token selection disabled for ETHXIT fixed flow */}
    </div>
  );
}



