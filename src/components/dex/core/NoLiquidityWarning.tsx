import { useNavigate } from 'react-router-dom';
import { DexTokenDto } from '../../../api/generated';
import { Decimal } from '../../../libs/decimal';

interface NoLiquidityWarningProps {
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
  show: boolean;
  exceedsLiquidity?: boolean;
  maxAvailable?: string;
  pairAddress?: string;
}

export default function NoLiquidityWarning({
  tokenIn,
  tokenOut,
  show,
  exceedsLiquidity,
  maxAvailable,
  pairAddress,
}: NoLiquidityWarningProps) {
  const navigate = useNavigate();

  if (!show || !tokenIn || !tokenOut) {
    return null;
  }

  const handleAddLiquidity = () => {
    const tokenInAddr = tokenIn.is_ae ? 'AE' : tokenIn.address;
    const tokenOutAddr = tokenOut.is_ae ? 'AE' : tokenOut.address;
    navigate(`/defi/pool?from=${tokenInAddr}&to=${tokenOutAddr}`);
  };

  if (exceedsLiquidity && maxAvailable) {
    return (
      <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4 mb-5 backdrop-blur-[10px]">
        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-yellow-400"
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
            <h3 className="text-yellow-400 font-semibold text-sm mb-2">
              Insufficient Liquidity
            </h3>
            <p className="text-yellow-300/90 text-sm leading-relaxed mb-3">
              The requested amount exceeds the available liquidity in the pool.
              Maximum available:
              {' '}
              <span className="font-semibold">
                {Decimal.from(maxAvailable).prettify()}
                {' '}
                {tokenIn.symbol}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">

              <div className="text-xs text-yellow-300/70 flex items-center">
                <span>
                  • Reduce your input amount to
                  {Decimal.from(maxAvailable).prettify()}
                  {' '}
                  {tokenIn.symbol}
                  {' '}
                  or less
                </span>
              </div>
            </div>
          </div>

        </div>
        <button
          onClick={handleAddLiquidity}
          className="mx-auto mt-4 px-4 py-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-400/20 transition-all duration-300 cursor-pointer"
        >
          ➕ Add Liquidity
        </button>
      </div>
    );
  }

  // No liquidity case
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
          <p className="text-red-300/90 text-sm leading-relaxed mb-3">
            No liquidity found for the
            {' '}
            <span className="font-semibold">{tokenIn.symbol}</span>
            {' '}
            /
            {' '}
            <span className="font-semibold">{tokenOut.symbol}</span>
            {' '}
            pair.
            This swap cannot be completed at this time.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button
              onClick={handleAddLiquidity}
              className="px-4 py-2 rounded-xl border border-red-400/30 bg-red-400/10 text-red-400 text-sm font-semibold hover:bg-red-400/20 transition-all duration-300 cursor-pointer"
            >
              ➕ Add Liquidity
            </button>
            <div className="text-xs text-red-300/70 flex items-center">
              <span>• Try a different token pair</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
