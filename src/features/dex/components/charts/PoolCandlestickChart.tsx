import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { DexPairService } from '@/api/generated';
import WebSocketClient from '@/libs/WebSocketClient';
import PoolChartView from './PoolChartView';
import { poolAssetSymbol, poolCandles, poolQuotePosition } from './poolChartData';

interface PoolCandlestickChartProps {
  pairAddress: string;
  fromTokenAddress?: string;
  /** Plot height, excluding the compact controls. */
  height?: number;
  className?: string;
}

export const PoolCandlestickChart = ({
  pairAddress, fromTokenAddress, height = 208, className = '',
}: PoolCandlestickChartProps) => {
  const client = useQueryClient();
  const [interval, setInterval] = useState(3600);
  const [flippedPair, setFlippedPair] = useState<string | null>(null);
  const pairQuery = useQuery({
    queryKey: ['DexPairService.getPairByAddress', pairAddress],
    queryFn: async ({ signal }) => {
      const request = DexPairService.getPairByAddress({ address: pairAddress });
      const cancel = () => request.cancel();
      signal.addEventListener('abort', cancel, { once: true });
      try { return await request; } finally { signal.removeEventListener('abort', cancel); }
    },
    enabled: !!pairAddress,
  });
  const pair = pairQuery.data;
  const position = pair ? poolQuotePosition(pair, fromTokenAddress) : 'token0';
  const identity = `${pairAddress}:${position}`;
  const flipped = flippedPair === identity;
  const denomination = pair?.[position];
  const asset = pair?.[position === 'token0' ? 'token1' : 'token0'];
  const volumeSymbol = poolAssetSymbol(denomination);
  const queryKey = useMemo(
    () => ['PoolChartHistory', pairAddress, interval, position],
    [pairAddress, interval, position],
  );
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }): Promise<unknown[]> => {
      const request = DexPairService.getPaginatedHistory({
        address: pairAddress, interval, fromToken: position, convertTo: 'ae', limit: 100, page: pageParam,
      });
      const cancel = () => request.cancel();
      signal.addEventListener('abort', cancel, { once: true });
      try {
        const result: unknown = await request;
        if (!Array.isArray(result)) throw new Error('Invalid pool history response');
        return result;
      } finally { signal.removeEventListener('abort', cancel); }
    },
    enabled: !!pair,
    initialPageParam: 1,
    getNextPageParam: (page, pages) => (page.length >= 100 ? pages.length + 1 : undefined),
  });
  const candles = useMemo(
    () => poolCandles(pair ? query.data?.pages || [] : [], interval, volumeSymbol, flipped),
    [pair, query.data, interval, volumeSymbol, flipped],
  );
  useEffect(() => {
    if (!pairAddress) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (stopped || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (stopped) return;
        if (client.isFetching({ queryKey, exact: true })) { refresh(); return; }
        // Re-read indexed OHLCV rather than interpreting raw transaction payloads as candles.
        client.invalidateQueries({ queryKey, exact: true });
      }, 500);
    };
    const unsubscribe = WebSocketClient.subscribeForTokenHistories(`PairTransaction::${pairAddress}`, refresh);
    const disconnect = WebSocketClient.subscribeForConnection(refresh);
    return () => { stopped = true; clearTimeout(timer); unsubscribe(); disconnect(); };
  }, [pairAddress, queryKey, client]);
  const invalidData = !!query.data?.pages.some((page) => page.length) && !candles.length;
  return (
    <PoolChartView
      key={`${identity}:${interval}:${flipped}`}
      candles={candles}
      asset={flipped ? denomination : asset}
      denomination={flipped ? asset : denomination}
      volumeSymbol={volumeSymbol}
      interval={interval}
      onIntervalChange={setInterval}
      onFlip={() => setFlippedPair(flipped ? null : identity)}
      canFlip={!!pair}
      loading={pairQuery.isPending || query.isPending}
      error={pairQuery.isError || query.isError || invalidData}
      fetching={pairQuery.isFetching || query.isFetching}
      onRefresh={() => { if (pairQuery.isError) pairQuery.refetch(); else query.refetch(); }}
      hasOlder={query.hasNextPage}
      onLoadOlder={() => { if (!query.isFetching && query.hasNextPage) query.fetchNextPage(); }}
      height={height}
      className={className}
    />
  );
};
export default PoolCandlestickChart;
