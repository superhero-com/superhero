import { useTranslation } from 'react-i18next';
import AeternityBadge from '@/components/layout/AeternityBadge';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import '@/components/layout/RailCards.css';

interface AePriceCardProps {
  price: string;
  currency: string;
  blockHeight?: number;
  className?: string;
}

const AePriceCard = ({
  price, currency, blockHeight, className = '',
}: AePriceCardProps) => {
  const { t } = useTranslation('common');
  const highlight = usePointerHighlight();
  return (
    <section className={`rail-card ae-price-card ${className}`} aria-label={t('wallet.aePrice')} {...highlight}>
      <div className="ae-price-card__top">
        <AeternityBadge />
        <div className="ae-price-card__copy">
          <div className="ae-price-card__label-row">
            <span className="ae-price-card__label">{t('wallet.aePrice')}</span>
            <span className="ae-price-card__currency">{currency.toUpperCase()}</span>
          </div>
          <span className="ae-price-card__value" dir="ltr">{price}</span>
          {blockHeight != null && (
            <div className="ae-price-card__block">
              <span>{t('wallet.block')}</span>
              <strong dir="ltr">
                #
                {Number(blockHeight).toLocaleString()}
              </strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AePriceCard;
