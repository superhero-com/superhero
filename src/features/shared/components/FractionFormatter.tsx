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
    <div className="flex items-center">
      <div>{fractionalPrice.number}</div>
      {fractionalPrice.zerosCount && (
        <div 
          className="text-xs px-0.5"
          style={{ marginTop: '5px', fontSize: '12px' }}
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
