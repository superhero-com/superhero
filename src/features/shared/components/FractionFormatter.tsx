import React from 'react';
import type { FormattedFractionalPrice } from '@/utils/types';

interface FractionFormatterProps {
  fractionalPrice: FormattedFractionalPrice;
}

const FractionFormatter = ({ fractionalPrice }: FractionFormatterProps) => (
  <div className="fraction-formatter flex items-center">
    <div>{fractionalPrice.number}</div>
    {fractionalPrice.zerosCount && (
    <div
      className="text-xs"
      style={{ marginTop: '5px', fontSize: '12px', padding: '0 2px' }}
    >
      {fractionalPrice.zerosCount}
    </div>
    )}
    {fractionalPrice.significantDigits && (
    <div>{fractionalPrice.significantDigits}</div>
    )}
  </div>
);

export default FractionFormatter;
