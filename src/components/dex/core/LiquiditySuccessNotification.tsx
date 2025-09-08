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
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            animation: show ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-out'
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 28, 0.95)',
            color: 'var(--standard-font-color)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24,
            padding: 32,
            width: 420,
            maxWidth: '90vw',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
            zIndex: 1001,
            outline: 'none',
            animation: show ? 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Success Icon */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 20
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--success-gradient, linear-gradient(135deg, #10b981, #059669))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              color: 'white',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
              animation: 'successPulse 0.6s ease-out'
            }}>
              ✓
            </div>
          </div>

          {/* Title */}
          <Dialog.Title style={{
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 8px 0',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
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

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        
        @keyframes slideDown {
          from { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
          to { 
            opacity: 0;
            transform: translate(-50%, -60%);
          }
        }
        
        @keyframes successPulse {
          0% { 
            transform: scale(0.8);
            opacity: 0;
          }
          50% { 
            transform: scale(1.1);
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Dialog.Root>
  );
}
