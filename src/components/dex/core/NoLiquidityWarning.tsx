import { DexTokenDto } from '../../../api/generated';

interface NoLiquidityWarningProps {
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
  show: boolean;
}

export default function NoLiquidityWarning({ tokenIn, tokenOut, show }: NoLiquidityWarningProps) {
  if (!show || !tokenIn || !tokenOut) {
    return null;
  }

  return (
    <div className="bg-red-400/10 border border-red-400/20 rounded-2xl p-4 mb-5 backdrop-blur-[10px]">
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center">
            <svg 
              className="w-4 h-4 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>
        
        {/* Warning Content */}
        <div className="flex-1">
          <h3 className="text-red-400 font-semibold text-sm mb-2">
            No Liquidity Available
          </h3>
          <p className="text-red-300/90 text-sm leading-relaxed">
            No liquidity found for the <span className="font-semibold">{tokenIn.symbol}</span> / <span className="font-semibold">{tokenOut.symbol}</span> pair. 
            This swap cannot be completed at this time.
          </p>
          <div className="mt-3 text-xs text-red-300/70">
            <p className="mb-1">• Try a different token pair</p>
            <p className="mb-1">• Check if there's sufficient liquidity in the pool</p>
            <p>• Consider providing liquidity to earn fees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
