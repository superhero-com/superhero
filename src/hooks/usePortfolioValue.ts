import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import moment from 'moment';
import { TrendminerApi } from '@/api/backend';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';

interface PortfolioSnapshot {
  timestamp: string | Date;
  total_value_ae: number;
  ae_balance: number;
  tokens_value_ae: number;
  total_value_usd?: number;
}

interface UsePortfolioValueOptions {
  address: string | null | undefined;
  convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau';
  enabled?: boolean;
}

/**
 * Hook to fetch the latest portfolio value for an account
 */
export function usePortfolioValue({ 
  address, 
  convertTo,
  enabled = true 
}: UsePortfolioValueOptions) {
  const { currentCurrencyInfo } = useCurrencies();
  
  // Default to current currency if convertTo is not specified
  const currency = useMemo(
    () => convertTo || currentCurrencyInfo.code.toLowerCase() as any,
    [convertTo, currentCurrencyInfo]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio-value', address, currency],
    queryFn: async () => {
      if (!address) return null;
      
      // Fetch just the latest snapshot by requesting a small date range
      const endDate = moment();
      const startDate = moment().subtract(1, 'day'); // Just need latest snapshot
      
      const response = await TrendminerApi.getAccountPortfolioHistory(address, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: 86400, // Daily interval
        convertTo: currency,
      });
      
      const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
      
      // Return the latest snapshot (should be the last one)
      if (snapshots.length === 0) return null;
      
      // Sort by timestamp descending and get the latest
      const latest = [...snapshots].sort((a, b) => 
        moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf()
      )[0];
      
      return latest;
    },
    enabled: enabled && !!address,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });

  // Calculate the current value based on currency
  const currentValue = useMemo(() => {
    if (!data) return null;
    
    if (currency === 'ae') {
      return Decimal.from(data.total_value_ae);
    } else {
      // For fiat currencies, use total_value_usd if available
      if (data.total_value_usd != null && data.total_value_usd > 0) {
        return Decimal.from(data.total_value_usd);
      }
      // Fallback to AE value (shouldn't happen if backend is working correctly)
      return Decimal.from(data.total_value_ae);
    }
  }, [data, currency]);

  // Format the value for display
  const formattedValue = useMemo(() => {
    if (!currentValue) return null;
    
    if (currency === 'ae') {
      return `${currentValue.prettify()} AE`;
    } else {
      const currencyCode = currentCurrencyInfo.code.toUpperCase();
      const valueNumber = currentValue.toNumber();
      return valueNumber.toLocaleString('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }, [currentValue, currency, currentCurrencyInfo]);

  return {
    value: currentValue,
    formattedValue,
    isLoading,
    error,
    refetch,
    data, // Raw snapshot data
  };
}


