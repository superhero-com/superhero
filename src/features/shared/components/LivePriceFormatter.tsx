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
  const { getFiat, currentCurrencyRate, aeternityData, isLoadingPrice } = useCurrencies();
  const computedFiatPrice = useMemo(() => {
    // Use provided fiatPrice if available
    if (fiatPrice !== undefined && !fiatPrice.isZero) {
      return fiatPrice;
    }
    
    // Validate AE price
    if (!aePrice || aePrice.isZero || aePrice.infinite) {
      return Decimal.ZERO;
    }
    
    // Priority 1: If currency rate is available and valid, use getFiat
    if (currentCurrencyRate && currentCurrencyRate > 0) {
      const computed = getFiat(aePrice);
      if (!computed.isZero) {
        return computed;
      }
    }
    
    // Priority 2: Fallback to aeternityData.currentPrice if available
    if (aeternityData?.currentPrice && typeof aeternityData.currentPrice === 'number' && aeternityData.currentPrice > 0) {
      const computed = aePrice.mul(Decimal.from(aeternityData.currentPrice));
      if (!computed.isZero) {
        return computed;
      }
    }
    
    // Last resort: try getFiat anyway (might work if rate loads asynchronously)
    return getFiat(aePrice);
  }, [aePrice, fiatPrice, getFiat, currentCurrencyRate, aeternityData]);

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
