import * as Dialog from '@radix-ui/react-dialog';
import { DexTokenDto } from '../../../api/generated';
import { Decimal } from '@/libs/decimal';

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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[1000]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/[0.02] text-white border border-white/10 rounded-[24px] p-6 sm:p-8 w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto backdrop-blur-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] z-[1001] outline-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold m-0 sh-dex-title">
              Confirm Add Liquidity
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-base hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0">
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Token Amounts */}
          <div className="bg-white/[0.05] border border-white/10 rounded-xl p-5 mb-6">
            <div className="text-sm font-semibold text-white/60 mb-4 text-center">
              You will deposit
            </div>
            
            <div className="grid gap-3">
              <div className="flex justify-between items-center px-4 py-3 bg-white/[0.03] rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1161FE] flex items-center justify-center text-sm font-bold text-white">
                    {tokenA.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-base text-white">
                      {tokenA.symbol}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg text-[#1161FE]">
                  {Decimal.from(amountA).prettify()}
                </div>
              </div>

              <div className="flex justify-between items-center px-4 py-3 bg-white/[0.03] rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1161FE] flex items-center justify-center text-sm font-bold text-white">
                    {tokenB.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-base text-white">
                      {tokenB.symbol}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-lg text-[#1161FE]">
                  {Decimal.from(amountB).prettify()}
                </div>
              </div>
            </div>
          </div>

          {/* Pool Info */}
          {pairPreview && (
            <div className="bg-white/[0.05] border border-white/10 rounded-xl p-4 mb-6">
              <div className="text-sm font-semibold text-white/60 mb-3">
                Pool Details
              </div>

              <div className="grid gap-2">
                {pairPreview.ratioBinA && pairPreview.ratioBinA !== '-' && (
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Exchange Rate</span>
                    <span className="text-white">
                      1 {tokenA.symbol} = {Decimal.from(pairPreview.ratioBinA || '0').prettify()} {tokenB.symbol}
                    </span>
                  </div>
                )}

                {pairPreview.sharePct && Number(pairPreview.sharePct) > 0 && (
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Your Pool Share</span>
                    <span className="text-[#1161FE] font-semibold">
                      {Decimal.from(pairPreview.sharePct || '0').prettify()}%
                    </span>
                  </div>
                )}

                {pairPreview.lpMintEstimate && (
                  <div className="flex justify-between text-xs text-white/60">
                    <span>LP Tokens to Receive</span>
                    <span className="text-white">
                      {Decimal.from(pairPreview.lpMintEstimate || '0').prettify()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-6">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Slippage Tolerance</span>
                <span className="text-white">{slippagePct}%</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Transaction Deadline</span>
                <span className="text-white">{deadlineMins} minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-5 py-3 rounded-full border border-white/10 bg-white/[0.02] text-white text-sm font-semibold cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out ${
                loading ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-[2] px-5 py-3 rounded-full border-none text-white text-sm font-semibold cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center gap-2 ${
                loading 
                  ? 'bg-white/10 cursor-not-allowed opacity-60' 
                  : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Confirm in wallet…
                </>
              ) : 'Confirm Add Liquidity'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
    </Dialog.Root>
  );
}
