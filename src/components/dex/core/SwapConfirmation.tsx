import React from 'react';
import { Token } from '../types/dex';
import { fromAettos, toAettos, subSlippage, addSlippage } from '../../../libs/dex';

interface SwapConfirmationProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: string;
  amountOut: string;
  isExactIn: boolean;
  slippagePct: number;
  deadlineMins: number;
  priceImpactPct: number | null;
  path: string[];
  loading?: boolean;
}

export default function SwapConfirmation({
  show,
  onClose,
  onConfirm,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  isExactIn,
  slippagePct,
  deadlineMins,
  priceImpactPct,
  path,
  loading = false
}: SwapConfirmationProps) {
  if (!show) return null;

  const minReceivedText = (() => {
    if (!isExactIn || !tokenOut || !amountOut) return null;
    const min = fromAettos(subSlippage(toAettos(amountOut, tokenOut.decimals), slippagePct), tokenOut.decimals);
    return `${min} ${tokenOut.symbol}`;
  })();

  const maxSoldText = (() => {
    if (isExactIn || !tokenIn || !amountIn) return null;
    const max = fromAettos(addSlippage(toAettos(amountIn, tokenIn.decimals), slippagePct), tokenIn.decimals);
    return `${max} ${tokenIn.symbol}`;
  })();

  const rate = Number(amountOut || 0) / Math.max(Number(amountIn || 0) || 1, 1);

  return (
    <div 
      role="dialog" 
      aria-label="confirm-swap" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.6)', 
        display: 'grid', 
        placeItems: 'center',
        zIndex: 1000
      }}
    >
      <div style={{ 
        background: '#14141c', 
        color: 'white', 
        border: '1px solid #3a3a4a', 
        borderRadius: 10, 
        padding: 16, 
        width: 420 
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirm Swap</div>
        
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
          {amountIn || '0'} {tokenIn?.symbol} → {amountOut || '0'} {tokenOut?.symbol}
        </div>
        
        <div style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.85, marginBottom: 12 }}>
          <div>Slippage: {slippagePct}%</div>
          <div>Rate: 1 {tokenIn?.symbol} ≈ {rate.toFixed(6)} {tokenOut?.symbol}</div>
          
          {priceImpactPct != null && (
            <div style={{ 
              color: priceImpactPct > 10 ? '#ff6b6b' : priceImpactPct > 5 ? '#ffb86b' : 'inherit' 
            }}>
              Price impact: {priceImpactPct.toFixed(2)}%
            </div>
          )}
          
          {isExactIn && minReceivedText && (
            <div>Minimum received: {minReceivedText}</div>
          )}
          
          {!isExactIn && maxSoldText && (
            <div>Maximum sold: {maxSoldText}</div>
          )}
          
          <div>Deadline: {deadlineMins} min</div>
          
          {!!path.length && (
            <div>Route: {path.map((p, i) => (i > 0 ? ' → ' : '') + p).join('')}</div>
          )}
        </div>
        
        {priceImpactPct != null && priceImpactPct > 10 && (
          <div style={{ 
            color: '#ff6b6b', 
            background: 'rgba(255,107,107,0.12)', 
            border: '1px solid #ff6b6b55', 
            padding: 8, 
            borderRadius: 6, 
            fontSize: 12, 
            marginBottom: 12 
          }}>
            High price impact. Consider reducing amount or choosing a different route.
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={onClose} 
            disabled={loading}
            style={{ 
              padding: '8px 10px', 
              borderRadius: 8,
              background: '#2a2a39',
              border: '1px solid #3a3a4a',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            disabled={loading}
            style={{ 
              padding: '8px 10px', 
              borderRadius: 8, 
              flex: 1,
              background: loading ? '#1a1a23' : '#4caf50',
              border: '1px solid #3a3a4a',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
