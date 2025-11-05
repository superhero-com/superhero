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
  staleTime?: number;
  refetchInterval?: number | false;
  retry?: number | boolean;
}

/**
 * Hook to fetch the latest portfolio value for an account
 * Optimized to fetch only the current snapshot when no date range is provided
 */
export function usePortfolioValue({ 
  address, 
  convertTo,
  enabled = true,
  staleTime = 30_000, // 30 seconds default
  refetchInterval = 60_000, // 1 minute default
  retry = 2, // Retry failed requests up to 2 times
}: UsePortfolioValueOptions) {
  const { currentCurrencyInfo } = useCurrencies();
  
  // Default to current currency if convertTo is not specified
  const currency = useMemo(
    () => convertTo || currentCurrencyInfo.code.toLowerCase() as any,
    [convertTo, currentCurrencyInfo]
  );

  const { data, isLoading, error, refetch, isError, isFetching } = useQuery({
    queryKey: ['portfolio-value', address, currency],
    queryFn: async () => {
      if (!address) return null;
      
      try {
        // Optimized: Fetch current snapshot only (no date range = current snapshot)
        // This is more efficient than fetching a day's worth of data
        const response = await TrendminerApi.getAccountPortfolioHistory(address, {
          // No startDate/endDate = current snapshot only
          convertTo: currency,
        });
        
        const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
        
        // Return the first (and only) snapshot, or null if empty
        if (snapshots.length === 0) return null;
        
        // If multiple snapshots (shouldn't happen without date range, but handle gracefully)
        // Sort by timestamp descending and get the latest
        const latest = snapshots.length === 1 
          ? snapshots[0]
          : [...snapshots].sort((a, b) => 
              moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf()
            )[0];
        
        return latest;
      } catch (err) {
        // Enhanced error logging
        if (process.env.NODE_ENV === 'development') {
          console.error('[usePortfolioValue] Failed to fetch portfolio value:', {
            address,
            currency,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
    },
    enabled: enabled && !!address,
    staleTime,
    refetchInterval,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    gcTime: 5 * 60 * 1000, // Keep cached data for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  // Calculate the current value based on currency
  const currentValue = useMemo(() => {
    if (!data) return null;
    
    if (currency === 'ae') {
      return Decimal.from(data.total_value_ae);
    } else {
      // For fiat currencies, use total_value_usd if available (including zero values)
      // Note: total_value_usd contains the value converted to the requested currency (EUR, GBP, etc.), not just USD
      if (data.total_value_usd != null) {
        return Decimal.from(data.total_value_usd);
      }
      // Fallback to AE value (shouldn't happen if backend is working correctly)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[usePortfolioValue] Missing converted value, falling back to AE:', data);
      }
      return Decimal.from(data.total_value_ae);
    }
  }, [data, currency]);

  // Format the value for display
  const formattedValue = useMemo(() => {
    if (!currentValue) return null;
    
    try {
      if (currency === 'ae') {
        // Check if currentValue has prettify method (Decimal object)
        if (typeof currentValue.prettify === 'function') {
          return `${currentValue.prettify()} AE`;
        }
        // Fallback for plain numbers
        return `${Number(currentValue).toFixed(4)} AE`;
      } else {
        const currencyCode = currentCurrencyInfo.code.toUpperCase();
        // Safely convert to number
        const valueNumber = typeof currentValue.toNumber === 'function' 
          ? currentValue.toNumber()
          : typeof currentValue === 'number'
          ? currentValue
          : Number(currentValue);
        return valueNumber.toLocaleString('en-US', {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[usePortfolioValue] Error formatting value:', error, { currentValue, currency });
      }
      return null;
    }
  }, [currentValue, currency, currentCurrencyInfo]);

  return {
    value: currentValue,
    formattedValue,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    data, // Raw snapshot data
  };
}


