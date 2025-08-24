import React, { useState, useEffect, useMemo } from 'react';
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

import { useWallet, useDex } from '../../../hooks';
export default function SwapForm() {
  const address = useWallet().address;
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;

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
    console.log("call debouncedQuote::", params);
    debouncedQuote(params, handleQuoteResult);
  }, [isExactIn, amountIn, tokenIn, tokenOut]);
// }, [isExactIn, amountIn, tokenIn, tokenOut, debouncedQuote]);

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

  const handleTokenSwap = () => {
    const tempToken = tokenIn;
    const tempAmount = amountIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);
    setAmountIn(amountOut);
    setAmountOut(tempAmount);
  };

  const isSwapDisabled = swapLoading || !amountIn || Number(amountIn) <= 0 || !amountOut || !tokenIn || !tokenOut;

  return (
    <div className="genz-card" style={{ 
      maxWidth: 480,
      margin: '0 auto',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      borderRadius: 24,
      padding: 24,
      boxShadow: 'var(--glass-shadow)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{ 
          fontSize: 20, 
          fontWeight: 700, 
          color: 'var(--standard-font-color)',
          margin: 0,
          background: 'var(--primary-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Swap Tokens
        </h2>
        
        <button 
          aria-label="open-settings" 
          onClick={() => setShowSettings((v) => !v)} 
          style={{ 
            padding: '8px 12px', 
            borderRadius: 12, 
            border: '1px solid var(--glass-border)', 
            background: 'var(--glass-bg)', 
            color: 'var(--standard-font-color)',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            fontSize: 12,
            fontWeight: 500
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--accent-color)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--glass-bg)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⚙️ Settings
        </button>
      </div>

      <SwapSettings show={showSettings} onToggle={() => setShowSettings(!showSettings)} />

      {/* Token Input From */}
      <div style={{ marginBottom: 8 }}>
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
      </div>

      {/* Swap Arrow Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        margin: '16px 0',
        position: 'relative'
      }}>
        <button
          onClick={handleTokenSwap}
          disabled={swapLoading || !tokenIn || !tokenOut}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--button-gradient)',
            border: '2px solid var(--glass-border)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 600,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
            zIndex: 2,
            position: 'relative'
          }}
          onMouseOver={(e) => {
            if (!swapLoading && tokenIn && tokenOut) {
              e.currentTarget.style.transform = 'translateY(-2px) rotate(180deg)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 107, 0.4)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0) rotate(0deg)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
          }}
        >
          ↕️
        </button>
      </div>

      {/* Token Input To */}
      <div style={{ marginBottom: 20 }}>
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
      </div>

      {/* Trading Info Panel */}
      {(routeInfo.priceImpact != null || allowanceInfo) && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          backdropFilter: 'blur(10px)'
        }}>
          {routeInfo.priceImpact != null && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: allowanceInfo ? 8 : 0
            }}>
              <span style={{ fontSize: 14, color: 'var(--light-font-color)' }}>
                Price Impact
              </span>
              <span style={{ 
                fontSize: 14, 
                fontWeight: 600,
                color: routeInfo.priceImpact > 10 ? 'var(--error-color)' : 
                       routeInfo.priceImpact > 5 ? 'var(--warning-color)' : 
                       'var(--success-color)'
              }}>
                {routeInfo.priceImpact.toFixed(2)}%
              </span>
            </div>
          )}
          
          {allowanceInfo && !tokenIn?.isAe && (
            <div style={{ 
              fontSize: 12, 
              color: 'var(--light-font-color)',
              padding: '8px 12px',
              background: 'rgba(255, 107, 107, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(255, 107, 107, 0.2)'
            }}>
              {allowanceInfo}
            </div>
          )}
        </div>
      )}

      {/* Route Information */}
      <SwapRouteInfo 
        routeInfo={routeInfo}
        tokens={tokens}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
      />

      {/* Exact Output Toggle */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        border: '1px solid var(--glass-border)'
      }}>
        <label 
          htmlFor="dex-exact-out" 
          style={{ 
            fontSize: 14, 
            color: 'var(--light-font-color)',
            cursor: 'pointer',
            flex: 1
          }}
          title="Switch to exact output (max sold will be calculated)"
        >
          Exact Output Mode
        </label>
        <input 
          id="dex-exact-out" 
          type="checkbox" 
          checked={!isExactIn} 
          onChange={(e) => setIsExactIn(!e.target.checked)} 
          style={{
            width: 18,
            height: 18,
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          color: 'var(--error-color)', 
          fontSize: 14,
          padding: '12px 16px',
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid rgba(255, 107, 107, 0.2)',
          borderRadius: 12,
          marginBottom: 20,
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Swap Button */}
      {address ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isSwapDisabled}
          className="genz-btn"
          style={{ 
            width: '100%',
            padding: '16px 24px', 
            borderRadius: 16, 
            border: 'none',
            background: isSwapDisabled ? 
              'rgba(255, 255, 255, 0.1)' : 
              'var(--button-gradient)',
            color: 'white',
            cursor: isSwapDisabled ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isSwapDisabled ? 
              'none' : 
              'var(--button-shadow)',
            opacity: isSwapDisabled ? 0.6 : 1
          }}
        >
          {swapLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ 
                width: 16, 
                height: 16, 
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Confirm in wallet…
            </div>
          ) : 'Swap Tokens'}
        </button>
      ) : (
        <ConnectWalletButton 
          label="Connect Wallet to Swap"
          block
          style={{ 
            width: '100%',
            padding: '16px 24px', 
            borderRadius: 16, 
            border: 'none',
            background: 'var(--button-gradient)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: 'var(--button-shadow)',
            cursor: 'pointer'
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

      {/* Add keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
