import * as Dialog from '@radix-ui/react-dialog';
import { DexTokenDto } from '../../../api/generated';

interface LiquidityConfirmationProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenA: DexTokenDto | null;
  tokenB: DexTokenDto | null;
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
        <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.98)] text-standard-font-color border border-glass-border rounded-3xl p-6 w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[1001] outline-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="font-bold text-xl m-0 bg-primary-gradient bg-clip-text text-transparent">
              Confirm Add Liquidity
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="px-3 py-2 rounded-xl bg-white/5 border border-glass-border text-standard-font-color cursor-pointer text-base">
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Token Amounts */}
          <div className="bg-white/[0.05] border border-glass-border rounded-2xl p-5 mb-5">
            <div className="text-sm font-semibold text-light-font-color mb-4 text-center">
              You will deposit
            </div>
            
            <div className="grid gap-3">
              <div className="flex justify-between items-center px-4 py-3 bg-white/[0.03] rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-button-gradient flex items-center justify-center text-sm font-bold text-white">
                    {tokenA.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-base">
                      {tokenA.symbol}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg text-standard-font-color">
                  {Number(amountA).toFixed(6)}
                </div>
              </div>

              <div className="flex justify-between items-center px-4 py-3 bg-white/[0.03] rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-button-gradient flex items-center justify-center text-sm font-bold text-white">
                    {tokenB.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-base">
                      {tokenB.symbol}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg text-standard-font-color">
                  {Number(amountB).toFixed(6)}
                </div>
              </div>
            </div>
          </div>

          {/* Pool Info */}
          {pairPreview && (
            <div className="bg-white/[0.05] border border-glass-border rounded-2xl p-4 mb-5">
              <div className="text-sm font-semibold text-light-font-color mb-3">
                Pool Details
              </div>

              <div className="grid gap-2">
                {pairPreview.ratioAinB && pairPreview.ratioAinB !== '-' && (
                  <div className="flex justify-between text-xs text-light-font-color">
                    <span>Exchange Rate</span>
                    <span className="text-standard-font-color">
                      1 {tokenA.symbol} = {pairPreview.ratioAinB} {tokenB.symbol}
                    </span>
                  </div>
                )}

                {pairPreview.sharePct && Number(pairPreview.sharePct) > 0 && (
                  <div className="flex justify-between text-xs text-light-font-color">
                    <span>Your Pool Share</span>
                    <span className="text-accent-color font-semibold">
                      {Number(pairPreview.sharePct).toFixed(6)}%
                    </span>
                  </div>
                )}

                {pairPreview.lpMintEstimate && (
                  <div className="flex justify-between text-xs text-light-font-color">
                    <span>LP Tokens to Receive</span>
                    <span className="text-standard-font-color">
                      {Number(pairPreview.lpMintEstimate).toFixed(8)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-white/[0.03] rounded-xl p-4 mb-6">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between text-light-font-color">
                <span>Slippage Tolerance</span>
                <span className="text-standard-font-color">{slippagePct}%</span>
              </div>
              <div className="flex justify-between text-light-font-color">
                <span>Transaction Deadline</span>
                <span className="text-standard-font-color">{deadlineMins} minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-6 py-4 rounded-2xl border border-glass-border bg-white/5 text-standard-font-color text-base font-semibold transition-all duration-300 ${
                loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-[2] px-6 py-4 rounded-2xl border-none text-white text-base font-bold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 ${
                loading ? 'bg-white/10 cursor-not-allowed' : 'bg-button-gradient'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding Liquidity...
                </>
              ) : 'Confirm Add Liquidity'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
    </Dialog.Root>
  );
}
