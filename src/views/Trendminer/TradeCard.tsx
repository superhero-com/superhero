import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { initSdk, scanForWallets } from '../../store/slices/aeternitySlice';
import { AeSdk } from '@aeternity/aepp-sdk';
// Lazy import bctsl-sdk to avoid bundling issues if not present
let bctsl: any;
async function ensureBctsl() {
  if (!bctsl) {
    try {
      bctsl = await import('bctsl-sdk');
    } catch (e) {
      throw new Error('bctsl-sdk not available');
    }
  }
  return bctsl;
}
import WalletConnectBtn from '../../components/WalletConnectBtn';
import BigNumber from 'bignumber.js';
import { calculateBuyPriceWithAffiliationFee, calculateSellReturn, calculateTokensFromAE, calculateTokensToSellFromAE, toDecimals, toAe } from '../../utils/bondingCurve';
import './TradeCard.scss';

type Props = { token: any };

export default function TradeCard({ token }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [isBuying, setIsBuying] = useState(true);
  const [tokenA, setTokenA] = useState<number | ''>(''); // token amount
  const [tokenB, setTokenB] = useState<number | ''>(''); // ae amount
  const [focused, setFocused] = useState<'A'|'B'|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const [slippage, setSlippage] = useState<number>(1.0);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const disabled = useMemo(() => loading || (!tokenA && !tokenB), [loading, tokenA, tokenB]);

  function connect() {
    dispatch(initSdk());
    dispatch(scanForWallets());
    setSdkReady(true);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const sdk: any = (window as any).__aeSdk as AeSdk;
      if (!sdk) throw new Error('Wallet not connected');
      const { initAffiliationTokenGatingTokenSale } = await ensureBctsl();
      const saleAddress = token?.sale_address || token?.address;
      if (!saleAddress) throw new Error('Token sale address missing');
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
    <div className="trade-card">
      <div className="tabs">
        <button className={`tab ${isBuying ? 'active buy' : ''}`} onClick={() => setIsBuying(true)}>Buy</button>
        <button className={`tab ${!isBuying ? 'active sell' : ''}`} onClick={() => setIsBuying(false)}>Sell</button>
      </div>

      <div className="inputs">
        <label>
          <span className="label">{token?.symbol} amount</span>
          <input type="number" min="0" step="any" value={tokenA} onChange={(e) => onChangeA(e.target.value)} onFocus={() => setFocused('A')} placeholder="0.0" />
        </label>
        <label>
          <span className="label">{isBuying ? 'AE to spend' : 'AE to receive'}</span>
          <input type="number" min="0" step="any" value={tokenB} onChange={(e) => onChangeB(e.target.value)} onFocus={() => setFocused('B')} placeholder="0.0" />
        </label>
      </div>

      <div className="summary">
        {!!averagePrice && (
          <div className="row">
            <div>Avg. token price</div>
            <div>{averagePrice.toFixed(6)} AE</div>
          </div>
        )}
        {priceImpact != null && (
          <div className="row">
            <div>Price impact</div>
            <div className={`impact ${isBuying ? 'pos' : 'neg'}`}>{priceImpact.toFixed(2)}%</div>
          </div>
        )}
      </div>

      <div className="details">
        <button className="toggle" onClick={() => setShowDetails((v) => !v)}>{showDetails ? 'Hide details' : 'Show details'}</button>
        {showDetails && (
          <div className="panel">
            <div className="row">
              <div>How trading works</div>
              <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.8, maxWidth: 360 }}>
                Trades happen on a bonding curve. The more you buy in a single order, the higher the average price.
                Slippage limits the worst-case price; your order reverts if price moves beyond it.
              </div>
            </div>
            <div className="row">
              <div>Allowed slippage</div>
              <div className="slippage">
                {slippage.toFixed(2)}%
                <button className="gear" onClick={() => setSlippage((s) => Math.min(50, Math.max(0, Number(prompt('Set slippage %', String(s)) || s))))}>⚙</button>
              </div>
            </div>
            {protocolDaoReward != null && (
              <div className="row">
                <div>Protocol token reward</div>
                <div>~{protocolDaoReward}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="actions">
        <WalletConnectBtn block />
        <button className="submit" onClick={submit} disabled={disabled || loading}>{loading ? 'Confirm in wallet…' : 'Place Order'}</button>
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
}


