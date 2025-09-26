import React from 'react';
import { Decimal } from '../../../../libs/decimal';

interface LivePriceFormatterProps {
  aePrice: Decimal;
  watchPrice?: boolean;
}

export default function LivePriceFormatter({ aePrice, watchPrice = true }: LivePriceFormatterProps) {
  return <span>{aePrice.prettify()}</span>;
}
