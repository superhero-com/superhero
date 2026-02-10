import React, { useMemo } from 'react';
import { TokenDto } from '@/api/generated/models/TokenDto';
import type { PriceDto } from '@/api/generated/models/PriceDto';
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
 * TokenPriceFormatter - Formats a token balance using the token's price data.
 *
 * `price` is the amount of tokens (in token units, not aettos).
 * We derive:
 * - AE value: tokens * token.price_data.ae (or fallback to token.price if needed)
 * - Fiat value: tokens * token.price_data[currentCurrency] (or fallback via getFiat(AE))
 */
const TokenPriceFormatter = ({
  token,
  price,
  ...priceFormatterProps
}: TokenPriceFormatterProps) => {
  const { currentCurrencyCode, getFiat } = useCurrencies();

  // Calculate AE price by multiplying the token amount with the token's AE price
  const aePrice = useMemo(() => {
    if (!price || !token) return Decimal.ZERO;

    // Prefer structured price_data.ae; fall back to legacy token.price string
    const priceData = token.price_data as PriceDto | undefined;
    let perTokenAe = Decimal.ZERO;
    if (priceData?.ae) {
      perTokenAe = Decimal.from(priceData.ae);
    } else if (token.price) {
      perTokenAe = Decimal.from(token.price);
    }

    if (perTokenAe.isZero) return Decimal.ZERO;
    return price.mul(perTokenAe);
  }, [price, token]);

  // Calculate fiat price using the getFiat function
  const fiatPrice = useMemo(() => {
    if (!price || !token) return Decimal.ZERO;

    const priceData = token.price_data as PriceDto | undefined;

    // If backend already provides fiat price per token for the active currency,
    // use that directly (tokens * per-token fiat).
    const perTokenFiatRaw = priceData?.[currentCurrencyCode as keyof PriceDto];
    if (perTokenFiatRaw) {
      const perTokenFiat = Decimal.from(perTokenFiatRaw as unknown as string);
      return price.mul(perTokenFiat);
    }

    // Fallback: derive fiat from AE amount using currency rates
    return getFiat(aePrice);
  }, [aePrice, getFiat, price, token, currentCurrencyCode]);

  return (
    <PriceFormatter
      symbol={token.symbol}
      aePrice={aePrice}
      fiatPrice={fiatPrice}
      {...priceFormatterProps}
    />
  );
};

export default TokenPriceFormatter;
