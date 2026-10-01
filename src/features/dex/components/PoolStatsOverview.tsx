import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, ArrowDownRight, ArrowUpRight, ArrowLeftRight,
  ChevronDown, ChevronUp, Info, Layers, RotateCcw,
} from 'lucide-react';
import type { PairDto, PairSummaryDto } from '@/api/generated';
import { CONFIG } from '@/config';
import aeMark from '@/svg/aeternity-mark.svg';
import { formatPoolAmount, poolBalances, poolNumber } from '../utils/poolStatsValues';
import './PoolStatsOverview.scss';

interface PoolStatsOverviewProps {
  pairData: PairDto;
  pairSummary?: PairSummaryDto;
  loading?: boolean;
  failed?: boolean;
  onRetry: () => void;
}

const periods = ['24h', '7d', '30d'] as const;
type Period = typeof periods[number];
const periodLabels = { '24h': 'last24Hours', '7d': 'last7Days', '30d': 'last30Days' };

export const PoolStatsOverview = ({
  pairData, pairSummary, loading = false, failed = false, onRetry,
}: PoolStatsOverviewProps) => {
  const { t } = useTranslation('dex');
  const [period, setPeriod] = useState<Period>('24h');
  const [details, setDetails] = useState(false);
  const headingId = useId();
  const rateId = useId();
  const summary = loading || failed ? undefined : pairSummary;
  const current = summary?.change?.[period];
  const balances = poolBalances(pairData);
  const tokens = [pairData.token0, pairData.token1];
  const reserves = [balances.reserve0, balances.reserve1];
  const volume = poolNumber(current?.volume?.ae);
  const total = poolNumber(summary?.total_volume?.ae);
  const change = poolNumber(current?.price_change?.percentage);
  // The summary measures ratio(other / volume_token), i.e. the volume token's
  // price in the other asset. Label that direction rather than assuming WAE order.
  const pricedIndex = tokens.findIndex((token) => token.address === summary?.volume_token);
  const priceLabel = pricedIndex < 0 ? t('poolStats.ratioMovement') : t('poolStats.pricedIn', {
    token: tokens[pricedIndex].symbol, quote: tokens[1 - pricedIndex].symbol,
  });
  let direction = '';
  if (change?.gt(0)) direction = 'positive';
  if (change?.lt(0)) direction = 'negative';

  return (
    <div className="dex-pool-stats">
      <section className="stats-panel" aria-labelledby={headingId}>
        <header className="stats-heading">
          <div className="stats-title">
            <span className="section-mark"><Activity aria-hidden="true" /></span>
            <div>
              <h2 id={headingId}>{t('poolStats.title')}</h2>
              <p>{t('poolStats.subtitle')}</p>
            </div>
          </div>
          <div className="stats-period" role="group" aria-label={t('poolStats.period')}>
            {periods.map((item) => (
              <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>
                {item}
              </button>
            ))}
          </div>
        </header>
        {(loading || failed) && (
          <div className="stats-message" role="status">
            <span>{t(loading ? 'poolStats.loading' : 'poolStats.failed')}</span>
            {failed && !loading && (
              <button type="button" onClick={onRetry}>
                <RotateCcw aria-hidden="true" />
                {t('tokenHeader.retry')}
              </button>
            )}
          </div>
        )}
        <div className="activity-metrics" aria-live="polite" aria-busy={loading}>
          <div>
            <span>
              {t('poolStats.tradingVolume')}
              <small>{period}</small>
            </span>
            <strong>
              <bdi>{formatPoolAmount(volume)}</bdi>
              {volume && <small>AE</small>}
            </strong>
            <p>{t(`poolStats.${periodLabels[period]}`)}</p>
          </div>
          <div>
            <span>
              {t('poolStats.priceChange')}
              <small>{period}</small>
            </span>
            <strong className={direction}>
              <bdi>
                {change?.gt(0) ? '+' : ''}
                {formatPoolAmount(change)}
                {change ? '%' : ''}
              </bdi>
              {direction === 'positive' && <ArrowUpRight aria-hidden="true" />}
              {direction === 'negative' && <ArrowDownRight aria-hidden="true" />}
            </strong>
            <p>{priceLabel}</p>
          </div>
          <div>
            <span>{t('poolStats.totalTradingVolume')}</span>
            <strong>
              <bdi>{formatPoolAmount(total)}</bdi>
              {total && <small>AE</small>}
            </strong>
            <p>{t('poolStats.allTime')}</p>
          </div>
        </div>
        <div className="balance-heading">
          <h3>{t('poolStats.balances')}</h3>
          <span>
            <Info aria-hidden="true" />
            {t('poolStats.currentReserves')}
          </span>
        </div>
        <div className="reserve-grid">
          {tokens.map((token, index) => (
            <div className="reserve-row" key={token.address}>
              <span className="asset-mark" aria-hidden="true">
                {token.address === CONFIG.DEX_WAE || token.is_ae
                  ? <img src={aeMark} alt="" /> : token.symbol?.slice(0, 1) || '#'}
              </span>
              <div className="asset-name">
                <strong><bdi>{token.symbol}</bdi></strong>
                <span>{token.name}</span>
              </div>
              <div className="reserve-amount">
                <strong title={reserves[index]?.toFixed()}>
                  <bdi>{formatPoolAmount(reserves[index])}</bdi>
                </strong>
                <small><bdi>{token.symbol}</bdi></small>
              </div>
            </div>
          ))}
        </div>
        <footer className="pool-supply">
          <span>
            <Layers aria-hidden="true" />
            {t('poolReserves.lpTokenSupply')}
            <b title={balances.supply?.toFixed()}><bdi>{formatPoolAmount(balances.supply)}</bdi></b>
          </span>
          <button type="button" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls={rateId}>
            {t('poolStats.exchangeRate')}
            {details ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
        </footer>
        {details && (
          <div id={rateId} className="rate-detail">
            {balances.rate0 && balances.rate1 ? (
              <>
                <span>
                  <ArrowLeftRight aria-hidden="true" />
                  <bdi>
                    {`1 ${tokens[0].symbol} = ${formatPoolAmount(balances.rate0)} ${tokens[1].symbol}`}
                  </bdi>
                </span>
                <span>
                  <bdi>
                    {`1 ${tokens[1].symbol} = ${formatPoolAmount(balances.rate1)} ${tokens[0].symbol}`}
                  </bdi>
                </span>
              </>
            ) : <span>{t('poolStats.rateUnavailable')}</span>}
            <p>{t('poolStats.rateHint')}</p>
          </div>
        )}
      </section>
    </div>
  );
};
