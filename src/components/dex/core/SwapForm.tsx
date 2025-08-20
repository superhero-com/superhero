import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import ConnectWalletButton from '../../ConnectWalletButton';
import TokenInput from './TokenInput';
import SwapSettings from './SwapSettings';
import SwapRouteInfo from './SwapRouteInfo';
import SwapConfirmation from './SwapConfirmation';
import { useTokenList } from '../hooks/useTokenList';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useSwapQuote } from '../hooks/useSwapQuote';
import { useSwapExecution } from '../hooks/useSwapExecution';
import { DEX_ADDRESSES } from '../../../libs/dex';
import { Token, SwapQuoteParams } from '../types/dex';

export default function SwapForm() {
  const address = useSelector((s: RootState) => s.root.address);
  const slippagePct = useSelector((s: RootState) => s.dex.slippagePct);
  const deadlineMins = useSelector((s: RootState) => s.dex.deadlineMins);

  // Token list and balances
  const { tokens, loading: tokensLoading } = useTokenList();
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const { balances } = useTokenBalances(tokenIn, tokenOut);

  // Amounts and swap state
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [isExactIn, setIsExactIn] = useState<boolean>(true);
  const [searchIn, setSearchIn] = useState('');
  const [searchOut, setSearchOut] = useState('');

  // Quote and execution
  const { quoteLoading, error, routeInfo, debouncedQuote } = useSwapQuote();
  const { loading: swapLoading, allowanceInfo, executeSwap } = useSwapExecution();

  const handleQuoteResult = (result: { amountOut?: string; amountIn?: string; path: string[]; priceImpact?: number }) => {
    if (result.amountOut && isExactIn) {
      setAmountOut(result.amountOut);
    }
    if (result.amountIn && !isExactIn) {
      setAmountIn(result.amountIn);
    }
  };

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize default tokens
  useEffect(() => {
    if (!tokenIn && tokens.length) setTokenIn(tokens[0]);
    if (!tokenOut && tokens.length) setTokenOut(tokens[1] || null);
  }, [tokens, tokenIn, tokenOut]);

  // Quote for exact-in mode when amountIn or tokens change
  useEffect(() => {
    if (!isExactIn) return;
    const params: SwapQuoteParams = {
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      isExactIn
    };
    debouncedQuote(params, handleQuoteResult);
  }, [isExactIn, amountIn, tokenIn, tokenOut, debouncedQuote]);

  // Quote for exact-out mode when amountOut or tokens change
  useEffect(() => {
    if (isExactIn) return;
    const params: SwapQuoteParams = {
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      isExactIn
    };
    debouncedQuote(params, handleQuoteResult);
  }, [isExactIn, amountOut, tokenIn, tokenOut, debouncedQuote]);

  // Handle quote results
  useEffect(() => {
    if (routeInfo.path.length > 0 && isExactIn && amountIn) {
      // The quote hook should handle updating amountOut
      // This effect can be used for additional side effects if needed
    }
  }, [routeInfo, isExactIn, amountIn]);

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !amountOut) return;
    
    try {
      const txHash = await executeSwap({
        amountIn,
        amountOut,
        tokenIn,
        tokenOut,
        path: routeInfo.path,
        slippagePct,
        deadlineMins,
        isExactIn
      });
      
      if (txHash) {
        setAmountIn('');
        setAmountOut('');
        setShowConfirm(false);
      }
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const filteredInTokens = useMemo(() => {
    const term = searchIn.trim().toLowerCase();
    const matches = (t: Token) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.contractId || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.isAe);
    const wae = tokens.find((t) => t.contractId === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: Token[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchIn]);

  const filteredOutTokens = useMemo(() => {
    const term = searchOut.trim().toLowerCase();
    const matches = (t: Token) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.contractId || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.isAe);
    const wae = tokens.find((t) => t.contractId === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: Token[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchOut]);

  return (
    <div style={{ display: 'grid', gap: 10, border: '1px solid #3a3a4a', padding: 12, borderRadius: 12, background: '#14141c' }}>
      {/* Token Inputs */}
      <TokenInput
        label="From"
        token={tokenIn}
        amount={amountIn}
        balance={balances.in}
        onTokenChange={setTokenIn}
        onAmountChange={setAmountIn}
        tokens={filteredInTokens}
        excludeTokens={tokenOut ? [tokenOut] : []}
        disabled={swapLoading}
        loading={tokensLoading}
        searchValue={searchIn}
        onSearchChange={setSearchIn}
      />

      <div style={{ textAlign: 'center', opacity: 0.8 }}>↓</div>

      <TokenInput
        label="To"
        token={tokenOut}
        amount={quoteLoading ? 'Quoting…' : amountOut}
        balance={balances.out}
        onTokenChange={setTokenOut}
        onAmountChange={(amount) => {
          setIsExactIn(false);
          setAmountOut(amount);
        }}
        tokens={filteredOutTokens}
        excludeTokens={tokenIn ? [tokenIn] : []}
        disabled={swapLoading}
        loading={tokensLoading}
        readOnly={isExactIn}
        searchValue={searchOut}
        onSearchChange={setSearchOut}
      />

      {/* Exact Output Toggle */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, opacity: 0.85 }}>
        <label htmlFor="dex-exact-out" title="Switch to exact output (max sold will be calculated)">
          Exact output
        </label>
        <input 
          id="dex-exact-out" 
          type="checkbox" 
          checked={!isExactIn} 
          onChange={(e) => setIsExactIn(!e.target.checked)} 
        />
      </div>

      {/* Price Impact and Settings */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, opacity: 0.8, alignItems: 'center' }}>
          {routeInfo.priceImpact != null && (
            <div>Price impact: {routeInfo.priceImpact.toFixed(2)}%</div>
          )}
        </div>
        <button 
          aria-label="open-settings" 
          onClick={() => setShowSettings((v) => !v)} 
          style={{ 
            padding: '6px 10px', 
            borderRadius: 8, 
            border: '1px solid #3a3a4a', 
            background: '#2a2a39', 
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Settings
        </button>
      </div>

      <SwapSettings show={showSettings} onToggle={() => setShowSettings(!showSettings)} />

      {/* Route Information */}
      <SwapRouteInfo 
        routeInfo={routeInfo}
        tokens={tokens}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
      />

      {/* Allowance Info */}
      {allowanceInfo && !tokenIn?.isAe && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>{allowanceInfo}</div>
      )}

      {/* Error Display */}
      {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}

      {/* Swap Button */}
      {address ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={swapLoading || !amountIn || Number(amountIn) <= 0 || !amountOut || !tokenIn || !tokenOut}
          style={{ 
            padding: '10px 12px', 
            borderRadius: 10, 
            border: '1px solid #3a3a4a', 
            background: '#2a2a39', 
            color: 'white',
            cursor: swapLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {swapLoading ? 'Confirm in wallet…' : 'Swap'}
        </button>
      ) : (
        <ConnectWalletButton 
          label="Connect Wallet & Swap"
          block
          style={{ 
            padding: '10px 12px', 
            borderRadius: 10, 
            border: '1px solid #3a3a4a', 
            background: '#2a2a39', 
            color: 'white' 
          }}
        />
      )}

      {/* Confirmation Modal */}
      <SwapConfirmation
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSwap}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        amountOut={amountOut}
        isExactIn={isExactIn}
        slippagePct={slippagePct}
        deadlineMins={deadlineMins}
        priceImpactPct={routeInfo.priceImpact || null}
        path={routeInfo.path}
        loading={swapLoading}
      />
    </div>
  );
}
