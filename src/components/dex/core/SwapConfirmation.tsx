import * as Dialog from '@radix-ui/react-dialog';
import { DexTokenDto } from '../../../api/generated';
import { addSlippage, fromAettos, subSlippage, toAettos } from '../../../libs/dex';

interface SwapConfirmationProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
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
  if (!tokenIn || !tokenOut) return null;

  const minReceivedText = (() => {
    if (!isExactIn || !amountOut) return null;
    const min = fromAettos(subSlippage(toAettos(amountOut, tokenOut.decimals), slippagePct), tokenOut.decimals);
    return `${min} ${tokenOut.symbol}`;
  })();

  const maxSoldText = (() => {
    if (isExactIn || !amountIn) return null;
    const max = fromAettos(addSlippage(toAettos(amountIn, tokenIn.decimals), slippagePct), tokenIn.decimals);
    return `${max} ${tokenIn.symbol}`;
  })();

  const rate = Number(amountOut || 0) / Math.max(Number(amountIn || 0) || 1, 1);
  const inverseRate = Number(amountIn || 0) / Math.max(Number(amountOut || 0) || 1, 1);

  return (
    <Dialog.Root open={show} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.98)] text-white border border-white/10 rounded-3xl p-6 w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto backdrop-blur-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[1000] outline-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="font-bold text-xl m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
              Confirm Swap
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-white cursor-pointer text-base">
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Swap Details */}
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-5">
            <div className="text-sm font-semibold text-white/60 mb-4 text-center">
              You will swap
            </div>

            {/* Token In */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: 12
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
                  {tokenIn.symbol.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {tokenIn.symbol}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)'
                  }}>
                    From
                  </div>
                </div>
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--standard-font-color)'
              }}>
                {Number(amountIn).toFixed(6)}
              </div>
            </div>

            {/* Swap Arrow */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 12
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16
              }}>
                ↓
              </div>
            </div>

            {/* Token Out */}
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
                  {tokenOut.symbol.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {tokenOut.symbol}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)'
                  }}>
                    To
                  </div>
                </div>
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--success-color)'
              }}>
                {Number(amountOut).toFixed(6)}
              </div>
            </div>
          </div>

          {/* Swap Details */}
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
              Swap Details
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--light-font-color)'
              }}>
                <span>Exchange Rate</span>
                <span style={{ color: 'var(--standard-font-color)' }}>
                  1 {tokenIn.symbol} = {rate.toFixed(6)} {tokenOut.symbol}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: 'var(--light-font-color)'
              }}>
                <span>Inverse Rate</span>
                <span style={{ color: 'var(--standard-font-color)' }}>
                  1 {tokenOut.symbol} = {inverseRate.toFixed(6)} {tokenIn.symbol}
                </span>
              </div>

              {priceImpactPct != null && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--light-font-color)'
                }}>
                  <span>Price Impact</span>
                  <span style={{
                    color: priceImpactPct > 10 ? 'var(--error-color)' :
                      priceImpactPct > 5 ? '#ffb86b' : 'var(--success-color)',
                    fontWeight: 600
                  }}>
                    {priceImpactPct.toFixed(2)}%
                  </span>
                </div>
              )}

              {isExactIn && minReceivedText && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--light-font-color)'
                }}>
                  <span>Minimum Received</span>
                  <span style={{ color: 'var(--standard-font-color)' }}>
                    {minReceivedText}
                  </span>
                </div>
              )}

              {!isExactIn && maxSoldText && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--light-font-color)'
                }}>
                  <span>Maximum Sold</span>
                  <span style={{ color: 'var(--standard-font-color)' }}>
                    {maxSoldText}
                  </span>
                </div>
              )}

              {path.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--light-font-color)',
                  alignItems: 'flex-start'
                }}>
                  <span>Route</span>
                  <span style={{
                    color: 'var(--standard-font-color)',
                    textAlign: 'right',
                    maxWidth: '60%',
                    wordBreak: 'break-all'
                  }}>
                    {path.map((p, i) => (i > 0 ? ' → ' : '') + p).join('')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* High Price Impact Warning */}
          {priceImpactPct != null && priceImpactPct > 10 && (
            <div style={{
              color: 'var(--error-color)',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid var(--error-color)',
              borderRadius: 12,
              padding: 16,
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{ fontSize: 18 }}>⚠️</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>High Price Impact</div>
                <div style={{ opacity: 0.9 }}>
                  This swap has a high price impact. Consider reducing the amount or choosing a different route.
                </div>
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
                  Swapping...
                </>
              ) : 'Confirm Swap'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

    </Dialog.Root>
  );
}
