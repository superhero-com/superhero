import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { TokenDto, TransactionHistoricalService } from '@/api/generated';
import { useCurrencies } from '@/hooks/useCurrencies';
import WebSocketClient from '@/libs/WebSocketClient';
import TokenChartView from './TokenChartView';
import { tokenCandles } from './tokenChartData';

interface TokenCandlestickChartProps {
  token: TokenDto;
  height?: number;
  className?: string;
  noBackground?: boolean;
}

const TokenCandlestickChart = ({
  token, height = 318, className = '', noBackground = false,
}: TokenCandlestickChartProps) => {
  const [interval, setInterval] = useState(300);
  const [fiat, setFiat] = useState(false);
  const { currentCurrencyCode, currentCurrencyRate } = useCurrencies();
  const client = useQueryClient();
  const saleAddress = token?.sale_address;
  // The history endpoint has native USD/EUR quotes, but not CNY.
  const currentRateConversion = fiat && currentCurrencyCode === 'cny';
  const convertTo = fiat && currentCurrencyCode !== 'cny' ? currentCurrencyCode : 'ae';
  const quoteFactor = currentRateConversion ? currentCurrencyRate : 1;
  const queryKey = useMemo(
    () => ['TokenCandlestick', saleAddress, interval, convertTo],
    [saleAddress, interval, convertTo],
  );
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }): Promise<unknown[]> => {
      const request = TransactionHistoricalService.getPaginatedHistory({
        address: saleAddress!, interval, convertTo, page: pageParam, limit: 100,
      });
      const cancel = () => request.cancel();
      signal.addEventListener('abort', cancel, { once: true });
      try {
        const result: unknown = await request;
        if (!Array.isArray(result)) throw new Error('Invalid token history response');
        return result;
      } finally {
        signal.removeEventListener('abort', cancel);
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.length >= 100 ? pages.length + 1 : undefined),
    enabled: !!saleAddress,
  });
  const candles = useMemo(
    () => tokenCandles(query.data?.pages || [], interval, quoteFactor),
    [query.data, interval, quoteFactor],
  );

  useEffect(() => {
    if (!saleAddress) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (stopped || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (stopped) return;
        // Wait for any page request before refreshing so a just-indexed trade isn't missed.
        if (client.isFetching({ queryKey, exact: true })) {
          refresh();
          return;
        }
        client.invalidateQueries({ queryKey, exact: true });
      }, 500);
    };
    const unsubscribe = WebSocketClient.subscribeForTokenHistories(saleAddress, refresh);
    const disconnect = WebSocketClient.subscribeForConnection(refresh);
    return () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
      disconnect();
    };
  }, [saleAddress, queryKey, client]);

  const invalidData = !!query.data?.pages.some((page) => page.length) && !candles.length;
  return (
    <TokenChartView
      key={`${saleAddress}:${interval}:${convertTo}:${currentRateConversion}`}
      candles={candles}
      symbol={token.symbol || token.name}
      interval={interval}
      onIntervalChange={setInterval}
      quote={fiat ? currentCurrencyCode.toUpperCase() : 'AE'}
      fiatCode={currentCurrencyCode.toUpperCase()}
      fiat={fiat}
      onFiatChange={setFiat}
      currentRateConversion={currentRateConversion}
      loading={query.isPending && !!saleAddress}
      error={query.isError || invalidData || (currentRateConversion && quoteFactor <= 0)}
      fetching={query.isFetching}
      hasOlder={query.hasNextPage}
      onLoadOlder={() => { if (!query.isFetching && query.hasNextPage) query.fetchNextPage(); }}
      onRetry={() => { query.refetch(); }}
      height={height}
      className={className}
      noBackground={noBackground}
    />
  );
};

export default TokenCandlestickChart;
