import React from 'react';
import { Decimal } from '../../../libs/decimal';
import FractionFormatter, { FormattedFractionalPrice } from './FractionFormatter';

interface FiatPriceFormatterProps {
  fiatPrice: Decimal;
  currencySymbol?: string;
  className?: string;
}

const DEFAULT_CURRENCY_SYMBOL = '$';

export default function FiatPriceFormatter({
  fiatPrice,
  currencySymbol = DEFAULT_CURRENCY_SYMBOL,
  className = '',
}: FiatPriceFormatterProps) {
  const formatFractionalPrice = (price: Decimal): FormattedFractionalPrice => {
    const priceStr = price.toString();
    const [integer, decimal] = priceStr.split('.');
    
    if (!decimal) {
      return { number: integer };
    }
    
    // Find significant digits (non-zero decimals)
    const significantDigits = decimal.replace(/0+$/, '');
    const zerosCount = decimal.length - significantDigits.length;
    
    return {
      number: integer,
      significantDigits: significantDigits || undefined,
      zerosCount: zerosCount > 0 ? '0'.repeat(zerosCount) : undefined,
    };
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="text-white/80">{currencySymbol}</div>
      <FractionFormatter fractionalPrice={formatFractionalPrice(fiatPrice)} />
    </div>
  );
}
