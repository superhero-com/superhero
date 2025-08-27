import React from 'react';
import { Token } from '../../../components/dex/types/dex';

interface LiquidityPreviewProps {
  preview: {
    ratioAinB?: string;
    ratioBinA?: string;
    sharePct?: string;
    lpMintEstimate?: string;
  };
  tokenA: Token | null;
  tokenB: Token | null;
  pairExists: boolean;
}

export default function LiquidityPreview({
  preview,
  tokenA,
  tokenB,
  pairExists
}: LiquidityPreviewProps) {
  if (!tokenA || !tokenB) return null;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--glass-border)',
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
        <span>Pool Preview</span>
        {!pairExists && (
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
    </div>
  );
}
