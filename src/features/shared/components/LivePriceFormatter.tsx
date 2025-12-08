import React, { useMemo } from 'react';
import { Decimal } from '../../../libs/decimal';
import PriceFormatter from './PriceFormatter';
import { useCurrencies } from '@/hooks/useCurrencies';

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
  const { getFiat } = useCurrencies();
  const computedFiatPrice = useMemo(() => {
    // Use provided fiatPrice if available, otherwise compute it from aePrice
    return fiatPrice ?? getFiat(aePrice);
  }, [aePrice, fiatPrice, getFiat]);

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
      rowOnSm={row}
      className={className}
    />
  );
}
