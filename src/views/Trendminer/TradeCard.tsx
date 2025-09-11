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
    <div className="max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
          Trade {token?.symbol}
        </h2>
        <button
          aria-label="open-settings"
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-xs font-medium hover:bg-[#4ecdc4] hover:-translate-y-0.5 active:translate-y-0"
          onClick={() => setShowDetails((v) => !v)}
        >
          ⚙️ {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button 
          className={`px-4 py-3 rounded-xl border font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isBuying 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent shadow-[0_4px_12px_rgba(34,197,94,0.3)] hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)] hover:-translate-y-0.5' 
              : 'bg-white/[0.05] border-white/10 text-white/90 hover:bg-white/[0.08] hover:border-white/20'
          }`} 
          onClick={() => setIsBuying(true)}
        >
          Buy
        </button>
        <button 
          className={`px-4 py-3 rounded-xl border font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            !isBuying 
              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.4)] hover:-translate-y-0.5' 
              : 'bg-white/[0.05] border-white/10 text-white/90 hover:bg-white/[0.08] hover:border-white/20'
          }`} 
          onClick={() => setIsBuying(false)}
        >
          Sell
        </button>
      </div>

      {/* Token Input From */}
      <div className="mb-2">
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/60 font-medium">From</span>
            <span className="text-xs text-white/40">{token?.symbol}</span>
          </div>
          <input 
            type="number" 
            min="0" 
            step="any" 
            value={tokenA} 
            onChange={(e) => onChangeA(e.target.value)} 
            onFocus={() => setFocused('A')} 
            placeholder="0.0"
            className="w-full bg-transparent text-white text-xl font-semibold outline-none placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Token Input To */}
      <div className="mb-5">
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/60 font-medium">To</span>
            <span className="text-xs text-white/40">AE</span>
          </div>
          <input 
            type="number" 
            min="0" 
            step="any" 
            value={tokenB} 
            onChange={(e) => onChangeB(e.target.value)} 
            onFocus={() => setFocused('B')} 
            placeholder="0.0"
            className="w-full bg-transparent text-white text-xl font-semibold outline-none placeholder:text-white/30"
          />
          <div className="text-xs text-white/40 mt-1">
            {isBuying ? 'AE to spend' : 'AE to receive'}
          </div>
        </div>
      </div>

      {/* Trading Info Panel */}
      {(averagePrice || priceImpact != null) && (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5 backdrop-blur-[10px]">
          {!!averagePrice && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/60">
                Avg. token price
              </span>
              <span className="text-sm font-semibold text-white">
                {averagePrice.toFixed(6)} AE
              </span>
            </div>
          )}
          {priceImpact != null && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">
                Price Impact
              </span>
              <span className={`text-sm font-semibold ${
                priceImpact > 10 ? 'text-red-400' :
                priceImpact > 5 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Details Section */}
      {showDetails && (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5 backdrop-blur-[10px]">
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-white/60 font-medium">How trading works</span>
              <div className="text-right text-xs text-white/40 max-w-[280px] ml-4">
                Trades happen on a bonding curve. The more you buy in a single order, the higher the average price.
                Slippage limits the worst-case price; your order reverts if price moves beyond it.
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-medium">Allowed slippage</span>
              <div className="inline-flex items-center gap-2">
                <span className="text-white font-semibold">{slippage.toFixed(2)}%</span>
                <button 
                  className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] transition-all duration-200 text-xs"
                  onClick={() => setSlippage((s) => Math.min(50, Math.max(0, Number(prompt('Set slippage %', String(s)) || s))))}
                >
                  ⚙️
                </button>
              </div>
            </div>
            {protocolDaoReward != null && (
              <div className="flex justify-between items-center">
                <span className="text-white/60 font-medium">Protocol token reward</span>
                <span className="text-white font-semibold">~{protocolDaoReward}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-400 text-sm py-3 px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-5 text-center">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid gap-3">
        <WalletConnectBtn block />
        <button 
          onClick={submit} 
          disabled={disabled || loading}
          className={`w-full py-4 px-6 rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            disabled || loading
              ? 'bg-white/10 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:shadow-[0_12px_35px_rgba(255,107,107,0.5)] hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Confirm in wallet…
            </div>
          ) : (
            `${isBuying ? 'Buy' : 'Sell'} ${token?.symbol}`
          )}
        </button>
      </div>
    </div>
  );
}


