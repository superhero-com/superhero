import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { DexTokenDto } from '../../../api/generated';
import { CONFIG } from '../../../config';

interface LiquiditySuccessNotificationProps {
  show: boolean;
  onClose: () => void;
  tokenA: DexTokenDto | null;
  tokenB: DexTokenDto | null;
  amountA: string;
  amountB: string;
  txHash?: string;
}

export default function LiquiditySuccessNotification({
  show,
  onClose,
  tokenA,
  tokenB,
  amountA,
  amountB,
  txHash
}: LiquiditySuccessNotificationProps) {
  const [progress, setProgress] = useState(0);

  // Auto-close after 6 seconds with progress animation
  useEffect(() => {
    if (!show) {
      setProgress(0);
      return;
    }

    const duration = 10000; // 10 seconds
    // const duration = 6000; // 6 seconds
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(onClose, 100); // Small delay before closing
          return 100;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [show, onClose]);

  if (!tokenA || !tokenB) return null;

  const explorerUrl = txHash && CONFIG.EXPLORER_URL
    ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash}`
    : null;

  return (
    <Dialog.Root open={show} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 bg-black/60 backdrop-blur-lg z-[1000] ${show ? 'animate-in fade-in duration-300' : 'animate-out fade-out duration-300'}`} />
        <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.95)] text-white border border-white/10 rounded-3xl p-8 w-[420px] max-w-[90vw] backdrop-blur-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[1001] outline-none ${show ? 'animate-in slide-in-from-top-4 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]' : 'animate-out slide-out-to-bottom-4 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'}`}>
          {/* Success Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-4xl text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] animate-in zoom-in duration-600 ease-out">
              ✓
            </div>
          </div>

          {/* Title */}
          <Dialog.Title className="text-2xl font-bold text-center m-0 mb-2 sh-dex-title">
            Liquidity Added Successfully!
          </Dialog.Title>

          {/* Subtitle */}
          <div style={{
            fontSize: 14,
            color: 'var(--light-font-color)',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 1.5
          }}>
            Your liquidity has been added to the {tokenA.symbol}/{tokenB.symbol} pool
          </div>

          {/* Token Amounts Summary */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--button-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'white'
                }}>
                  {tokenA.symbol.charAt(0)}
                </div>
                <span style={{ fontWeight: 600 }}>{tokenA.symbol}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
                {Number(amountA).toFixed(6)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--button-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'white'
                }}>
                  {tokenB.symbol.charAt(0)}
                </div>
                <span style={{ fontWeight: 600 }}>{tokenB.symbol}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
                {Number(amountB).toFixed(6)}
              </span>
            </div>
          </div>

          {/* Important Notice */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <div style={{
                fontSize: 18,
                marginTop: 2
              }}>
                ⏱️
              </div>
              <div>
                <div style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--standard-font-color)',
                  marginBottom: 4
                }}>
                  Position Update Pending
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--light-font-color)',
                  lineHeight: 1.4
                }}>
                  Your new position will appear in <strong>Active Positions</strong> within a few seconds, depending on network confirmation time.
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  color: 'var(--standard-font-color)',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                View on Explorer
              </a>
            )}

            <button
              onClick={onClose}
              style={{
                flex: explorerUrl ? 1 : 2,
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--button-gradient)',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Got it!
            </button>
          </div>

          {/* Auto-close progress bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '0 0 24px 24px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'var(--accent-color)',
              width: `${progress}%`,
              transition: 'width 0.05s linear',
              borderRadius: '0 0 24px 24px'
            }} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>

    </Dialog.Root>
  );
}
