import { useId, useState } from 'react';
import {
  ArrowDownUp, ChevronDown, Layers, Settings2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DexTokenDto } from '../../../api/generated';
import { fromAettos, subSlippage, toAettos } from '../../../libs/dex';
import { formatLiquidityValue } from '../utils/liquidityEstimate';
import type { AddLiquidityState } from '../types/pool';

interface Props {
  preview: AddLiquidityState['pairPreview'];
  tokenA: DexTokenDto | null;
  tokenB: DexTokenDto | null;
  pairExists: boolean;
  status: 'idle' | 'loading' | 'error' | 'ready';
  amountA: string;
  amountB: string;
  slippagePct: number;
  deadlineMins: number;
  onRetry: () => void;
  onSettings: () => void;
}

const LiquidityPreview = ({
  preview, tokenA, tokenB, pairExists, status, amountA, amountB,
  slippagePct, deadlineMins, onRetry, onSettings,
}: Props) => {
  const { t } = useTranslation('dex');
  const [inverse, setInverse] = useState(false);
  const [details, setDetails] = useState(false);
  const detailsId = useId();
  const ready = status === 'ready';
  const valid = ready && Number(amountA) > 0 && Number(amountB) > 0;
  const ratio = inverse ? preview?.ratioAinB : preview?.ratioBinA;
  const minimum = (amount: string, decimals: number) => {
    if (!valid) return '—';
    const raw = subSlippage(toAettos(amount, decimals), slippagePct);
    return formatLiquidityValue(fromAettos(raw < 1n ? 1n : raw, decimals));
  };
  return (
    <>
      {ready && !pairExists && (
      <div className="pool-new-note">
        <Layers aria-hidden="true" />
        <div>
          <strong>{t('poolAdd.firstProvider')}</strong>
          <p>{t('poolAdd.newPoolHint')}</p>
        </div>
      </div>
      )}
      <div className="pool-estimate" aria-busy={status === 'loading'}>
        <div className="pool-estimate-heading">
          <span>{t(ready && !pairExists ? 'poolAdd.startingRatio' : 'poolAdd.poolRatio')}</span>
          {ready && ratio ? (
            <button type="button" className="pool-rate" aria-label={t('poolAdd.flipRatio')} onClick={() => setInverse(!inverse)}>
              <bdi>{`1 ${inverse ? tokenB?.symbol : tokenA?.symbol} ≈ ${formatLiquidityValue(ratio)} ${inverse ? tokenA?.symbol : tokenB?.symbol}`}</bdi>
              <ArrowDownUp aria-hidden="true" />
            </button>
          ) : <span className="pool-check">{status === 'loading' ? t('poolAdd.checking') : t(status === 'error' ? 'poolAdd.unavailable' : 'poolAdd.enterAmounts')}</span>}
        </div>
        {status === 'error' ? (
          <div className="pool-unavailable" role="status">
            <p>{t('poolAdd.loadError')}</p>
            <button type="button" onClick={onRetry}>{t('poolAdd.retry')}</button>
          </div>
        ) : (
          <div className="pool-estimate-metrics">
            <div>
              <span>{t('poolAdd.share')}</span>
              <strong>{valid && preview?.sharePct ? `${formatLiquidityValue(preview.sharePct, 4)}%` : '—'}</strong>
            </div>
            <div>
              <span>{t('poolAdd.lpTokens')}</span>
              <strong>{valid ? formatLiquidityValue(preview?.lpMintEstimate) : '—'}</strong>
            </div>
          </div>
        )}
        <div className="pool-summary-bottom">
          <button type="button" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls={detailsId}>
            {t('poolAdd.details')}
            <ChevronDown className={details ? 'rotated' : ''} aria-hidden="true" />
          </button>
          <button type="button" onClick={onSettings}>
            <span>{t('poolAdd.slippage')}</span>
            {`${slippagePct}%`}
            <Settings2 aria-hidden="true" />
          </button>
        </div>
        {details && (
          <div id={detailsId} className="pool-details">
            <dl>
              <div>
                <dt>{t('poolAdd.minimum', { symbol: tokenA?.symbol || '' })}</dt>
                <dd><bdi>{`${minimum(amountA, tokenA?.decimals ?? 18)} ${tokenA?.symbol || ''}`}</bdi></dd>
              </div>
              <div>
                <dt>{t('poolAdd.minimum', { symbol: tokenB?.symbol || '' })}</dt>
                <dd><bdi>{`${minimum(amountB, tokenB?.decimals ?? 18)} ${tokenB?.symbol || ''}`}</bdi></dd>
              </div>
              <div>
                <dt>{t('settings.transactionDeadline')}</dt>
                <dd>
                  {deadlineMins}
                  {' '}
                  {t('liquidityConfirmation.minutes')}
                </dd>
              </div>
            </dl>
            <p>{t('poolAdd.estimatesHint')}</p>
          </div>
        )}
      </div>
    </>
  );
};
export default LiquidityPreview;
