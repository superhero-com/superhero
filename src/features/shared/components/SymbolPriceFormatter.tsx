import React from 'react';
import { Decimal } from '../../../libs/decimal';
import FractionFormatter, { FormattedFractionalPrice } from './FractionFormatter';
import { formatFractionalPrice } from '@/utils/common';
import Spinner from '../../../components/Spinner';

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
        <Spinner className="w-4 h-4 ml-2" />
      )}
      {!hideSymbol && !priceLoading && (
        <span className="pl-1 ">{symbol}</span>
      )}
    </div>
  );
}
