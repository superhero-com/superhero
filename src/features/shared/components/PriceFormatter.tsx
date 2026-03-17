import React, { useState, useEffect, useRef } from 'react';
import { Decimal } from '../../../libs/decimal';
import SymbolPriceFormatter from './SymbolPriceFormatter';
import FiatPriceFormatter from './FiatPriceFormatter';

export interface PriceFormatterProps {
  aePrice: Decimal;
  fiatPrice: Decimal;
  symbol?: string;
  watchPrice?: boolean;
  watchKey?: string;
  priceLoading?: boolean;
  hideFiatPrice?: boolean;
  hideSymbol?: boolean;
  rowOnSm?: boolean;
  className?: string;

  symbolTextClassName?: string;
  fiatPriceTextClassName?: string;
}

const PRICE_CHANGE_DISPLAY_TIME = 1000;

const PriceFormatter = ({
  aePrice,
  fiatPrice,
  symbol,
  watchPrice = true,
  watchKey,
  priceLoading = false,
  hideFiatPrice = false,
  hideSymbol = false,
  rowOnSm = false,
  className = '',
  symbolTextClassName = '',
  fiatPriceTextClassName = '',
}: PriceFormatterProps) => {
  const [priceJustIncreased, setPriceJustIncreased] = useState(false);
  const [priceJustDecreased, setPriceJustDecreased] = useState(false);
  const prevPriceRef = useRef<Decimal | null>(null);
  const prevWatchKeyRef = useRef<string | undefined>(undefined);
  let priceChangeClass = '';
  if (priceJustDecreased) {
    priceChangeClass = 'text-red-400';
  } else if (priceJustIncreased) {
    priceChangeClass = 'text-green-400';
  }

  useEffect(() => {
    if (!aePrice || !prevPriceRef.current || !watchPrice || watchKey !== prevWatchKeyRef.current) {
      prevPriceRef.current = aePrice;
      prevWatchKeyRef.current = watchKey;
      return;
    }

    if (aePrice.eq(prevPriceRef.current)) {
      return;
    }

    if (aePrice.gte(prevPriceRef.current)) {
      setPriceJustIncreased(true);
      setTimeout(() => {
        setPriceJustIncreased(false);
      }, PRICE_CHANGE_DISPLAY_TIME);
    } else {
      setPriceJustDecreased(true);
      setTimeout(() => {
        setPriceJustDecreased(false);
      }, PRICE_CHANGE_DISPLAY_TIME);
    }

    prevPriceRef.current = aePrice;
    prevWatchKeyRef.current = watchKey;
  }, [aePrice, watchKey, watchPrice]);

  return (
    <div
      className={`price-formatter flex font-medium ${priceChangeClass} ${rowOnSm ? 'flex-row items-center gap-1' : 'flex-col'} ${className}`}
    >
      <SymbolPriceFormatter
        aePrice={aePrice}
        symbol={symbol}
        hideSymbol={hideSymbol}
        priceLoading={priceLoading}
        priceJustIncreased={priceJustIncreased}
        priceJustDecreased={priceJustDecreased}
        className="price"
        textClassName={symbolTextClassName}
      />
      {!hideFiatPrice && (
        <FiatPriceFormatter
          fiatPrice={fiatPrice}
          className={`fiat flex items-center gap-1 font-normal ${rowOnSm ? 'justify-end' : ''}`}
          textClassName={fiatPriceTextClassName}
        />
      )}
    </div>
  );
};

export default PriceFormatter;
