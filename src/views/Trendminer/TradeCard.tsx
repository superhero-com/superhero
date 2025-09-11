import {
  initAffiliationTokenGatingTokenSale
} from "bctsl-sdk";
import { useMemo, useState } from 'react';

import BigNumber from 'bignumber.js';
import WalletConnectBtn from '../../components/WalletConnectBtn';
import { useAeSdk } from '../../hooks';
import { calculateBuyPriceWithAffiliationFee, calculateSellReturn, calculateTokensFromAE, calculateTokensToSellFromAE, toAe, toDecimals } from '../../utils/bondingCurve';

type Props = { token: any };

export default function TradeCard({ token }: Props) {
  const { sdk } = useAeSdk();
  const [isBuying, setIsBuying] = useState(true);
  const [tokenA, setTokenA] = useState<number | ''>(''); // token amount
  const [tokenB, setTokenB] = useState<number | ''>(''); // ae amount
  const [focused, setFocused] = useState<'A' | 'B' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const [slippage, setSlippage] = useState<number>(1.0);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const disabled = useMemo(() => loading || (!tokenA && !tokenB), [loading, tokenA, tokenB]);

  // async function connect() {
  //   try {
  //     if (!sdk) {
  //       await initSdk();
  //       await scanForWallets();
  //       setSdkReady(true);
  //     }
  //   } catch (error) {
  //     console.error('Failed to connect wallet:', error);
  //     setError('Failed to connect wallet');
  //   }
  // }

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      if (!sdk) throw new Error('Wallet not connected');
      const saleAddress = token?.sale_address || token?.address;
      if (!saleAddress) throw new Error('Token sale address missing');
      console.log('saleAddress', saleAddress);
      const tokenSale = await initAffiliationTokenGatingTokenSale(sdk, saleAddress);
      const isBuy = isBuying;
      if (isBuy) {
        // Contract expects token count, not AE amount
        let tokenAmount = Number(tokenA || 0);
        if (!tokenAmount) {
          // Derive tokens from AE input if only AE provided
          const totalSupplyAettos = new BigNumber(String(token?.total_supply || 0));
          const tokensDelta = calculateTokensFromAE(totalSupplyAettos, Number(tokenB || 0));
          tokenAmount = Number(tokensDelta.toFixed(6));
        }
        if (!tokenAmount) throw new Error('Enter token amount to buy');
        await tokenSale.buy(tokenAmount, undefined, slippage);
      } else {
        const tokAmount = Number(tokenA || 0);
        if (!tokAmount) throw new Error('Enter token amount');
        const dec = await tokenSale.createSellAllowance(String(tokAmount));
        await tokenSale.sellWithExistingAllowance(dec, slippage);
      }
      setTokenA('');
      setTokenB('');
    } catch (e: any) {
      console.error('Failed to connect wallet:', e);
      setError(e?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }

  const currentPriceAE = Number(token?.price ?? 0); // AE per token
  const marketCapAE = Number(token?.market_cap ?? 0);

  function onChangeA(v: string) {
    const num = v === '' ? '' : Number(v);
    setFocused('A');
    setTokenA(num as any);
    if (v === '' || !isFinite(Number(v))) {
      setTokenB('');
    } else {
      // Estimate AE using curve average price for the delta
      try {
        const decimals = Number(token?.decimals ?? 18);
        const totalSupplyAettos = new BigNumber(String(token?.total_supply || 0));
        const deltaAettos = toDecimals(Number(num || 0), decimals);
        if (isBuying) {
          const costAettos = calculateBuyPriceWithAffiliationFee(totalSupplyAettos, deltaAettos);
          setTokenB(toAe(costAettos));
        } else {
          const receiveAettos = calculateSellReturn(totalSupplyAettos, deltaAettos);
          setTokenB(toAe(receiveAettos));
        }
      } catch {
        setTokenB(Number(v) * Math.max(currentPriceAE, 0));
      }
    }
    recomputeImpact(num === '' ? 0 : Number(num), isBuying);
  }
  function onChangeB(v: string) {
    const num = v === '' ? '' : Number(v);
    setFocused('B');
    setTokenB(num as any);
    if (v === '' || !isFinite(Number(v))) {
      setTokenA('');
    } else {
      // Convert AE to tokens using curve inversion
      try {
        const totalSupplyAettos = new BigNumber(String(token?.total_supply || 0));
        const tokensDelta = isBuying
          ? calculateTokensFromAE(totalSupplyAettos, Number(num))
          : calculateTokensToSellFromAE(totalSupplyAettos, Number(num));
        const decimals = Number(token?.decimals ?? 18);
        // tokensDelta is in whole tokens (not scaled)
        setTokenA(Number(tokensDelta.toFixed(6)));
      } catch {
        setTokenA(isBuying ? Number(v) / Math.max(currentPriceAE, 1e-9) : Number(v) * Math.max(currentPriceAE, 0));
      }
    }
    const aeAmount = num === '' ? 0 : Number(num);
    recomputeImpactFromAe(aeAmount, isBuying);
  }

  function recomputeImpact(tokensAmount: number, buying: boolean) {
    if (!isFinite(tokensAmount) || tokensAmount <= 0 || currentPriceAE <= 0 || marketCapAE <= 0) {
      setPriceImpact(null);
      return;
    }
    const aeAmount = tokensAmount * currentPriceAE;
    recomputeImpactFromAe(aeAmount, buying);
  }
  function recomputeImpactFromAe(aeAmount: number, buying: boolean) {
    if (!isFinite(aeAmount) || aeAmount <= 0) {
      setPriceImpact(null);
      return;
    }
    try {
      const decimals = Number(token?.decimals ?? 18);
      const totalSupplyAettos = new BigNumber(String(token?.total_supply || 0));
      if (totalSupplyAettos.isNaN()) { setPriceImpact(null); return; }
      const currentPrice = currentPriceAE;
      if (!currentPrice || currentPrice <= 0) { setPriceImpact(null); return; }
      // Convert AE amount to token amount using current price as rough estimate for preview
      const approxTokens = aeAmount / currentPrice;
      if (!isFinite(approxTokens) || approxTokens <= 0) { setPriceImpact(null); return; }
      const deltaAettos = toDecimals(approxTokens, decimals);
      const costNext = buying
        ? calculateBuyPriceWithAffiliationFee(totalSupplyAettos, deltaAettos)
        : calculateSellReturn(totalSupplyAettos, deltaAettos);
      const avgNextPriceAE = toAe(costNext) / Math.max(approxTokens, 1e-9);
      const impactPct = ((avgNextPriceAE - currentPrice) / currentPrice) * 100;
      setPriceImpact(Math.max(-99.99, Math.min(99.99, impactPct)));
    } catch {
      setPriceImpact(null);
    }
  }

  const averagePrice = useMemo(() => {
    const a = Number(tokenA || 0);
    const b = Number(tokenB || 0);
    if (!a || !b) return 0;
    return b / a;
  }, [tokenA, tokenB]);

  const protocolDaoReward = useMemo(() => {
    if (!isBuying) return null;
    const ae = Number(tokenB || 0);
    if (!ae) return null;
    const PROTOCOL_DAO_TOKEN_AE_RATIO = 1000;
    const PROTOCOL_DAO_AFFILIATION_FEE = 0.05;
    const reward = (1 - PROTOCOL_DAO_AFFILIATION_FEE) * PROTOCOL_DAO_TOKEN_AE_RATIO * ae;
    return Math.round(reward * 100) / 100;
  }, [isBuying, tokenB]);

  return (
    <div className="bg-gradient-to-b from-black/65 to-black/45 border border-white/15 rounded-xl p-4 text-white shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button 
          className={`px-3 py-2.5 rounded-lg border font-bold transition-all duration-150 ${
            isBuying 
              ? 'bg-green-500 text-white border-transparent' 
              : 'bg-black/20 border-black/20 text-white/90 hover:brightness-95'
          }`} 
          onClick={() => setIsBuying(true)}
        >
          Buy
        </button>
        <button 
          className={`px-3 py-2.5 rounded-lg border font-bold transition-all duration-150 ${
            !isBuying 
              ? 'bg-red-500 text-white border-transparent' 
              : 'bg-black/20 border-black/20 text-white/90 hover:brightness-95'
          }`} 
          onClick={() => setIsBuying(false)}
        >
          Sell
        </button>
      </div>

      <div className="grid gap-2.5">
        <label className="grid gap-1.5">
          <span className="text-xs text-white/90">{token?.symbol} amount</span>
          <input 
            type="number" 
            min="0" 
            step="any" 
            value={tokenA} 
            onChange={(e) => onChangeA(e.target.value)} 
            onFocus={() => setFocused('A')} 
            placeholder="0.0"
            className="w-full px-3 py-3 rounded-xl border border-white/25 bg-white/10 text-white outline-none transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.15)] focus:border-white/40"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs text-white/90">{isBuying ? 'AE to spend' : 'AE to receive'}</span>
          <input 
            type="number" 
            min="0" 
            step="any" 
            value={tokenB} 
            onChange={(e) => onChangeB(e.target.value)} 
            onFocus={() => setFocused('B')} 
            placeholder="0.0"
            className="w-full px-3 py-3 rounded-xl border border-white/25 bg-white/10 text-white outline-none transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.15)] focus:border-white/40"
          />
        </label>
      </div>

      <div className="grid gap-1.5 mt-2.5 text-sm">
        {!!averagePrice && (
          <div className="flex justify-between">
            <div>Avg. token price</div>
            <div>{averagePrice.toFixed(6)} AE</div>
          </div>
        )}
        {priceImpact != null && (
          <div className="flex justify-between">
            <div>Price impact</div>
            <div className={isBuying ? 'text-green-500' : 'text-red-500'}>{priceImpact.toFixed(2)}%</div>
          </div>
        )}
      </div>

      <div className="mt-2">
        <button 
          className="border-0 bg-transparent text-white/95 p-0 cursor-pointer underline text-sm hover:text-white transition-colors"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
        {showDetails && (
          <div className="mt-2 grid gap-2 text-sm text-white/90">
            <div className="flex justify-between items-center">
              <div>How trading works</div>
              <div className="text-right text-xs opacity-80 max-w-[360px]">
                Trades happen on a bonding curve. The more you buy in a single order, the higher the average price.
                Slippage limits the worst-case price; your order reverts if price moves beyond it.
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>Allowed slippage</div>
              <div className="inline-flex items-center gap-2">
                {slippage.toFixed(2)}%
                <button 
                  className="border-0 bg-transparent cursor-pointer text-sm hover:opacity-80 transition-opacity"
                  onClick={() => setSlippage((s) => Math.min(50, Math.max(0, Number(prompt('Set slippage %', String(s)) || s))))}
                >
                  ⚙
                </button>
              </div>
            </div>
            {protocolDaoReward != null && (
              <div className="flex justify-between items-center">
                <div>Protocol token reward</div>
                <div>~{protocolDaoReward}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-2 mt-2.5">
        <WalletConnectBtn block />
        <button 
          className="px-4 py-3 rounded-full border-0 bg-gray-900 text-white transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black active:translate-y-px"
          onClick={submit} 
          disabled={disabled || loading}
        >
          {loading ? 'Confirm in wallet…' : 'Place Order'}
        </button>
      </div>

      {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}
    </div>
  );
}


