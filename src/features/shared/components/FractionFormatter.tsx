import React from 'react';
import type { FormattedFractionalPrice } from '@/utils/types';
import { cn } from '@/lib/utils';

interface FractionFormatterProps {
  fractionalPrice: FormattedFractionalPrice;
  textClassName?: string;
}

const FractionFormatter = ({ fractionalPrice, textClassName = '' }: FractionFormatterProps) => (
  <div className={cn('fraction-formatter flex items-center', textClassName)}>
    <div>{fractionalPrice.number}</div>
    {fractionalPrice.zerosCount && (
    <div
      className={cn('text-xs text-muted-foreground', textClassName)}
      style={{ marginTop: '5px', fontSize: '12px', padding: '0 2px' }}
    >
      {fractionalPrice.zerosCount}
    </div>
    )}
    {fractionalPrice.significantDigits && (
    <div className={textClassName}>{fractionalPrice.significantDigits}</div>
    )}
  </div>
);

export default FractionFormatter;
