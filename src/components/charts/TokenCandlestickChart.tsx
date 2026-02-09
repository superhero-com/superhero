import React, {
  useState, useRef, useEffect, useMemo, useCallback,
} from 'react';
import {
  ColorType,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { Encoded } from '@aeternity/aepp-sdk';
import moment from 'moment';
import { useInfiniteQuery } from '@tanstack/react-query';

import { TokenDto, TransactionHistoricalService } from '@/api/generated';
import { COIN_SYMBOL } from '@/utils/constants';
import { useChart } from '@/hooks/useChart';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';
import WebSocketClient from '@/libs/WebSocketClient';
import { cn } from '@/lib/utils';
import AeButton from '../AeButton';

interface IInterval {
  label: string;
  value: number;
}

interface TokenCandlestickChartProps {
  token: TokenDto;
  height?: number;
  className?: string;
}

interface CandlePrice {
  open: number;
  high: number;
  low: number;
  close: number;
}

const intervals: IInterval[] = [
  { label: '1m', value: 60 },
  { label: '5m', value: 5 * 60 },
  { label: '15m', value: 15 * 60 },
  { label: '1h', value: 60 * 60 },
  { label: '4h', value: 4 * 60 * 60 },
  { label: 'D', value: 24 * 60 * 60 },
  { label: 'W', value: 7 * 24 * 60 * 60 },
  { label: 'M', value: 31 * 24 * 60 * 60 },
];

//
export default function TokenCandlestickChart({
  token,
  height = 400,
  className = '',
}: TokenCandlestickChartProps) {
  const chartWrapper = useRef<HTMLDivElement>(null);
  const chartControls = useRef<HTMLDivElement>(null);
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false);
  const [intervalBy, setIntervalBy] = useState<IInterval>(intervals[1]); // Default to 5m

  // Chart series refs
  const candlestickSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const marketCapSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const touchHandlersCleanup = useRef<(() => void) | null>(null);

  // Current price data for legend
  const [currentCandlePrice, setCurrentCandlePrice] = useState<CandlePrice | null>(null);
  const [currentCandleVolume, setCurrentCandleVolume] = useState<number>(0);
  const [currentCandleMarketCap, setCurrentCandleMarketCap] = useState<number>(0);

  const { currentCurrencyInfo } = useCurrencies();
  const saleAddress = token?.sale_address;

  const convertTo = useMemo(
    () => (useCurrentCurrency
      ? currentCurrencyInfo.code.toLowerCase()
      : 'ae'),
    [useCurrentCurrency, currentCurrencyInfo],
  );

  // Infinite query for historical data
  const {
    data, fetchNextPage, isFetching, hasNextPage, refetch,
  } = useInfiniteQuery({
    queryKey: ['TokenCandlestick', saleAddress, intervalBy.value, convertTo],
    queryFn: ({ pageParam = 1 }) => TransactionHistoricalService.getPaginatedHistory({
      address: saleAddress as Encoded.ContractAddress,
      interval: intervalBy.value,
      convertTo: convertTo as any,
      page: pageParam,
      limit: 100,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length === 0) {
        return undefined;
      }
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: !!saleAddress,
  });

  // Calculate percentage change for current candle
  const currentCandleMovePercentage = useMemo(() => {
    if (!currentCandlePrice) return '0.00';
    const percentage = ((currentCandlePrice.close - currentCandlePrice.open) / currentCandlePrice.open) * 100;
    return percentage < 0.01 ? percentage.toFixed(3) : percentage.toFixed(2);
  }, [currentCandlePrice]);

  const isTrendingUp = useMemo(
    () => (currentCandlePrice ? currentCandlePrice.open <= currentCandlePrice.close : true),
    [currentCandlePrice],
  );

  // Chart setup
  const { chartContainer, chart } = useChart({
    height,
    chartOptions: {
      layout: {
        textColor: 'white',
        background: {
          topColor: 'rgba(0, 0, 0, 0.00)',
          bottomColor: 'rgba(0, 0, 0, 0.13)',
          type: ColorType.VerticalGradient,
        },
      },
      localization: {
        timeFormatter: (time: any) => moment.unix(time).format('MMM DD, HH:mm'),
      },
    },
    onChartReady: (chartInstance) => {
      // Setup candlestick series
      const _candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
        upColor: '#2BCC61',
        downColor: '#F5274E',
        borderVisible: false,
        wickUpColor: '#2BCC61',
        wickDownColor: '#F5274E',
        priceFormat: {
          type: 'custom',
          minMove: 0.00000001,
          formatter: (price) => `${price.toFixed(6)} ${convertTo.toUpperCase()}`,
        },
      });

      // Setup volume series
      const _volumeSeries = chartInstance.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'custom',
          formatter: () => '',
        },
        priceScaleId: 'volume',
      });

      // Setup market cap series
      const _marketCapSeries = chartInstance.addSeries(HistogramSeries, {
        visible: false,
        priceFormat: {
          type: 'custom',
          formatter: () => '',
        },
        priceScaleId: 'marketCap',
      });

      // Configure price scales
      chartInstance.priceScale('right').applyOptions({
        visible: true,
        borderColor: 'rgba(255,255,255, 0)',
      });

      chartInstance.timeScale().applyOptions({
        borderColor: 'rgba(255,255,255, 0.2)',
        rightOffset: 5,
        minBarSpacing: 10,
        timeVisible: true,
        secondsVisible: true,
      });

      _volumeSeries.priceScale().applyOptions({
        visible: false,
        scaleMargins: { top: 0.9, bottom: 0 },
      });

      _marketCapSeries.priceScale().applyOptions({
        visible: false,
        scaleMargins: { top: 0.2, bottom: 0.2 },
      });

      _candlestickSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.2, bottom: 0.2 },
      });

      // Handle crosshair moves
      chartInstance.subscribeCrosshairMove((param) => {
        if (param.time) {
          const candleData = param.seriesData.get(_candlestickSeries) as CandlePrice;
          const volumeData = param.seriesData.get(_volumeSeries) as any;
          const marketCapData = param.seriesData.get(_marketCapSeries) as any;

          setCurrentCandlePrice(candleData);
          setCurrentCandleVolume(volumeData?.value ?? 0);
          setCurrentCandleMarketCap(marketCapData?.value ?? 0);
        }
      });

      // Add touch handlers for mobile drag support
      const container = chartContainer.current;
      if (container) {
        const handleTouchStart = (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (!chartInstance || !container) return;

          const touch = e.touches[0];
          const rect = container.getBoundingClientRect();
          const x = touch.clientX - rect.left;

          try {
            const time = chartInstance.timeScale().coordinateToTime(x);
            if (time !== null) {
              chartInstance.setCrosshairPosition(x, 0, { time: time as any });
            }
          } catch (error) {
            console.warn('[TokenCandlestickChart] Error setting crosshair on touchstart:', error);
          }
        };

        const handleTouchMove = (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (!chartInstance || !container) return;

          const touch = e.touches[0];
          const rect = container.getBoundingClientRect();
          const x = touch.clientX - rect.left;

          // Clamp x to chart bounds
          const clampedX = Math.max(0, Math.min(x, rect.width));

          try {
            const time = chartInstance.timeScale().coordinateToTime(clampedX);
            if (time !== null) {
              chartInstance.setCrosshairPosition(clampedX, 0, { time: time as any });
            }
          } catch (error) {
            console.warn('[TokenCandlestickChart] Error setting crosshair on touchmove:', error);
          }
        };

        const handleTouchEnd = (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (!chartInstance) return;

          try {
            chartInstance.setCrosshairPosition(-1, -1, {});
          } catch (error) {
            console.warn('[TokenCandlestickChart] Error clearing crosshair on touchend:', error);
          }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });
        container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        // Store cleanup function
        touchHandlersCleanup.current = () => {
          container.removeEventListener('touchstart', handleTouchStart);
          container.removeEventListener('touchmove', handleTouchMove);
          container.removeEventListener('touchend', handleTouchEnd);
          container.removeEventListener('touchcancel', handleTouchEnd);
        };
      }

      // Handle visible range changes for infinite loading
      chartInstance.timeScale().subscribeVisibleLogicalRangeChange(() => {
        const logicalRange = chartInstance.timeScale().getVisibleLogicalRange();
        if (!logicalRange || isFetching) return;

        const candleData = _candlestickSeries.data();
        const barsInfo = _candlestickSeries.barsInLogicalRange(logicalRange);
        if (!barsInfo || !(barsInfo.barsBefore < 10) || !candleData.length) return;

        fetchNextPage();
      });

      // Store series references
      candlestickSeries.current = _candlestickSeries;
      volumeSeries.current = _volumeSeries;
      marketCapSeries.current = _marketCapSeries;

      // Load initial data if available
      if (data?.pages?.length) {
        updateSeriesData(data.pages);
      }
    },
  });

  // Update series data when data changes
  const updateSeriesData = useCallback((pages: any[]) => {
    if (!candlestickSeries.current || !volumeSeries.current || !marketCapSeries.current) return;

    // Merge all pages
    const newData = pages.reduce((acc, page) => [...acc, ...page], []);

    const formattedData = newData
      .map((item: any) => ({
        time: moment(item.timeClose).unix(),
        open: Number(item.quote.open),
        close: Number(item.quote.close),
        high: Number(item.quote.high),
        low: Number(item.quote.low),
        volume: item.quote.volume,
        market_cap: item.quote.market_cap,
      }))
      .sort((a, b) => a.time - b.time)
      .reduce((acc: any[], item) => {
        if (!acc.find((i) => i.time === item.time)) {
          acc.push(item);
        }
        return acc;
      }, []);

    candlestickSeries.current.setData(formattedData);

    const volumeData = formattedData.map((item, index) => {
      const previousItem = index > 0 ? formattedData[index - 1] : item;
      const isGreen = item.close > previousItem.close || item.close === item.open;

      return {
        time: item.time,
        value: item.volume,
        market_cap: Number(item.market_cap) ?? 0,
        color: index === 0 || isGreen ? '#2BCC61' : '#F5274E',
      };
    });

    volumeSeries.current.setData(volumeData);
    marketCapSeries.current.setData(
      volumeData.map((item) => ({
        ...item,
        value: item.market_cap,
      })),
    );

    if (formattedData.length < 100 && hasNextPage) {
      fetchNextPage();
    }

    if (!currentCandlePrice && formattedData.length > 0) {
      const lastCandle = formattedData[formattedData.length - 1];
      const lastVolume = volumeData[volumeData.length - 1];
      setCurrentCandlePrice(lastCandle);
      setCurrentCandleVolume(lastVolume?.value ?? 0);
      setCurrentCandleMarketCap(lastVolume?.market_cap ?? 0);
    }
  }, [currentCandlePrice, hasNextPage, fetchNextPage]);

  // Handle interval change
  const onChangeInterval = useCallback((interval: IInterval) => {
    setIntervalBy(interval);
    refetch();
  }, [refetch]);

  // Handle real-time updates via WebSocket
  useEffect(() => {
    if (!saleAddress) return;

    const unsubscribe = WebSocketClient.subscribeForTokenHistories(
      saleAddress,
      (tx: any) => {
        if (!candlestickSeries.current || !volumeSeries.current || !marketCapSeries.current) return;

        const currentData = candlestickSeries.current.data();
        const currentVolumeData = volumeSeries.current.data();
        const currentMarketCapData = marketCapSeries.current.data();

        const latestCandle = currentData.length > 0 ? currentData[currentData.length - 1] : null;
        const latestVolume = currentVolumeData.length > 0 ? currentVolumeData[currentVolumeData.length - 1] : null;
        const latestMarketCap = currentMarketCapData.length > 0 ? currentMarketCapData[currentMarketCapData.length - 1] : null;

        const currentPrice = Number(tx.data.buy_price[convertTo]);
        const currentTime = Math.floor(Date.now() / 1000);

        if (latestCandle && latestVolume && latestMarketCap
          && currentTime - (latestCandle.time as number) < intervalBy.value) {
          // Update existing candle
          const candleData = latestCandle as any;
          candlestickSeries.current.update({
            time: candleData.time,
            open: candleData.open,
            close: currentPrice,
            high: Math.max(candleData.high, currentPrice),
            low: Math.min(candleData.low, currentPrice),
          });

          const volumeData = latestVolume as any;
          const newVolume = volumeData.value + parseInt(tx.data.volume);
          const newMarketCap = Number(tx.data.market_cap[convertTo]);
          const previousCandle = currentData.length > 1 ? currentData[currentData.length - 2] as any : null;
          const isGreen = !previousCandle || previousCandle.close < currentPrice;

          volumeSeries.current.update({
            time: volumeData.time,
            value: newVolume,
            color: isGreen ? '#2BCC61' : '#F5274E',
          });

          const marketCapData = latestMarketCap as any;
          marketCapSeries.current.update({
            time: marketCapData.time,
            value: newMarketCap,
            color: isGreen ? '#2BCC61' : '#F5274E',
          });
        } else {
          // Create new candle
          const candleData = latestCandle as any;
          const previousClose = candleData ? candleData.close : currentPrice;

          candlestickSeries.current.update({
            time: currentTime as any,
            open: previousClose,
            close: currentPrice,
            high: currentPrice,
            low: currentPrice,
          });

          volumeSeries.current.update({
            time: currentTime as any,
            value: parseInt(tx.data.volume),
            color: '#2BCC61',
          });

          marketCapSeries.current.update({
            time: currentTime as any,
            value: Number(tx.data.market_cap[convertTo]),
            color: '#2BCC61',
          });
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [saleAddress, convertTo, intervalBy.value]);

  // Update data when dependencies change
  useEffect(() => {
    if (data?.pages?.length) {
      updateSeriesData(data.pages);
    }
  }, [data]);

  // Cleanup touch handlers when component unmounts or chart changes
  useEffect(() => () => {
    if (touchHandlersCleanup.current) {
      touchHandlersCleanup.current();
      touchHandlersCleanup.current = null;
    }
  }, [chart]);

  return (
    <div
      ref={chartWrapper}
      className={cn(
        'max-w-[100%] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden',
        className,
      )}
    >
      <div className="relative" style={{ height }}>
        <div ref={chartContainer} className="w-full h-full" />

        {/* Chart Info Overlay */}
        <div className="hidden sm:block absolute top-0 left-0 4 z-20 p-4 bg-gradient-to-b from-background/10 via-background/2 to-transparent backdrop-blur-sm">
          <div className="flex flex-wrap items-end gap-1 mb-2">
            <div className="text-lg font-bold text-foreground flex items-center gap-2">
              {token?.symbol}
              <span className="font-sans text-xl mx-1">/</span>
              {COIN_SYMBOL}
            </div>
            <div className="flex gap-1 pb-1 pl-2 text-xs text-muted-foreground">
              <div>on</div>
              <div>æternity</div>
              <div>·</div>
              <div>{intervalBy.label}</div>
            </div>
          </div>

          {currentCandlePrice && (
            <div className="text-sm">
              <div className="flex gap-4 flex-wrap mb-2">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">
                    O
                    {' '}
                    <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                      {currentCandlePrice.open.toFixed(6)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    H
                    {' '}
                    <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                      {currentCandlePrice.high.toFixed(6)}
                    </span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">
                    L
                    {' '}
                    <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                      {currentCandlePrice.low.toFixed(6)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    C
                    {' '}
                    <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                      {currentCandlePrice.close.toFixed(6)}
                    </span>
                  </span>
                </div>
                <div className="pl-2">
                  <span className={`font-bold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                    {isTrendingUp ? '+' : ''}
                    {(currentCandlePrice.close - currentCandlePrice.open).toFixed(6)}
                    {' '}
                    (
                    {isTrendingUp ? '+' : ''}
                    {currentCandleMovePercentage}
                    %)
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-muted-foreground">
                  Vol
                  {' '}
                  <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                    {currentCandleVolume ? Decimal.from(currentCandleVolume).shorten() : 0}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  MCap
                  {' '}
                  <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
                    {currentCandleMarketCap ? Decimal.from(currentCandleMarketCap).shorten() : 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Controls */}
      <div
        ref={chartControls}
        className="flex flex-row flex-wrap items-center justify-between p-2 border-t border-white/10 bg-white/[0.05] backdrop-blur-[10px]"
      >
        <div className="flex flex-row flex-wrap items-center gap-0 sm:gap-2">
          {intervals.map((interval) => (
            <AeButton
              key={interval.value}
              variant={intervalBy?.value === interval.value ? 'primary' : 'secondary-dark'}
              size="small"
              onClick={() => onChangeInterval(interval)}
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
              style={{
                minWidth: 32,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {interval.label}
            </AeButton>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-white/60 text-xs font-mono font-medium">
            {moment().format('HH:mm:ss')}
          </div>
        </div>
      </div>
    </div>
  );
}
