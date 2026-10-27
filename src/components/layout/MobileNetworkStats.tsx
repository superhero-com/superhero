import { useTranslation } from 'react-i18next';
import AeternityBadge from '@/components/layout/AeternityBadge';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useCurrencies } from '@/hooks/useCurrencies';
import '@/components/layout/RailCards.css';

const formatFiat = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  } catch {
    return value.toFixed(4);
  }
};

/**
 * One-line AE price and block height for small screens, where the right rail
 * (which shows the same data on desktop) is hidden.
 */
const MobileNetworkStats = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation('common');
  const { currentBlockHeight } = useAeSdk();
  const { currentCurrencyCode, currencyRates } = useCurrencies();
  const rate = Number((currencyRates as Record<string, number> | null)?.[currentCurrencyCode]);
  const price = Number.isFinite(rate) && rate > 0 ? formatFiat(rate, currentCurrencyCode) : '—';

  return (
    <section
      className={`rail-card ae-price-card mobile-network-stats lg:hidden ${className}`}
      aria-label={t('wallet.aePrice')}
    >
      <div className="ae-price-card__top">
        <AeternityBadge />
        <div className="ae-price-card__copy">
          <div className="ae-price-card__label">{t('wallet.aePrice')}</div>
          <span className="text-[16px] font-bold tabular-nums" dir="ltr">{price}</span>
        </div>
        {currentBlockHeight != null && (
          <span className="ae-price-card__block text-[12px] text-[var(--rail-muted)]">
            <span>{t('wallet.block')}</span>
            <strong dir="ltr">
              #
              {Number(currentBlockHeight).toLocaleString()}
            </strong>
          </span>
        )}
      </div>
    </section>
  );
};

export default MobileNetworkStats;
