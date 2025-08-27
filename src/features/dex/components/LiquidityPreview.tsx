import React from 'react';
import { Token } from '../../../components/dex/types/dex';

interface LiquidityPreviewProps {
  preview: {
    ratioAinB?: string;
    ratioBinA?: string;
    sharePct?: string;
    lpMintEstimate?: string;
    suggestedAmountA?: string;
    suggestedAmountB?: string;
  };
  tokenA: Token | null;
  tokenB: Token | null;
  pairExists: boolean;
  hasError?: boolean;
  onSuggestedAmountA?: (amount: string) => void;
  onSuggestedAmountB?: (amount: string) => void;
}

export default function LiquidityPreview({
  preview,
  tokenA,
  tokenB,
  pairExists,
  hasError,
  onSuggestedAmountA,
  onSuggestedAmountB
}: LiquidityPreviewProps) {
  if (!tokenA || !tokenB) return null;

  return (
    <div style={{
      background: hasError ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      border: hasError ? '1px solid rgba(255, 107, 107, 0.3)' : '1px solid var(--glass-border)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--standard-font-color)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span>{hasError ? '⚠️ Ratio Warning' : 'Pool Preview'}</span>
        {!pairExists && !hasError && (
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'var(--accent-color)',
            color: 'white',
            fontWeight: 600
          }}>
            NEW POOL
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {preview.ratioAinB && preview.ratioAinB !== '-' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--light-font-color)'
          }}>
            <span>Rate</span>
            <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>
              1 {tokenA.symbol} = {preview.ratioAinB} {tokenB.symbol}
            </span>
          </div>
        )}

        {preview.ratioBinA && preview.ratioBinA !== '-' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--light-font-color)'
          }}>
            <span>Rate</span>
            <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>
              1 {tokenB.symbol} = {preview.ratioBinA} {tokenA.symbol}
            </span>
          </div>
        )}

        {preview.sharePct && Number(preview.sharePct) > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--light-font-color)'
          }}>
            <span>Pool Share</span>
            <span style={{ 
              fontWeight: 600, 
              color: 'var(--accent-color)'
            }}>
              {Number(preview.sharePct).toFixed(6)}%
            </span>
          </div>
        )}

        {preview.lpMintEstimate && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--light-font-color)'
          }}>
            <span>LP Tokens</span>
            <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>
              {Number(preview.lpMintEstimate).toFixed(8)}
            </span>
          </div>
        )}
      </div>

      {/* Suggested Amounts */}
      {(preview.suggestedAmountA || preview.suggestedAmountB) && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(78, 205, 196, 0.1)',
          border: '1px solid rgba(78, 205, 196, 0.3)',
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent-color)',
            marginBottom: 8
          }}>
            💡 Suggested Optimal Amounts
          </div>
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {preview.suggestedAmountB && onSuggestedAmountB && (
              <button
                onClick={() => onSuggestedAmountB(preview.suggestedAmountB!)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--accent-color)',
                  background: 'rgba(78, 205, 196, 0.2)',
                  color: 'var(--accent-color)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--accent-color)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(78, 205, 196, 0.2)';
                  e.currentTarget.style.color = 'var(--accent-color)';
                }}
              >
                Use {Number(preview.suggestedAmountB).toFixed(6)} {tokenB.symbol}
              </button>
            )}
            
            {preview.suggestedAmountA && onSuggestedAmountA && (
              <button
                onClick={() => onSuggestedAmountA(preview.suggestedAmountA!)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--accent-color)',
                  background: 'rgba(78, 205, 196, 0.2)',
                  color: 'var(--accent-color)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--accent-color)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(78, 205, 196, 0.2)';
                  e.currentTarget.style.color = 'var(--accent-color)';
                }}
              >
                Use {Number(preview.suggestedAmountA).toFixed(6)} {tokenA.symbol}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
