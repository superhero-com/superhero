import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import { ColorType, CandlestickSeries, ISeriesApi } from 'lightweight-charts';
import { Encoded } from '@aeternity/aepp-sdk';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';

import { TokenDto, TransactionHistoricalService } from '@/api/generated';
import { useChart } from '@/hooks/useChart';

// A compact, read-only candlestick for the advanced token-tag row. The full
// TokenCandlestickChart is a detail-page widget — interval switcher, live clock, websocket
// updates and an overlay positioned above its own box — none of which belongs inline in a
// feed post, so this renders only the series over a fixed recent window. Same data source
// (TransactionHistoricalService) and same up/down inks as the detail chart.
const UP = '#2BCC61';
const DOWN = '#F5274E';
const DAILY = 24 * 60 * 60; // one candle per day
const WINDOW = 60; // last ~60 days, enough to read a trend at this size

interface TokenTagCandleChartProps {
  token: TokenDto;
  height?: number;
  className?: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const TokenTagCandleChart = ({ token, height = 72, className = '' }: TokenTagCandleChartProps) => {
  const saleAddress = token?.sale_address;
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const { data } = useQuery({
    queryKey: ['token-tag-candles', saleAddress, DAILY],
    queryFn: () => TransactionHistoricalService.getPaginatedHistory({
      address: saleAddress as Encoded.ContractAddress,
      interval: DAILY,
      convertTo: 'ae' as any,
      page: 1,
      limit: WINDOW,
    }),
    enabled: Boolean(saleAddress),
    staleTime: 60 * 1000,
    retry: false,
  });

  const candles = useMemo<Candle[]>(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map((item: any) => ({
        time: moment(item.timeClose).unix(),
        open: Number(item.quote?.open),
        high: Number(item.quote?.high),
        low: Number(item.quote?.low),
        close: Number(item.quote?.close),
      }))
      .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close))
      .sort((a, b) => a.time - b.time)
      .reduce<Candle[]>((acc, c) => {
        if (!acc.some((x) => x.time === c.time)) acc.push(c);
        return acc;
      }, []);
  }, [data]);

  const paint = useCallback((series: ISeriesApi<'Candlestick'>, points: Candle[]) => {
    series.setData(points as any);
  }, []);

  const { chartContainer, chart } = useChart({
    height,
    chartOptions: {
      handleScroll: false,
      handleScale: false,
      leftPriceScale: { visible: false },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
      grid: { horzLines: { visible: false }, vertLines: { visible: false } },
      layout: { background: { color: 'transparent', type: ColorType.Solid } },
    },
    onChartReady: (instance) => {
      const series = instance.addSeries(CandlestickSeries, {
        upColor: UP,
        downColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
        borderVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      seriesRef.current = series;
      if (candles.length) {
        paint(series, candles);
        instance.timeScale().fitContent();
      }
    },
  });

  // Re-paint whenever the data arrives after the chart, or the series is rebuilt.
  useEffect(() => {
    if (!chart || !seriesRef.current || !candles.length) return;
    paint(seriesRef.current, candles);
    chart.timeScale().fitContent();
  }, [chart, candles, paint]);

  return <div ref={chartContainer} className={className} style={{ height }} aria-hidden="true" />;
};

export default TokenTagCandleChart;
