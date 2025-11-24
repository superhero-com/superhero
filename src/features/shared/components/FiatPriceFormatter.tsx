import FractionFormatter from "@/features/shared/components/FractionFormatter";
import { Decimal } from '../../../libs/decimal';

interface FiatPriceFormatterProps {
  fiatPrice: Decimal;
  currencySymbol?: string;
  className?: string;
}

const DEFAULT_CURRENCY_SYMBOL = '$';

/**
 * Formats a fiat price without fractional notation (always shows actual number)
 * This is different from formatFractionalPrice which uses notation for very small numbers
 */
function formatFiatPrice(price: Decimal) {
  if (price.isZero) {
    return {
      number: '0.00',
    };
  }
  if (price.gte(Decimal.from('1'))) {
    return {
      number: price.prettify(2),
    };
  }
  if (price.gte(Decimal.from('0.01'))) {
    return {
      number: price.prettify(4),
    };
  }
  if (price.gte(Decimal.from('0.0001'))) {
    return {
      number: price.prettify(6),
    };
  }
  // For very small amounts, show up to 8 decimal places (no fractional notation)
  return {
    number: price.prettify(8),
  };
}

export default function FiatPriceFormatter({
  fiatPrice,
  currencySymbol = DEFAULT_CURRENCY_SYMBOL,
  className = '',
}: FiatPriceFormatterProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={className}>{currencySymbol}</div>
      <FractionFormatter fractionalPrice={formatFiatPrice(fiatPrice)} />
    </div>
  );
}
