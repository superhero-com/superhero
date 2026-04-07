/* eslint-disable */
import * as Dialog from '@radix-ui/react-dialog';
import { DexTokenDto } from '../../../api/generated';
import {
  addSlippage, fromAettos, subSlippage, toAettos,
} from '../../../libs/dex';
import Spinner from '../../Spinner';
import { Decimal } from '@/libs/decimal';
import { RouteInfo } from '../types/dex';
import SwapRouteInfo from './SwapRouteInfo';

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
  routeInfo: RouteInfo;
  tokens: DexTokenDto[];
  loading?: boolean;
  swapStep?: { current: number; total: number; label: string } | null;
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
  routeInfo,
  tokens,
  loading = false,
  swapStep = null,
}: SwapConfirmationProps) {
  if (!tokenIn || !tokenOut) return null;

  const minReceivedText = (() => {
    if (!isExactIn || !amountOut) return null;
    const min = fromAettos(subSlippage(toAettos(amountOut, tokenOut.decimals), slippagePct), tokenOut.decimals);
    return `${Decimal.from(min).prettify()} ${tokenOut.symbol}`;
  })();

  const maxSoldText = (() => {
    if (isExactIn || !amountIn) return null;
    const max = fromAettos(addSlippage(toAettos(amountIn, tokenIn.decimals), slippagePct), tokenIn.decimals);
    return `${Decimal.from(max).prettify()} ${tokenIn.symbol}`;
  })();

  const rate = Number(amountOut || 0) / Math.max(Number(amountIn || 0) || 1, 1);
  const inverseRate = Number(amountIn || 0) / Math.max(Number(amountOut || 0) || 1, 1);

  return (
    <Dialog.Root open={show} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.98)] text-white border border-white/10 rounded-2xl p-4 w-[420px] max-w-[90vw] max-h-[85vh] overflow-y-auto backdrop-blur-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[1000] outline-none">

          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <Dialog.Title className="font-bold text-base m-0">
              Confirm Swap
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white cursor-pointer text-sm leading-none">
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Inline token swap row */}
          <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 shrink-0 rounded-full bg-[#1161FE] flex items-center justify-center text-xs font-bold">
                {tokenIn.symbol.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{Decimal.from(amountIn).prettify()}</div>
                <div className="text-xs text-white/50">{tokenIn.symbol}</div>
              </div>
            </div>
            <div className="text-white/30 text-sm shrink-0">→</div>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="font-bold text-sm text-green-400 truncate">{Decimal.from(amountOut).prettify()}</div>
                <div className="text-xs text-white/50">{tokenOut.symbol}</div>
              </div>
              <div className="w-7 h-7 shrink-0 rounded-full bg-[#1161FE] flex items-center justify-center text-xs font-bold">
                {tokenOut.symbol.charAt(0)}
              </div>
            </div>
          </div>

          {/* Details + Settings combined */}
          <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 mb-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between text-white/60">
              <span>Rate</span>
              <span className="text-white">1 {tokenIn.symbol} = {Decimal.from(rate).prettify()} {tokenOut.symbol}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Inverse</span>
              <span className="text-white">1 {tokenOut.symbol} = {Decimal.from(inverseRate).prettify()} {tokenIn.symbol}</span>
            </div>
            {priceImpactPct != null && (
              <div className="flex justify-between text-white/60">
                <span>Price Impact</span>
                <span className={`font-semibold ${priceImpactPct > 10 ? 'text-red-400' : priceImpactPct > 5 ? 'text-[#ffb86b]' : 'text-green-400'}`}>
                  {Decimal.from(priceImpactPct).prettify()}%
                </span>
              </div>
            )}
            {isExactIn && minReceivedText && (
              <div className="flex justify-between text-white/60">
                <span>Min Received</span>
                <span className="text-white">{minReceivedText}</span>
              </div>
            )}
            {!isExactIn && maxSoldText && (
              <div className="flex justify-between text-white/60">
                <span>Max Sold</span>
                <span className="text-white">{maxSoldText}</span>
              </div>
            )}
            <div className="flex justify-between text-white/60">
              <span>Slippage</span>
              <span className="text-white">{slippagePct}%</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Deadline</span>
              <span className="text-white">{deadlineMins} min</span>
            </div>
            <SwapRouteInfo
              routeInfo={routeInfo}
              tokens={tokens}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
            />
          </div>

          {/* High Price Impact Warning */}
          {priceImpactPct != null && priceImpactPct > 10 && (
            <div className="text-red-400 text-[12px] bg-red-400/10 border border-red-400/20 rounded-xl p-3 mb-3 flex items-start gap-2">
              <span className="shrink-0">⚠️</span>
              <span className="opacity-90">High price impact. Consider reducing the amount or choosing a different route.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm font-semibold transition-all duration-200 ${
                loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/[0.08]'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-[2] px-4 py-2.5 rounded-xl border-none text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-white/10 cursor-not-allowed'
                  : 'bg-[#1161FE] shadow-[0_6px_20px_rgba(17,97,254,0.35)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  {swapStep ? `${swapStep.label}... (${swapStep.current}/${swapStep.total})` : 'Swapping...'}
                </>
              ) : 'Confirm on Wallet'}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
