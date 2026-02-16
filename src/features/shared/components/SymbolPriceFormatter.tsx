import React from 'react';
import { formatFractionalPrice } from '@/utils/common';
import { Decimal } from '../../../libs/decimal';
import FractionFormatter from './FractionFormatter';
import Spinner from '../../../components/Spinner';

interface SymbolPriceFormatterProps {
  aePrice: Decimal;
  symbol?: string;
  priceLoading?: boolean;
  hideSymbol?: boolean;
  priceJustIncreased?: boolean;
  priceJustDecreased?: boolean;
  className?: string;
  textClassName?: string;
}

const COIN_SYMBOL = 'AE';

const SymbolPriceFormatter = ({
  aePrice,
  symbol = COIN_SYMBOL,
  priceLoading = false,
  hideSymbol = false,
  priceJustIncreased = false,
  priceJustDecreased = false,
  className = '',
  textClassName = '',
}: SymbolPriceFormatterProps) => (
  <div className={`inline-flex items-center ${className}`}>
    {priceJustIncreased && (
    <span className="text-green-400 mr-1">↗</span>
    )}
    {priceJustDecreased && (
    <span className="text-red-400 mr-1">↘</span>
    )}
    <FractionFormatter fractionalPrice={formatFractionalPrice(aePrice)} textClassName={textClassName} />
    {priceLoading && (
    <Spinner className="w-4 h-4 ml-2" />
    )}
    {!hideSymbol && !priceLoading && (
    <span className={`pl-1 ${textClassName}`}>{symbol}</span>
    )}
  </div>
);

export default SymbolPriceFormatter;
