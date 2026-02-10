import FractionFormatter from '@/features/shared/components/FractionFormatter';
import { formatFractionalPrice } from '@/utils/common';
import { Decimal } from '../../../libs/decimal';

interface FiatPriceFormatterProps {
  fiatPrice: Decimal;
  currencySymbol?: string;
  className?: string;
}

const DEFAULT_CURRENCY_SYMBOL = '$';

const FiatPriceFormatter = ({
  fiatPrice,
  currencySymbol = DEFAULT_CURRENCY_SYMBOL,
  className = '',
}: FiatPriceFormatterProps) => (
  <div className={`inline-flex items-center ${className}`}>
    <div className={className}>{currencySymbol}</div>
    <FractionFormatter fractionalPrice={formatFractionalPrice(fiatPrice)} />
  </div>
);

export default FiatPriceFormatter;
