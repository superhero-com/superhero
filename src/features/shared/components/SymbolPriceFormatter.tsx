import React from 'react';
import { Decimal } from '../../../libs/decimal';
import FractionFormatter, { FormattedFractionalPrice } from './FractionFormatter';

interface SymbolPriceFormatterProps {
  aePrice: Decimal;
  symbol?: string;
  priceLoading?: boolean;
  hideSymbol?: boolean;
  priceJustIncreased?: boolean;
  priceJustDecreased?: boolean;
  className?: string;
}

const COIN_SYMBOL = 'AE';

export default function SymbolPriceFormatter({
  aePrice,
  symbol = COIN_SYMBOL,
  priceLoading = false,
  hideSymbol = false,
  priceJustIncreased = false,
  priceJustDecreased = false,
  className = '',
}: SymbolPriceFormatterProps) {
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
      {priceJustIncreased && (
        <span className="text-green-400 mr-1">↗</span>
      )}
      {priceJustDecreased && (
        <span className="text-red-400 mr-1">↘</span>
      )}
      <FractionFormatter fractionalPrice={formatFractionalPrice(aePrice)} />
      {priceLoading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2" />
      )}
      {!hideSymbol && !priceLoading && (
        <span className="pl-1 text-white/80">{symbol}</span>
      )}
    </div>
  );
}
