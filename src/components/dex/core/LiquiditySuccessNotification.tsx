import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { Decimal } from '@/libs/decimal';
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
        <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/[0.02] text-white border border-white/10 rounded-[24px] p-6 sm:p-8 w-[420px] max-w-[90vw] backdrop-blur-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] z-[1001] outline-none ${show ? 'animate-in slide-in-from-top-4 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]' : 'animate-out slide-out-to-bottom-4 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'}`}>
          {/* Success Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-4xl text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] animate-in zoom-in duration-600 ease-out">
              ✓
            </div>
          </div>

          {/* Title */}
          <Dialog.Title className="text-xl sm:text-2xl font-bold text-center m-0 mb-2 sh-dex-title">
            Liquidity Added Successfully!
          </Dialog.Title>

          {/* Subtitle */}
          <div className="text-sm text-white/60 text-center mb-6 opacity-90">
            Your liquidity has been added to the {tokenA.symbol}/{tokenB.symbol} pool
          </div>

          {/* Token Amounts Summary */}
          <div className="bg-white/[0.05] border border-white/10 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1161FE] flex items-center justify-center text-xs font-bold text-white">
                  {tokenA.symbol.charAt(0)}
                </div>
                <span className="font-semibold">{tokenA.symbol}</span>
              </div>
              <span className="font-bold text-[#1161FE]">
                {Decimal.from(amountA).prettify()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1161FE] flex items-center justify-center text-xs font-bold text-white">
                  {tokenB.symbol.charAt(0)}
                </div>
                <span className="font-semibold">{tokenB.symbol}</span>
              </div>
              <span className="font-bold text-[#1161FE]">
                {Decimal.from(amountB).prettify()}
              </span>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-[#1161FE]/10 border border-[#1161FE]/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-lg mt-0.5">
                ⏱️
              </div>
              <div>
                <div className="font-semibold text-sm text-white mb-1">
                  Position Update Pending
                </div>
                <div className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Your new position will appear in <strong>Active Positions</strong> within a few seconds, depending on network confirmation time.
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 px-5 py-3 rounded-full border border-white/10 bg-white/[0.02] text-white text-sm font-semibold text-center cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out hover:bg-[#00ff9d] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5"
              >
                View on Explorer
              </a>
            )}

            <button
              onClick={onClose}
              className={`${explorerUrl ? 'flex-1' : 'w-full'} px-5 py-3 rounded-full border-none bg-[#1161FE] text-white text-sm font-semibold cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0`}
            >
              Got it!
            </button>
          </div>

          {/* Auto-close progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-b-[24px] overflow-hidden">
            <div 
              className="h-full bg-[#1161FE] transition-all duration-75 ease-linear rounded-b-[24px]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>

    </Dialog.Root>
  );
}
