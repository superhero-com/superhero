import { DexTokenDto } from '../../../api/generated';

interface LiquidityPreviewProps {
  preview: {
    ratioAinB?: string;
    ratioBinA?: string;
    sharePct?: string;
    lpMintEstimate?: string;
    suggestedAmountA?: string;
    suggestedAmountB?: string;
  };
  tokenA: DexTokenDto | null;
  tokenB: DexTokenDto | null;
  pairExists: boolean;
  hasError?: boolean;
  onSuggestedAmountA?: (amount: string) => void;
  onSuggestedAmountB?: (amount: string) => void;
}

export default function LiquidityPreview({
  preview,
  tokenA,
  tokenB,
  pairExists,
  hasError,
  onSuggestedAmountA,
  onSuggestedAmountB
}: LiquidityPreviewProps) {
  if (!tokenA || !tokenB) return null;

  return (
    <div className={`p-4 mb-5 backdrop-blur-sm rounded-2xl ${
      hasError 
        ? 'bg-red-500/10 border border-red-500/30' 
        : 'bg-white/[0.05] border border-glass-border'
    }`}>
      <div className="text-sm font-semibold text-standard-font-color mb-3 flex items-center gap-2">
        <span>{hasError ? '⚠️ Ratio Warning' : 'Pool Preview'}</span>
        {!pairExists && !hasError && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-accent-color text-white font-semibold">
            NEW POOL
          </span>
        )}
      </div>

      <div className="grid gap-2">
        {preview.ratioAinB && preview.ratioAinB !== '-' && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>Rate</span>
            <span className="font-semibold text-standard-font-color">
              1 {tokenA.symbol} = {preview.ratioAinB} {tokenB.symbol}
            </span>
          </div>
        )}

        {preview.ratioBinA && preview.ratioBinA !== '-' && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>Rate</span>
            <span className="font-semibold text-standard-font-color">
              1 {tokenB.symbol} = {preview.ratioBinA} {tokenA.symbol}
            </span>
          </div>
        )}

        {preview.sharePct && Number(preview.sharePct) > 0 && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>Pool Share</span>
            <span className="font-semibold text-accent-color">
              {Number(preview.sharePct).toFixed(6)}%
            </span>
          </div>
        )}

        {preview.lpMintEstimate && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>LP Tokens</span>
            <span className="font-semibold text-standard-font-color">
              {Number(preview.lpMintEstimate).toFixed(8)}
            </span>
          </div>
        )}
      </div>

      {/* Suggested Amounts */}
      {(preview.suggestedAmountA || preview.suggestedAmountB) && (
        <div className="mt-4 p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl">
          <div className="text-xs font-semibold text-accent-color mb-2">
            💡 Suggested Optimal Amounts
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {preview.suggestedAmountB && onSuggestedAmountB && (
              <button
                onClick={() => onSuggestedAmountB(preview.suggestedAmountB!)}
                className="px-3 py-1.5 rounded-lg border border-accent-color bg-teal-500/20 text-accent-color text-xs font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-color hover:text-white"
              >
                Use {Number(preview.suggestedAmountB).toFixed(6)} {tokenB.symbol}
              </button>
            )}
            
            {preview.suggestedAmountA && onSuggestedAmountA && (
              <button
                onClick={() => onSuggestedAmountA(preview.suggestedAmountA!)}
                className="px-3 py-1.5 rounded-lg border border-accent-color bg-teal-500/20 text-accent-color text-xs font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-color hover:text-white"
              >
                Use {Number(preview.suggestedAmountA).toFixed(6)} {tokenA.symbol}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
