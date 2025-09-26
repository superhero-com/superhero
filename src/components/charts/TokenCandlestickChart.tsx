import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ColorType,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import { Encoded } from "@aeternity/aepp-sdk";
import moment from "moment";
import { useInfiniteQuery } from "@tanstack/react-query";

import { TokenDto, TransactionHistoricalService } from '@/api/generated';
import { COIN_SYMBOL, DATE_FULL } from '@/utils/constants';
import { CONFIG } from '@/config';
import { useChart } from '@/hooks/useChart';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';
import WebSocketClient from '@/libs/WebSocketClient';
import { Button } from '@/components/ui/button';
import ChartClock from './Partials/ChartClock';
import { cn } from '@/lib/utils';

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
  { label: "1m", value: 60 },
  { label: "5m", value: 5 * 60 },
  { label: "15m", value: 15 * 60 },
  { label: "1h", value: 60 * 60 },
  { label: "4h", value: 4 * 60 * 60 },
  { label: "D", value: 24 * 60 * 60 },
  { label: "W", value: 7 * 24 * 60 * 60 },
  { label: "M", value: 31 * 24 * 60 * 60 },
];

export default function TokenCandlestickChart({
  token,
  height = 400,
  className = '',
}: TokenCandlestickChartProps) {
  const chartWrapper = useRef<HTMLDivElement>(null);
  const chartControls = useRef<HTMLDivElement>(null);
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false);
  const [intervalBy, setIntervalBy] = useState<IInterval>(intervals[1]); // Default to 5m
  const [fullScreenMode, setFullScreenMode] = useState(false);

  // Chart series refs
  const candlestickSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const marketCapSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Current price data for legend
  const [currentCandlePrice, setCurrentCandlePrice] = useState<CandlePrice | null>(null);
  const [currentCandleVolume, setCurrentCandleVolume] = useState<number>(0);
  const [currentCandleMarketCap, setCurrentCandleMarketCap] = useState<number>(0);

  const { currentCurrencyInfo } = useCurrencies();
  const saleAddress = token?.sale_address;
  const isSmallScreen = window.innerWidth <= 960;

  const convertTo = useMemo(() => 
    useCurrentCurrency 
      ? currentCurrencyInfo.code.toLowerCase() 
      : "ae",
    [useCurrentCurrency, currentCurrencyInfo]
  );

  // Infinite query for historical data
  const { data, fetchNextPage, isFetching, hasNextPage, refetch } = useInfiniteQuery({
    queryKey: ["TokenCandlestick", saleAddress, intervalBy.value, convertTo],
    queryFn: ({ pageParam = 1 }) => {
      return TransactionHistoricalService.getPaginatedHistory({
        address: saleAddress as Encoded.ContractAddress,
        interval: intervalBy.value,
        convertTo: convertTo as any,
        page: pageParam,
        limit: 100,
      });
    },
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

  const isTrendingUp = useMemo(() => 
    currentCandlePrice ? currentCandlePrice.open <= currentCandlePrice.close : true,
    [currentCandlePrice]
  );

  // Chart setup
  const { chartContainer, chart } = useChart({
    height,
    chartOptions: {
      layout: {
        textColor: "white",
        background: {
          topColor: "rgba(0, 0, 0, 0.00)",
          bottomColor: "rgba(0, 0, 0, 0.03)",
          type: ColorType.VerticalGradient,
        },
      },
      localization: {
        timeFormatter: (time) => moment.unix(time as number).format(DATE_FULL),
      },
    },
    onChartReady: (chartInstance) => {
      // Setup candlestick series
      const _candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
        upColor: "#2BCC61",
        downColor: "#F5274E",
        borderVisible: false,
        wickUpColor: "#2BCC61",
        wickDownColor: "#F5274E",
        priceFormat: {
          type: "custom",
          minMove: 0.00000001,
          formatter: (price) => `${price.toFixed(6)} ${convertTo.toUpperCase()}`,
        },
      });

      // Setup volume series
      const _volumeSeries = chartInstance.addSeries(HistogramSeries, {
        priceFormat: {
          type: "custom",
          formatter: () => "",
        },
        priceScaleId: "volume",
      });

      // Setup market cap series
      const _marketCapSeries = chartInstance.addSeries(HistogramSeries, {
        visible: false,
        priceFormat: {
          type: "custom",
          formatter: () => "",
        },
        priceScaleId: "marketCap",
      });

      // Configure price scales
      chartInstance.priceScale("right").applyOptions({
        visible: true,
        borderColor: "rgba(255,255,255, 0)",
      });

      chartInstance.timeScale().applyOptions({
        borderColor: "rgba(255,255,255, 0.2)",
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
        if (!acc.find(i => i.time === item.time)) {
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
        color: index === 0 || isGreen ? "#238444" : "#9D2138",
      };
    });

    volumeSeries.current.setData(volumeData);
    marketCapSeries.current.setData(
      volumeData.map(item => ({
        ...item,
        value: item.market_cap,
      }))
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

  // Handle fullscreen toggle
  const toggleFullScreen = useCallback(async () => {
    const elem = chartWrapper.current;
    const dimensions = chartControls.current?.getBoundingClientRect();

    if (!elem || !dimensions) return;

    if (fullScreenMode) {
      setFullScreenMode(false);
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } else {
      setFullScreenMode(true);
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }

      setTimeout(() => {
        if (chart) {
          chart.applyOptions({
            height: window.innerHeight - dimensions.height,
          });
          chart.timeScale().resetTimeScale();
          chart.timeScale().fitContent();
        }
      }, 100);
    }
  }, [fullScreenMode, chart]);

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

        if (latestCandle && latestVolume && latestMarketCap && 
            currentTime - (latestCandle.time as number) < intervalBy.value) {
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
            color: isGreen ? "#238444" : "#9D2138",
          });

          const marketCapData = latestMarketCap as any;
          marketCapSeries.current.update({
            time: marketCapData.time,
            value: newMarketCap,
            color: isGreen ? "#238444" : "#9D2138",
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
            color: "#238444",
          });

          marketCapSeries.current.update({
            time: currentTime as any,
            value: Number(tx.data.market_cap[convertTo]),
            color: "#238444",
          });
        }
      }
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
  }, [data, updateSeriesData]);

  return (
    <div
      ref={chartWrapper}
      className={cn(
        "relative bg-[var(--secondary-color)] rounded-lg",
        isSmallScreen && "text-sm",
        className
      )}
    >
      <div className="chart-container relative h-full">
        <div ref={chartContainer} className="lw-chart h-full rounded-md relative">
          {/* Chart Info Overlay */}
          <div
            className={cn(
              "absolute z-20 top-0 left-0 right-24 pt-4 pl-4",
              "bg-gradient-to-b from-[var(--secondary-color)] via-[var(--secondary-color)]/75 to-transparent",
              isSmallScreen && "relative bg-none"
            )}
          >
            {/* Token Name */}
            <div className="flex flex-wrap items-end gap-1 leading-5">
              <div className="text-base font-bold">
                {token?.symbol}<span className="font-sans text-xl mx-1">/</span>{COIN_SYMBOL}
              </div>
              <div className="flex gap-1 pb-0.5 text-sm text-gray-400">
                <span>on</span>
                <span>Æternity</span>
                <span>·</span>
                <span>{intervalBy.label}</span>
              </div>
            </div>

            {/* Price Legends */}
            {currentCandlePrice && (
              <div className={cn("mt-2 text-sm", isSmallScreen && "text-xs")}>
                <div className="flex gap-1 flex-col sm:flex-row flex-wrap">
                  <div className="flex gap-1">
                    <div>
                      O <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                        {currentCandlePrice.open.toFixed(6)}
                      </span>
                    </div>
                    <div>
                      H <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                        {currentCandlePrice.high.toFixed(6)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div>
                      L <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                        {currentCandlePrice.low.toFixed(6)}
                      </span>
                    </div>
                    <div>
                      C <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                        {currentCandlePrice.close.toFixed(6)}
                      </span>
                    </div>
                  </div>
                  <div className="pl-1">
                    <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                      {isTrendingUp ? "+" : ""}{(currentCandlePrice.close - currentCandlePrice.open).toFixed(6)} 
                      ({isTrendingUp ? "+" : ""}{currentCandleMovePercentage}%)
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <div>
                    Vol <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
                      {currentCandleVolume ? Decimal.from(currentCandleVolume).shorten() : 0}
                    </span>
                  </div>
                  <div>
                    MC <span className={isTrendingUp ? "text-green-400" : "text-red-400"}>
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
          className={cn(
            "flex pl-2 pb-1 border-t pt-1",
            !isSmallScreen 
              ? "flex-row items-center flex-wrap gap-2 justify-between"
              : "px-2 flex-col flex-col-reverse"
          )}
        >
          {/* Interval Buttons */}
          <div className="flex flex-wrap items-center">
            {intervals.map((interval) => (
              <Button
                key={interval.value}
                variant={intervalBy?.value === interval.value ? "default" : "ghost"}
                size="sm"
                className="pl-0 text-xs"
                onClick={() => onChangeInterval(interval)}
              >
                {interval.label}
              </Button>
            ))}
          </div>

          {/* Right Controls */}
          <div
            className={cn(
              "flex items-center gap-1",
              isSmallScreen 
                ? "justify-between" 
                : "pr-4"
            )}
          >
            <ChartClock className={cn("text-sm", !isSmallScreen && "px-2")} />
            {!isSmallScreen && <div className="text-gray-500">|</div>}
            
            <Button
              variant="ghost"
              size="sm"
              className="text-sm py-0 uppercase"
              onClick={() => setUseCurrentCurrency(!useCurrentCurrency)}
            >
              <span className={!useCurrentCurrency ? "text-primary font-bold" : ""}>
                {COIN_SYMBOL}
              </span>
              /<span className={useCurrentCurrency ? "text-primary font-bold" : ""}>
                {currentCurrencyInfo.code}
              </span>
            </Button>

            {!isSmallScreen && (
              <Button
                variant="ghost"
                size="sm"
                className="text-sm py-0"
                onClick={toggleFullScreen}
              >
                {fullScreenMode ? "⛶" : "⛶"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}