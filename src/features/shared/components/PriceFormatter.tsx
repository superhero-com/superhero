import React, { useState, useEffect } from 'react';
import { Decimal } from '../../../libs/decimal';
import SymbolPriceFormatter from './SymbolPriceFormatter';
import FiatPriceFormatter from './FiatPriceFormatter';

interface PriceFormatterProps {
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
}

const PRICE_CHANGE_DISPLAY_TIME = 1000;

export default function PriceFormatter({
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
}: PriceFormatterProps) {
  const [priceJustIncreased, setPriceJustIncreased] = useState(false);
  const [priceJustDecreased, setPriceJustDecreased] = useState(false);
  const [prevPrice, setPrevPrice] = useState<Decimal | null>(null);
  const [prevWatchKey, setPrevWatchKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!aePrice || !prevPrice || !watchPrice || watchKey !== prevWatchKey) {
      setPrevPrice(aePrice);
      setPrevWatchKey(watchKey);
      return;
    }

    if (aePrice.eq(prevPrice)) {
      return;
    }

    if (aePrice.gte(prevPrice)) {
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

    setPrevPrice(aePrice);
    setPrevWatchKey(watchKey);
  }, [aePrice, watchKey, watchPrice, prevPrice, prevWatchKey]);

  return (
    <div
      className={`price-formatter flex font-medium ${priceJustDecreased ? 'text-red-400'
        : priceJustIncreased ? 'text-green-400'
          : null
      } ${rowOnSm ? 'flex-row items-center gap-1' : 'flex-col'} ${className}`}
    >
      <SymbolPriceFormatter
        aePrice={aePrice}
        symbol={symbol}
        hideSymbol={hideSymbol}
        priceLoading={priceLoading}
        priceJustIncreased={priceJustIncreased}
        priceJustDecreased={priceJustDecreased}
        className="price"
      />
      {!hideFiatPrice && (
        <FiatPriceFormatter
          fiatPrice={fiatPrice}
          className={`fiat flex items-center gap-1 font-normal ${rowOnSm ? 'justify-end' : ''
          }`}
        />
      )}
    </div>
  );
}
