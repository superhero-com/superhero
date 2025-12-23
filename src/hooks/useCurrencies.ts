import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toAe } from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { PriceDto } from '../api/generated';
import { Decimal } from '../libs/decimal';
import { SuperheroApi } from '../api/backend';
import { selectedCurrencyAtom } from '../atoms/walletAtoms';
import { CoinGeckoMarketResponse } from '../libs/CoinGecko';
import { CURRENCIES } from '../utils/constants';
import { ICurrency, CurrencyCode as AllCurrencyCode, CurrencyRates } from '../utils/types';

// Create atoms for currency data state management (similar to Vue stores)
const aeternityDataAtom = atomWithStorage<CoinGeckoMarketResponse | null>('currency:aeternity-data', null);
const currencyRatesAtom = atomWithStorage<CurrencyRates>('currency:rates', {});

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
  const [aeternityData, setAeternityData] = useAtom(aeternityDataAtom);
  const [currencyRates, setCurrencyRates] = useAtom(currencyRatesAtom);



  // Fetch currency rates from backend API
  const { isLoading: isLoadingRates, refetch: refetchRates } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      const rates = await SuperheroApi.getCurrencyRates();
      if (rates) {
        setCurrencyRates(rates);
      }
      return rates;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false, // Disable refetch on window focus - refetchInterval handles updates
  });

  // Fetch detailed Aeternity market data from backend API
  const { isLoading: isLoadingAeternityData, refetch: refetchAeternityData } = useQuery({
    queryKey: ['aeternity-data', currentCurrencyCode],
    queryFn: async () => {
      const data = await SuperheroApi.getMarketData(currentCurrencyCode);
      if (data) {
        setAeternityData(data);
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false, // Disable refetch on window focus - refetchInterval handles updates
  });

  const isLoadingPrice =  isLoadingRates || isLoadingAeternityData;

  const currentCurrencyRate = useMemo(
    (): number => currencyRates?.[currentCurrencyCode] || 0,
    [currencyRates, currentCurrencyCode]
  );

  const currentCurrencyInfo = useMemo(
    (): ICurrency => CURRENCIES.find(({ code }) => code === currentCurrencyCode)!,
    [currentCurrencyCode]
  );

  // Load functions that match the Vue composable
  const loadAeternityData = useCallback(async () => {
    const data = await SuperheroApi.getMarketData(currentCurrencyCode);
    if (data) {
      setAeternityData(data);
    }
    return data;
  }, [currentCurrencyCode, setAeternityData]);

  const loadCurrencyRates = useCallback(async () => {
    const rates = await SuperheroApi.getCurrencyRates();
    if (rates) {
      setCurrencyRates(rates);
    }
    return rates;
  }, [setCurrencyRates]);

  const setCurrentCurrency = useCallback((currency: AllCurrencyCode) => {
    // Only set if the currency is supported by the wallet atom
    const supportedCurrencies = ['usd', 'eur', 'cny'] as const;
    if (supportedCurrencies.includes(currency as any)) {
      setCurrentCurrencyCode(currency as any);
      // Trigger a refetch of data when currency changes
      loadAeternityData();
    }
  }, [setCurrentCurrencyCode, loadAeternityData]);

  /**
   * Formats a value as currency according to the current currency settings
   * @param value - Decimal value to format
   * @returns Formatted currency string (e.g., "$ 25,269.00")
   */
  const formatCurrency = useCallback((value: Decimal): string => {
    return `${currentCurrencyInfo.symbol} ${value.moneyPrettify()}`;
  }, [currentCurrencyInfo.symbol]);

  /**
   * Converts AE amount to fiat currency
   * @param value - AE amount as Decimal
   * @returns Converted fiat amount as Decimal
   */
  const getFiat = useCallback((value: Decimal): Decimal => {
    return value?.mul(currentCurrencyRate);
  }, [currentCurrencyRate]);

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
  const getFormattedFiat = useCallback((value: Decimal): string => {
    return formatCurrency(getFiat(value));
  }, [formatCurrency, getFiat]);

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
    // Data (matching Vue composable structure)
    aeternityData,
    currencyRates,
    currentCurrencyCode,
    currentCurrencyInfo,
    currentCurrencyRate,
    isLoadingPrice,

    // Actions (matching Vue composable methods)
    loadAeternityData,
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
