import { useMemo } from 'react';
import { DexTokenDto } from '../../../api/generated';
import { useDex } from '../../../hooks';
import {
  DEX_ADDRESSES, fromAettos, subSlippage, toAettos,
} from '../../../libs/dex';
import { Decimal } from '../../../libs/decimal';
import { RouteInfo } from '../types/dex';
import { TokenChip } from '../../TokenChip';
import SwapRouteInfo from './SwapRouteInfo';

interface SwapInfoDisplayProps {
    tokenIn: DexTokenDto | null;
    tokenOut: DexTokenDto | null;
    amountIn: string;
    amountOut: string;
    routeInfo: RouteInfo;
    tokens: DexTokenDto[];
    isExactIn: boolean;
}

export default function SwapInfoDisplay({
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  routeInfo,
  tokens,
  isExactIn,
}: SwapInfoDisplayProps) {
  const { slippagePct } = useDex();

  // Calculate minimum received amount
  const minimumReceived = useMemo(() => {
    if (!isExactIn || !amountOut || !tokenOut || Number(amountOut) <= 0) return null;

    try {
      const amountOutAettos = toAettos(amountOut, tokenOut.decimals);
      const minReceivedAettos = subSlippage(amountOutAettos, slippagePct);
      const minReceived = fromAettos(minReceivedAettos, tokenOut.decimals);
      return Decimal.from(minReceived).prettify(6);
    } catch {
      return null;
    }
  }, [amountOut, tokenOut, slippagePct, isExactIn]);

  // Format price impact
  const formattedPriceImpact = useMemo(() => {
    if (routeInfo.priceImpact == null) return null;

    if (routeInfo.priceImpact < 0.01) {
      return '<0.01%';
    }

    return `${routeInfo.priceImpact.toFixed(2)}%`;
  }, [routeInfo.priceImpact]);

  // Get token label for display
  const getTokenLabel = (address: string): string => {
    if (address === 'AE') return 'AE';
    if (address === DEX_ADDRESSES.wae) return 'WAE';

    const token = tokens.find((t) => t.address === address);
    return token?.symbol || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Don't show if we don't have the basic required data or if there's no meaningful output
  if (!tokenIn || !tokenOut || !amountIn || Number(amountIn) <= 0 || !amountOut || Number(amountOut) <= 0) {
    return null;
  }

  return (
    <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5 backdrop-blur-[10px] space-y-3">
      {/* Exchange Rate Display */}
      <div className="flex items-center justify-center gap-2 text-center py-2">
        <span className="text-xl font-bold text-white">
          {Decimal.from(amountIn).prettify(6)}
        </span>
        <span className="text-sm text-white/80 font-semibold">
          {tokenIn.symbol}
        </span>
        <span className="text-white/60 mx-2">≈</span>
        <span className="text-xl font-bold text-white">
          {Decimal.from(amountOut).prettify(6)}
        </span>
        <span className="text-sm text-white/80 font-semibold">
          {tokenOut.symbol}
        </span>
      </div>

      {/* Info Grid */}
      <div className="space-y-3">
        {/* Minimum Received */}
        {minimumReceived && (
        <div className="flex justify-between items-center py-1">
          <span className="text-sm text-white/70 font-medium">
            Minimum Received
          </span>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">
              {minimumReceived}
            </div>
            <div className="text-xs text-white/60">
              {tokenOut.symbol}
            </div>
          </div>
        </div>
        )}

        {/* Price Impact */}
        {formattedPriceImpact && (
        <div className="flex justify-between items-center py-1">
          <span className="text-sm text-white/70 font-medium">
            Price Impact
          </span>
          <span className={`text-sm font-semibold ${routeInfo.priceImpact && routeInfo.priceImpact > 10 ? 'text-red-400'
            : routeInfo.priceImpact && routeInfo.priceImpact > 5 ? 'text-yellow-400'
              : 'text-green-400'
          }`}
          >
            {formattedPriceImpact}
          </span>
        </div>
        )}

        <SwapRouteInfo routeInfo={routeInfo} tokens={tokens} tokenIn={tokenIn} tokenOut={tokenOut} />

      </div>
    </div>
  );
}
