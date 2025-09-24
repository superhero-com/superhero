import React, { useMemo } from "react";
import { PriceDto } from "../../../api/generated";
import { Decimal } from "../../../libs/decimal";
import { useWallet } from "../../../hooks/useWallet";
import { useBackend } from "../../../hooks/useBackend";
import PriceFormatter from "./PriceFormatter";
import { toAe } from "@aeternity/aepp-sdk";
import { useCurrencies } from "@/hooks/useCurrencies";

interface PriceDataFormatterProps {
  priceData: PriceDto;
  bignumber?: boolean;
  row?: boolean;
  watchKey?: string;
  symbol?: string;
  watchPrice?: boolean;
  priceLoading?: boolean;
  hideFiatPrice?: boolean;
  hideSymbol?: boolean;
  className?: string;
}

/**
 * PriceDataFormatter - Formats price data from PriceDto into AE and fiat prices
 *
 * This component takes a PriceDto object and converts it to formatted prices
 * using the existing PriceFormatter component. It handles currency conversion
 * and proper decimal formatting.
 */
export default function PriceDataFormatter({
  priceData,
  bignumber = false,
  row = false,
  watchKey,
  symbol,
  watchPrice = true,
  priceLoading = false,
  hideFiatPrice = false,
  hideSymbol = false,
  className = "",
}: PriceDataFormatterProps) {
  const { currentCurrencyCode, getFiat } = useCurrencies();
  const { prices } = useBackend();

  const aePrice = useMemo(() => {
    if (!priceData?.ae) {
      return Decimal.ZERO;
    }

    // If bignumber is true, treat the ae value as being in aettos (big number format)
    // and convert to AE units. Otherwise, use the value directly.
    return bignumber
      ? Decimal.from(toAe(priceData.ae)) // Convert from aettos to AE
      : Decimal.from(priceData.ae);
  }, [priceData?.ae, bignumber]);

  const fiatPrice = useMemo(() => {
    if (!priceData?.ae) {
      return Decimal.ZERO;
    }

    if (!priceData[currentCurrencyCode]) {
      if (priceData["ae"]) {
        return getFiat(
          bignumber
            ? Decimal.from(toAe(priceData["ae"]))
            : Decimal.from(priceData["ae"])
        );
      }

      return Decimal.ZERO;
    }
    return bignumber
      ? Decimal.from(toAe(priceData[currentCurrencyCode]))
      : Decimal.from(priceData[currentCurrencyCode]);
  }, [priceData, currentCurrencyCode, bignumber, prices]);

  return (
    <PriceFormatter
      aePrice={aePrice}
      fiatPrice={fiatPrice}
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
