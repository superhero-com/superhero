import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Token } from '../../../components/dex/types/dex';

interface LiquidityConfirmationProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenA: Token | null;
  tokenB: Token | null;
  amountA: string;
  amountB: string;
  slippagePct: number;
  deadlineMins: number;
  pairPreview: {
    ratioAinB?: string;
    ratioBinA?: string;
    sharePct?: string;
    lpMintEstimate?: string;
  } | null;
  loading: boolean;
}

export default function LiquidityConfirmation({
  show,
  onClose,
  onConfirm,
  tokenA,
  tokenB,
  amountA,
  amountB,
  slippagePct,
  deadlineMins,
  pairPreview,
  loading
}: LiquidityConfirmationProps) {
  if (!tokenA || !tokenB) return null;

  return (
    <Dialog.Root open={show} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(12px)',
            zIndex: 1000
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 28, 0.98)',
            color: 'var(--standard-font-color)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24,
            padding: 24,
            width: 480,
            maxWidth: '90vw',
            maxHeight: '85vh',
            overflowY: 'auto',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
            zIndex: 1001,
            outline: 'none'
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 24
          }}>
            <Dialog.Title style={{ 
              fontWeight: 700, 
              fontSize: 20,
              margin: 0,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Confirm Add Liquidity
            </Dialog.Title>
            <Dialog.Close asChild>
              <button 
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--standard-font-color)',
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Token Amounts */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}>
            <div style={{ 
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--light-font-color)',
              marginBottom: 16,
              textAlign: 'center'
            }}>
              You will deposit
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--button-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white'
                  }}>
                    {tokenA.symbol.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {tokenA.symbol}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--standard-font-color)'
                }}>
                  {Number(amountA).toFixed(6)}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--button-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white'
                  }}>
                    {tokenB.symbol.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {tokenB.symbol}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--standard-font-color)'
                }}>
                  {Number(amountB).toFixed(6)}
                </div>
              </div>
            </div>
          </div>

          {/* Pool Info */}
          {pairPreview && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--light-font-color)',
                marginBottom: 12
              }}>
                Pool Details
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {pairPreview.ratioAinB && pairPreview.ratioAinB !== '-' && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: 'var(--light-font-color)'
                  }}>
                    <span>Exchange Rate</span>
                    <span style={{ color: 'var(--standard-font-color)' }}>
                      1 {tokenA.symbol} = {pairPreview.ratioAinB} {tokenB.symbol}
                    </span>
                  </div>
                )}

                {pairPreview.sharePct && Number(pairPreview.sharePct) > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: 'var(--light-font-color)'
                  }}>
                    <span>Your Pool Share</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                      {Number(pairPreview.sharePct).toFixed(6)}%
                    </span>
                  </div>
                )}

                {pairPreview.lpMintEstimate && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: 'var(--light-font-color)'
                  }}>
                    <span>LP Tokens to Receive</span>
                    <span style={{ color: 'var(--standard-font-color)' }}>
                      {Number(pairPreview.lpMintEstimate).toFixed(8)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--light-font-color)'
              }}>
                <span>Slippage Tolerance</span>
                <span style={{ color: 'var(--standard-font-color)' }}>{slippagePct}%</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--light-font-color)'
              }}>
                <span>Transaction Deadline</span>
                <span style={{ color: 'var(--standard-font-color)' }}>{deadlineMins} minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '16px 24px',
                borderRadius: 16,
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--standard-font-color)',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 2,
                padding: '16px 24px',
                borderRadius: 16,
                border: 'none',
                background: loading ? 
                  'rgba(255, 255, 255, 0.1)' : 
                  'var(--button-gradient)',
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Adding Liquidity...
                </>
              ) : 'Confirm Add Liquidity'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Add keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Dialog.Root>
  );
}
