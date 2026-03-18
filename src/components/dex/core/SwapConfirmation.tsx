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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.98)] text-white border border-white/10 rounded-3xl p-6 w-[480px] max-w-[90vw] max-h-[85vh] overflow-y-auto backdrop-blur-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[1000] outline-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="font-bold text-xl m-0 sh-dex-title">
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
            <div className="flex justify-between items-center py-3 px-4 bg-white/[0.03] rounded-xl border border-white/10 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1161FE] flex items-center justify-center text-sm font-bold text-white">
                  {tokenIn.symbol.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-base">
                    {tokenIn.symbol}
                  </div>
                  <div className="text-xs text-white/60">
                    From
                  </div>
                </div>
              </div>
              <div className="font-bold text-lg text-white">
                {Decimal.from(amountIn).prettify()}
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-base">
                ↓
              </div>
            </div>

            {/* Token Out */}
            <div className="flex justify-between items-center py-3 px-4 bg-white/[0.03] rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1161FE] flex items-center justify-center text-sm font-bold text-white">
                  {tokenOut.symbol.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-base">
                    {tokenOut.symbol}
                  </div>
                  <div className="text-xs text-white/60">
                    To
                  </div>
                </div>
              </div>
              <div className="font-bold text-lg text-green-400">
                {Decimal.from(amountOut).prettify()}
              </div>
            </div>
          </div>

          {/* Swap Details */}
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5">
            <div className="text-sm font-semibold text-white/60 mb-3">
              Swap Details
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between text-[13px] text-white/60">
                <span>Exchange Rate</span>
                <span className="text-white">
                  1
                  {' '}
                  {tokenIn.symbol}
                  {' '}
                  =
                  {' '}
                  {Decimal.from(rate).prettify()}
                  {' '}
                  {tokenOut.symbol}
                </span>
              </div>

              <div className="flex justify-between text-[13px] text-white/60">
                <span>Inverse Rate</span>
                <span className="text-white">
                  1
                  {' '}
                  {tokenOut.symbol}
                  {' '}
                  =
                  {' '}
                  {Decimal.from(inverseRate).prettify()}
                  {' '}
                  {tokenIn.symbol}
                </span>
              </div>

              {priceImpactPct != null && (
                <div className="flex justify-between text-[13px] text-white/60">
                  <span>Price Impact</span>
                  <span className={`font-semibold ${
                    priceImpactPct > 10 ? 'text-red-400'
                      : priceImpactPct > 5 ? 'text-[#ffb86b]' : 'text-green-400'
                  }`}
                  >
                    {Decimal.from(priceImpactPct).prettify()}
                    %
                  </span>
                </div>
              )}

              {isExactIn && minReceivedText && (
                <div className="flex justify-between text-[13px] text-white/60">
                  <span>Minimum Received</span>
                  <span className="text-white">
                    {minReceivedText}
                  </span>
                </div>
              )}

              {!isExactIn && maxSoldText && (
                <div className="flex justify-between text-[13px] text-white/60">
                  <span>Maximum Sold</span>
                  <span className="text-white">
                    {maxSoldText}
                  </span>
                </div>
              )}

              <SwapRouteInfo
                routeInfo={routeInfo}
                tokens={tokens}
                tokenIn={tokenIn}
                tokenOut={tokenOut}
              />
            </div>
          </div>

          {/* High Price Impact Warning */}
          {priceImpactPct != null && priceImpactPct > 10 && (
            <div className="text-red-400 text-[13px] bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-5 flex items-center gap-3">
              <div className="text-lg">⚠️</div>
              <div>
                <div className="font-semibold mb-1">High Price Impact</div>
                <div className="opacity-90">
                  This swap has a high price impact. Consider reducing the amount or choosing a different route.
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-white/[0.03] rounded-xl p-4 mb-6">
            <div className="grid gap-2 text-[13px]">
              <div className="flex justify-between text-white/60">
                <span>Slippage Tolerance</span>
                <span className="text-white">
                  {slippagePct}
                  %
                </span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Transaction Deadline</span>
                <span className="text-white">
                  {deadlineMins}
                  {' '}
                  minutes
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid gap-2.5">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`w-full px-6 py-4 rounded-2xl border-none text-white text-base font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-white/10 cursor-not-allowed'
                  : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {loading ? (
                <>
                  <Spinner className="w-5 h-5" />
                  {swapStep ? (
                    <>
                      {swapStep.label}
                      ... (
                      {swapStep.current}
                      /
                      {swapStep.total}
                      )
                    </>
                  ) : (
                    'Swapping...'
                  )}
                </>
              ) : 'Confirm on Wallet'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className={`w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.05] text-white text-base font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/[0.08]'
              }`}
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

    </Dialog.Root>
  );
}
