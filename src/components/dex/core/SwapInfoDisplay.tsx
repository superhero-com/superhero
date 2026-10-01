import { useId, useState } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DexTokenDto } from '../../../api/generated';
import { useDex } from '../../../hooks';
import { CONFIG } from '../../../config';
import { fromAettos, subSlippage, toAettos } from '../../../libs/dex';
import { Decimal } from '../../../libs/decimal';
import { RouteInfo } from '../types/dex';

interface Props {
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
  amountIn: string;
  amountOut: string;
  routeInfo: RouteInfo;
  tokens: DexTokenDto[];
  onSettings: () => void;
}

const SwapInfoDisplay = ({
  tokenIn, tokenOut, amountIn, amountOut, routeInfo, tokens, onSettings,
}: Props) => {
  const { t } = useTranslation('dex');
  const { slippagePct, deadlineMins } = useDex();
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  if (!tokenIn || !tokenOut || !Number(amountIn) || !Number(amountOut)) return null;
  const minimum = fromAettos(
    subSlippage(toAettos(routeInfo.routerAmountOut || amountOut, tokenOut.decimals), slippagePct),
    tokenOut.decimals,
  );
  const rate = Decimal.from(amountOut).div(amountIn).prettify(6);
  const routeLabel = (address: string) => {
    if (address === 'AE') return 'AE';
    if (address === CONFIG.DEX_WAE) return 'WAE';
    return [tokenIn, tokenOut, ...tokens].find((token) => token.address === address)?.symbol
      || `${address.slice(0, 6)}…${address.slice(-4)}`;
  };
  const labels = routeInfo.path.map(routeLabel);
  if (tokenIn.is_ae && labels[0] !== 'AE') labels.unshift('AE');
  if (tokenOut.is_ae && labels[labels.length - 1] !== 'AE') labels.push('AE');
  const reserveAmount = (amount: string, address: string) => {
    const decimals = [tokenIn, tokenOut, ...tokens]
      .find((token) => token.address === address)?.decimals;
    if (decimals === undefined && address !== CONFIG.DEX_WAE) return '—';
    return Decimal.from(fromAettos(amount, decimals ?? 18)).prettify(4);
  };
  const impact = routeInfo.priceImpact;
  const shownImpact = impact == null ? '—' : `${Math.abs(impact) < 0.01 ? '<0.01' : impact.toFixed(2)}%`;
  return (
    <div className="swap-quote">
      <div className="swap-quote__rate">
        <span><bdi>{`1 ${tokenIn.symbol} ≈ ${rate} ${tokenOut.symbol}`}</bdi></span>
        <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)}>
          {t('swapCard.details')}
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
      <div className="swap-quote__essentials">
        <div>
          <span>{t('minimumReceived')}</span>
          <strong>
            <bdi>
              {Decimal.from(minimum).prettify(6)}
              {' '}
              <small>{tokenOut.symbol}</small>
            </bdi>
          </strong>
        </div>
        <div>
          <span>{t('settings.slippageTolerance')}</span>
          <button type="button" onClick={onSettings}>
            {slippagePct}
            %
            <Settings2 aria-hidden="true" />
            <span className="sr-only">{t('swap.swapSettings')}</span>
          </button>
        </div>
      </div>
      {expanded && (
        <dl className="swap-quote__details" id={detailsId}>
          <div>
            <dt>{t('priceImpact')}</dt>
            <dd className={impact != null && Math.abs(impact) > 5 ? 'is-warning' : ''}>{shownImpact}</dd>
          </div>
          <div>
            <dt>{t('swapRouteInfo.route')}</dt>
            <dd><bdi>{labels.join(' → ')}</bdi></dd>
          </div>
          <div>
            <dt>{t('settings.transactionDeadline')}</dt>
            <dd>
              {deadlineMins}
              {' '}
              {t('swapCard.minutes')}
            </dd>
          </div>
          {routeInfo.reserves?.map((reserve) => (
            <div key={`${reserve.token0}-${reserve.token1}`}>
              <dt>{t('swapCard.reserves')}</dt>
              <dd>
                <bdi>{`${reserveAmount(reserve.reserve0, reserve.token0)} ${routeLabel(reserve.token0)}`}</bdi>
                <br />
                <bdi>{`${reserveAmount(reserve.reserve1, reserve.token1)} ${routeLabel(reserve.token1)}`}</bdi>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
export default SwapInfoDisplay;
