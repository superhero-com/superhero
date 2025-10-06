import React, { useMemo } from 'react';
import { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '@/libs/decimal';
import { useCurrencies } from '@/hooks/useCurrencies';
import PriceFormatter from './PriceFormatter';

interface TokenPriceFormatterProps {
  token: TokenDto;
  price: Decimal;
  // Pass through any additional props that PriceFormatter accepts
  watchPrice?: boolean;
  watchKey?: string;
  priceLoading?: boolean;
  hideFiatPrice?: boolean;
  hideSymbol?: boolean;
  rowOnSm?: boolean;
  className?: string;
}

/**
 * TokenPriceFormatter - Formats token prices with proper symbol and fiat conversion
 * 
 * This component takes a token and a price (in token units) and calculates the AE equivalent
 * by multiplying with the token's price, then converts to fiat using the currencies hook.
 * It's equivalent to the Vue TokenPriceFormatter component.
 */
export default function TokenPriceFormatter({
  token,
  price,
  ...priceFormatterProps
}: TokenPriceFormatterProps) {
  const { getFiat } = useCurrencies();

  // Calculate AE price by multiplying the token amount with the token's price
  const aePrice = useMemo(() => {
    if (!price || !token?.price) {
      return Decimal.ZERO;
    }
    return price.mul(Decimal.from(token.price));
  }, [price, token?.price]);

  // Calculate fiat price using the getFiat function
  const fiatPrice = useMemo(() => {
    return getFiat(aePrice);
  }, [aePrice, getFiat]);

  return (
    <PriceFormatter
      symbol={token.symbol}
      aePrice={price}
      fiatPrice={fiatPrice}
      {...priceFormatterProps}
    />
  );
}
