import { useMemo, useCallback } from 'react';
import { toAe } from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';

import { PriceDto } from '../api/generated';
import { Decimal } from '../libs/decimal';
import { SuperheroApi } from '../api/backend';
import { selectedCurrencyAtom } from '../atoms/walletAtoms';
import { currencyRatesAtom, currencyRatesLastErrorAtAtom, currencyRatesUpdatedAtAtom } from '../atoms/currencyAtoms';
import { CURRENCIES } from '../utils/constants';
import { ICurrency, CurrencyCode as AllCurrencyCode } from '../utils/types';

/**
 * useCurrencies - React hook for currency management and conversion
 *
 * This hook provides functionality equivalent to the Vue composable:
 * - Managing current currency selection
 * - Fetching AE price data from backend API
 * - Converting AE amounts to fiat currencies
 * - Formatting currency values
 * - Loading currency rates and market data
 *
 * @returns Object with currency data, rates, and utility functions
 */
export function useCurrencies() {
  const [currentCurrencyCode, setCurrentCurrencyCode] = useAtom(selectedCurrencyAtom);
  const [currencyRates, setCurrencyRates] = useAtom(currencyRatesAtom);
  const [, setRatesUpdatedAt] = useAtom(currencyRatesUpdatedAtAtom);
  const [, setRatesLastErrorAt] = useAtom(currencyRatesLastErrorAtAtom);

  // Rates are polled globally by AePricePollingProvider.
  const isLoadingRates = !currencyRates || currencyRates[currentCurrencyCode] == null;
  const isLoadingPrice = isLoadingRates;

  const currentCurrencyRate = useMemo(
    (): number => currencyRates?.[currentCurrencyCode] || 0,
    [currencyRates, currentCurrencyCode],
  );

  const currentCurrencyInfo = useMemo(
    (): ICurrency => CURRENCIES.find(({ code }) => code === currentCurrencyCode)!,
    [currentCurrencyCode],
  );

  const loadCurrencyRates = useCallback(async () => {
    // Rates are normally handled by AePricePollingProvider, but keep this as an imperative fallback.
    try {
      const raw = await SuperheroApi.getCurrencyRates();
      if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
        throw new Error('Invalid currency rates response');
      }

      // normalize keys to lowercase and keep only finite numbers
      const normalized = Object.fromEntries(
        Object.entries(raw)
          .map(([k, v]) => [String(k).toLowerCase(), Number(v)])
          .filter(([, v]) => Number.isFinite(v)),
      );

      if (Object.keys(normalized).length === 0) {
        throw new Error('Invalid currency rates response');
      }

      setCurrencyRates(normalized as any);
      setRatesUpdatedAt(Date.now());
      setRatesLastErrorAt(0);
      return normalized;
    } catch (e) {
      setRatesLastErrorAt(Date.now());
      throw e;
    }
  }, [setCurrencyRates, setRatesLastErrorAt, setRatesUpdatedAt]);

  const setCurrentCurrency = useCallback((currency: AllCurrencyCode) => {
    // Only set if the currency is supported by the wallet atom
    const supportedCurrencies = ['usd', 'eur', 'cny'] as const;
    if (supportedCurrencies.includes(currency as any)) {
      setCurrentCurrencyCode(currency as any);
    }
  }, [setCurrentCurrencyCode]);

  /**
   * Formats a value as currency according to the current currency settings
   * @param value - Decimal value to format
   * @returns Formatted currency string (e.g., "$ 25,269.00")
   */
  const formatCurrency = useCallback((value: Decimal): string => `${currentCurrencyInfo.symbol} ${value.moneyPrettify()}`, [currentCurrencyInfo.symbol]);

  /**
   * Converts AE amount to fiat currency
   * @param value - AE amount as Decimal
   * @returns Converted fiat amount as Decimal
   */
  const getFiat = useCallback((value: Decimal): Decimal => value?.mul(currentCurrencyRate), [currentCurrencyRate]);

  /**
   * Gets formatted fiat value from PriceDto for current active currency
   * @param value - PriceDto object
   * @returns Formatted currency string or null
   */
  const getFormattedActiveCurrencyFiat = useCallback((value: PriceDto): string | null => {
    if (!value) {
      return null;
    }
    return formatCurrency(Decimal.from(value[currentCurrencyCode as keyof PriceDto] || 0));
  }, [formatCurrency, currentCurrencyCode]);

  /**
   * Gets formatted fiat value from PriceDto (treating values as big numbers)
   * @param value - PriceDto object with big number values
   * @returns Formatted currency string or null
   */
  const getFormattedBigNumberFiat = useCallback((value: PriceDto): string | null => {
    if (!value) {
      return null;
    }
    const currencyValue = value[currentCurrencyCode as keyof PriceDto];
    if (!currencyValue) {
      return null;
    }
    return formatCurrency(Decimal.from(toAe(currencyValue)));
  }, [formatCurrency, currentCurrencyCode]);

  /**
   * Converts AE amount to fiat and formats as currency
   * @param value - AE amount as Decimal
   * @returns Formatted currency string
   */
  const getFormattedFiat = useCallback((value: Decimal): string => formatCurrency(getFiat(value)), [formatCurrency, getFiat]);

  /**
   * Like getFormattedFiat but rounds small fractions to avoid displaying tiny amounts
   * @param value - AE amount as Decimal
   * @returns Formatted currency string with rounding for small amounts
   */
  const getFormattedAndRoundedFiat = useCallback((value: Decimal): string => {
    if (!currentCurrencyRate || value === Decimal.ZERO) {
      return formatCurrency(Decimal.ZERO);
    }
    const converted = getFiat(value);

    return converted.lt(Decimal.from(0.01))
      ? `<${formatCurrency(Decimal.from(0.01))}`
      : formatCurrency(converted);
  }, [currentCurrencyRate, formatCurrency, getFiat]);

  return {
    currencyRates,
    currentCurrencyCode,
    currentCurrencyInfo,
    currentCurrencyRate,
    isLoadingPrice,

    // Actions (matching Vue composable methods)
    loadCurrencyRates,
    setCurrentCurrency,

    // Formatting utilities (matching Vue composable methods)
    formatCurrency,
    getFiat,
    getFormattedFiat,
    getFormattedAndRoundedFiat,
    getFormattedActiveCurrencyFiat,
    getFormattedBigNumberFiat,
  };
}
