import React from 'react';

export interface FormattedFractionalPrice {
  number: string;
  zerosCount?: string;
  significantDigits?: string;
}

interface FractionFormatterProps {
  fractionalPrice: FormattedFractionalPrice;
}

export default function FractionFormatter({ fractionalPrice }: FractionFormatterProps) {
  return (
    <div className="fraction-formatter flex items-center gap-0.5">
      <div>{fractionalPrice.number}</div>
      {fractionalPrice.zerosCount && (
        <div 
          className="text-[9px] leading-none"
          style={{ marginTop: '4px', padding: '0', marginLeft: '-1px', marginRight: '-1px' }}
        >
          {fractionalPrice.zerosCount}
        </div>
      )}
      {fractionalPrice.significantDigits && (
        <div>{fractionalPrice.significantDigits}</div>
      )}
    </div>
  );
}
