import React, { useMemo } from 'react';
import { Decimal } from '../../../libs/decimal';
import PriceFormatter from './PriceFormatter';

interface LivePriceFormatterProps {
  aePrice: Decimal;
  fiatPrice?: Decimal;
  symbol?: string;
  watchPrice?: boolean;
  watchKey?: string;
  priceLoading?: boolean;
  hideFiatPrice?: boolean;
  hideSymbol?: boolean;
  row?: boolean;
  className?: string;
}

// Mock fiat conversion - in a real app, this would come from a currency service
const getFiatPrice = (aePrice: Decimal): Decimal => {
  // Mock conversion rate: 1 AE = $0.05 (this should come from a real API)
  const mockRate = 0.05;
  return aePrice.mul(Decimal.from(mockRate));
};

export default function LivePriceFormatter({
  aePrice,
  fiatPrice,
  symbol,
  watchPrice = true,
  watchKey,
  priceLoading = false,
  hideFiatPrice = false,
  hideSymbol = false,
  row = false,
  className = '',
}: LivePriceFormatterProps) {
  const computedFiatPrice = useMemo(() => {
    return fiatPrice || getFiatPrice(aePrice);
  }, [aePrice, fiatPrice]);

  return (
    <PriceFormatter
      aePrice={aePrice}
      fiatPrice={computedFiatPrice}
      symbol={symbol}
      watchPrice={watchPrice}
      watchKey={watchKey}
      priceLoading={priceLoading}
      hideFiatPrice={hideFiatPrice}
      hideSymbol={hideSymbol}
      row={row}
      className={className}
    />
  );
}
