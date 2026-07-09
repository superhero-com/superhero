import { useTranslation } from 'react-i18next';
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

const LiquidityPreview = ({
  preview,
  tokenA,
  tokenB,
  pairExists,
  hasError,
  onSuggestedAmountA,
  onSuggestedAmountB,
}: LiquidityPreviewProps) => {
  const { t } = useTranslation('dex');
  if (!tokenA || !tokenB) return null;

  return (
    <div className={`p-4 mb-5 backdrop-blur-sm rounded-2xl ${
      hasError
        ? 'bg-red-500/10 border border-red-500/30'
        : 'bg-white/[0.05] border border-glass-border'
    }`}
    >
      <div className="text-sm font-semibold text-standard-font-color mb-3 flex items-center gap-2">
        <span>{hasError ? t('liquidityPreview.ratioWarning') : t('liquidityPreview.poolPreview')}</span>
        {!pairExists && !hasError && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-accent-color text-white font-semibold">
            {t('liquidityPreview.newPool')}
          </span>
        )}
      </div>

      <div className="grid gap-2">
        {preview.ratioBinA && preview.ratioBinA !== '-' && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>{t('liquidityPreview.rate')}</span>
            <span className="font-semibold text-standard-font-color">
              1
              {' '}
              {tokenA.symbol}
              {' '}
              =
              {' '}
              {preview.ratioBinA}
              {' '}
              {tokenB.symbol}
            </span>
          </div>
        )}

        {preview.ratioAinB && preview.ratioAinB !== '-' && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>{t('liquidityPreview.rate')}</span>
            <span className="font-semibold text-standard-font-color">
              1
              {' '}
              {tokenB.symbol}
              {' '}
              =
              {' '}
              {preview.ratioAinB}
              {' '}
              {tokenA.symbol}
            </span>
          </div>
        )}

        {preview.sharePct && Number(preview.sharePct) > 0 && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>{t('liquidityPreview.poolShare')}</span>
            <span className="font-semibold text-accent-color">
              {Number(preview.sharePct).toFixed(6)}
              %
            </span>
          </div>
        )}

        {preview.lpMintEstimate && (
          <div className="flex justify-between items-center text-xs text-light-font-color">
            <span>{t('liquidityPreview.lpTokens')}</span>
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
            {t('liquidityPreview.suggestedOptimalAmounts')}
          </div>

          <div className="flex gap-2 flex-wrap">
            {preview.suggestedAmountB && onSuggestedAmountB && (
              <button
                type="button"
                onClick={() => onSuggestedAmountB(preview.suggestedAmountB!)}
                className="px-3 py-1.5 rounded-lg border border-accent-color bg-teal-500/20 text-accent-color text-xs font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-color hover:text-white"
              >
                {t('liquidityPreview.use', {
                  amount: Number(preview.suggestedAmountB).toFixed(6),
                  symbol: tokenB.symbol,
                })}
              </button>
            )}

            {preview.suggestedAmountA && onSuggestedAmountA && (
              <button
                type="button"
                onClick={() => onSuggestedAmountA(preview.suggestedAmountA!)}
                className="px-3 py-1.5 rounded-lg border border-accent-color bg-teal-500/20 text-accent-color text-xs font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-color hover:text-white"
              >
                {t('liquidityPreview.use', {
                  amount: Number(preview.suggestedAmountA).toFixed(6),
                  symbol: tokenA.symbol,
                })}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityPreview;
