import { useTranslation } from 'react-i18next';
import AeternityBadge from '@/components/layout/AeternityBadge';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import '@/components/layout/RailCards.css';

interface AePriceCardProps {
  price: string;
  currency: string;
  isOnline: boolean;
  blockHeight?: number;
  className?: string;
}

const AePriceCard = ({
  price, currency, isOnline, blockHeight, className = '',
}: AePriceCardProps) => {
  const { t } = useTranslation('common');
  const highlight = usePointerHighlight();
  return (
    <section className={`rail-card ae-price-card ${className}`} aria-label={t('wallet.aePrice')} {...highlight}>
      <div className="ae-price-card__top">
        <AeternityBadge />
        <div className="ae-price-card__copy">
          <div className="ae-price-card__label">{t('wallet.aePrice')}</div>
          <span className="ae-price-card__value" dir="ltr">{price}</span>
        </div>
        <span className="ae-price-card__currency">{currency.toUpperCase()}</span>
      </div>
      <div className="ae-price-card__footer">
        <span className={`ae-price-card__status${isOnline ? '' : ' ae-price-card__status--offline'}`} role="status">
          <span className="ae-price-card__dot" aria-hidden="true" />
          {t(isOnline ? 'wallet.online' : 'wallet.offline')}
        </span>
        {blockHeight != null && (
          <span className="ae-price-card__block">
            <span>{t('wallet.block')}</span>
            <strong dir="ltr">
              #
              {Number(blockHeight).toLocaleString()}
            </strong>
          </span>
        )}
      </div>
    </section>
  );
};

export default AePriceCard;
