import React from 'react';

interface FractionFormatterProps {
  fractionalPrice: string;
}

export default function FractionFormatter({ fractionalPrice }: FractionFormatterProps) {
  return <span>{fractionalPrice}</span>;
}
