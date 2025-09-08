import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
} from 'lightweight-charts';
import { useChart } from '../../../../hooks/useChart';
import AeButton from '../../../../components/AeButton';
import { DexService } from '../../../../api/generated/services/DexService';
import WebSocketClient from '../../../../libs/WebSocketClient';
import moment from 'moment';

interface PoolCandlestickChartProps {
  pairAddress: string;
  height?: number;
  className?: string;
}

interface Interval {
  label: string;
  value: number;
}

interface CandlePrice {
  open: number;
  high: number;
  low: number;
  close: number;
}

const intervals: Interval[] = [
  { label: '1m', value: 60 },
  { label: '5m', value: 5 * 60 },
  { label: '15m', value: 15 * 60 },
  { label: '1h', value: 60 * 60 },
  { label: '4h', value: 4 * 60 * 60 },
  { label: 'D', value: 24 * 60 * 60 },
  { label: 'W', value: 7 * 24 * 60 * 60 },
  { label: 'M', value: 31 * 24 * 60 * 60 },
];

export function PoolCandlestickChart({
  pairAddress,
  height = 400,
  className = '',
}: PoolCandlestickChartProps) {
  const [intervalBy, setIntervalBy] = useState<Interval>(intervals[3]); // Default to 1h
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false);
  const [currentCandlePrice, setCurrentCandlePrice] = useState<CandlePrice | null>(null);
  const [currentCandleVolume, setCurrentCandleVolume] = useState<number>(0);
  const [currentCandleMarketCap, setCurrentCandleMarketCap] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const candlestickSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const marketCapSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const subscription = useRef<(() => void) | null>(null);

  const convertTo = useMemo(() => 
    useCurrentCurrency ? 'usd' : 'ae',
    [useCurrentCurrency]
  );

  const currentCandleMovePercentage = useMemo(() => {
    if (!currentCandlePrice) return '0.00';
    const percentage = 
      Number((currentCandlePrice.close - currentCandlePrice.open) / currentCandlePrice.open) * 100;
    
    if (Math.abs(percentage) < 0.01) {
      return percentage.toFixed(3);
    }
    return percentage.toFixed(2);
  }, [currentCandlePrice]);

  const isTrendingUp = useMemo(
    () => currentCandlePrice ? currentCandlePrice.open <= currentCandlePrice.close : false,
    [currentCandlePrice]
  );

  const fetchHistoricalData = useCallback(async () => {
    if (!pairAddress) return;
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      const result = await DexService.getPaginatedHistory({
        address: pairAddress,
        interval: intervalBy.value,
        convertTo: convertTo as any,
        limit: 100,
        page: 1,
        });

        if (result && Array.isArray(result)) {
        updateSeriesData([result]);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pairAddress, intervalBy.value, convertTo]);

  // Helper function to safely clamp large numbers for lightweight-charts
  const clampValue = (value: number): number => {
    const MAX_SAFE_VALUE = 90071992547409.91;
    if (!isFinite(value) || isNaN(value)) return 0;
    if (value > MAX_SAFE_VALUE) return MAX_SAFE_VALUE;
    if (value < -MAX_SAFE_VALUE) return -MAX_SAFE_VALUE;
    return value;
  };

  // Helper function to format large numbers for display
  const formatLargeNumber = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return '0';
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1e18) {
      return `${sign}${(absValue / 1e18).toFixed(2)}E`;
    } else if (absValue >= 1e15) {
      return `${sign}${(absValue / 1e15).toFixed(2)}P`;
    } else if (absValue >= 1e12) {
      return `${sign}${(absValue / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
      return `${sign}${(absValue / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      return `${sign}${(absValue / 1e6).toFixed(2)}M`;
    } else if (absValue >= 1e3) {
      return `${sign}${(absValue / 1e3).toFixed(2)}K`;
    } else {
      return value.toLocaleString();
    }
  };

  const updateSeriesData = useCallback((pages: any[]) => {
    if (!candlestickSeries.current || !volumeSeries.current || !marketCapSeries.current) return;

    // Merge pages arrays
    const newData = pages.reduce((acc, page) => [...acc, ...page], []);
    
    const formattedData = newData
      .map((item: any) => {
        const volume = Number(item.quote?.volume || item.volume || 0);
        const marketCap = Number(item.quote?.market_cap || item.market_cap || 0);
        
        return {
          time: moment(item.timeClose).unix(),
          open: Number(item.quote?.open || item.open || 0),
          close: Number(item.quote?.close || item.close || 0),
          high: Number(item.quote?.high || item.high || 0),
          low: Number(item.quote?.low || item.low || 0),
          volume: clampValue(volume),
          market_cap: clampValue(marketCap),
          originalVolume: volume, // Keep original for display
          originalMarketCap: marketCap, // Keep original for display
        };
      })
      .sort((a, b) => a.time - b.time)
      .reduce((acc: any[], item) => {
        if (!acc.find((i) => i.time === item.time)) {
          acc.push(item);
        }
        return acc;
      }, []);

    if (formattedData.length === 0) return;

    // Set candlestick data
    candlestickSeries.current.setData(formattedData);

    // Set volume data with clamped values
    const volumeData = formattedData.map((item, index) => {
      const previousItem = index > 0 ? formattedData[index - 1] : item;
      const isGreen = item.close > previousItem.close || item.close === item.open;

      return {
        time: item.time,
        value: item.volume, // Already clamped
        color: index === 0 || isGreen ? '#2BCC61' : '#F5274E',
      };
    });

    volumeSeries.current.setData(volumeData);

    // Set market cap data with clamped values
    const marketCapData = formattedData.map((item, index) => {
      const previousItem = index > 0 ? formattedData[index - 1] : item;
      const isGreen = item.close > previousItem.close || item.close === item.open;

      return {
        time: item.time,
        value: item.market_cap, // Already clamped
        color: index === 0 || isGreen ? '#2BCC61' : '#F5274E',
      };
    });

    marketCapSeries.current.setData(marketCapData);

    // Set current candle data with original values for display
    if (formattedData.length > 0) {
      const lastCandle = formattedData[formattedData.length - 1];
      
      setCurrentCandlePrice({
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
      });
      setCurrentCandleVolume(lastCandle.originalVolume || 0);
      setCurrentCandleMarketCap(lastCandle.originalMarketCap || 0);
    }
  }, [clampValue]);

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
        timeFormatter: (time: any) => {
          return moment.unix(time).format('MMM DD, HH:mm');
        },
      },
    },
    onChartReady: (chartInstance) => {
      // Add candlestick series
      const candlestickSeriesInstance = chartInstance.addSeries(CandlestickSeries, {
        upColor: '#2BCC61',
        downColor: '#F5274E',
        borderVisible: false,
        wickUpColor: '#2BCC61',
        wickDownColor: '#F5274E',
        priceFormat: {
          type: 'custom',
          minMove: 0.00000001,
          formatter: (price: number) => {
            return `${price.toFixed(6)} ${convertTo.toUpperCase()}`;
          },
        },
      });

      // Add volume series
      const volumeSeriesInstance = chartInstance.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'custom',
          formatter: () => '',
        },
        priceScaleId: 'volume',
      });

      // Add market cap series
      const marketCapSeriesInstance = chartInstance.addSeries(HistogramSeries, {
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

      volumeSeriesInstance.priceScale().applyOptions({
        visible: false,
        scaleMargins: {
          top: 0.9,
          bottom: 0,
        },
      });

      marketCapSeriesInstance.priceScale().applyOptions({
        visible: false,
        scaleMargins: {
          top: 0.2,
          bottom: 0.2,
        },
      });

      candlestickSeriesInstance.priceScale().applyOptions({
        scaleMargins: {
          top: 0.2,
          bottom: 0.2,
        },
      });

      // Subscribe to crosshair moves
      chartInstance.subscribeCrosshairMove((param) => {
        if (param.time) {
          const candleData = param.seriesData.get(candlestickSeriesInstance) as any;
          const volumeData = param.seriesData.get(volumeSeriesInstance) as any;
          const marketCapData = param.seriesData.get(marketCapSeriesInstance) as any;

          if (candleData) {
            setCurrentCandlePrice(candleData);
          }
          setCurrentCandleVolume(volumeData?.value || 0);
          setCurrentCandleMarketCap(marketCapData?.value || 0);
        }
      });

      candlestickSeries.current = candlestickSeriesInstance;
      volumeSeries.current = volumeSeriesInstance;
      marketCapSeries.current = marketCapSeriesInstance;
    },
  });

  const handleIntervalChange = (interval: Interval) => {
    setIntervalBy(interval);
  };

  const handleCurrencyToggle = () => {
    setUseCurrentCurrency(!useCurrentCurrency);
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!pairAddress) return;

    subscription.current = WebSocketClient.subscribe(
      `PairTransaction::${pairAddress}`,
      (tx: any) => {
        if (!candlestickSeries.current || !volumeSeries.current || !marketCapSeries.current) return;

        const currentData = candlestickSeries.current.data();
        const currentVolumeData = volumeSeries.current.data();
        const currentMarketCapData = marketCapSeries.current.data();
        
        const latestCandle = currentData.length ? currentData[currentData.length - 1] : null;
        const latestVolume = currentVolumeData.length ? currentVolumeData[currentVolumeData.length - 1] : null;
        const latestMarketCap = currentMarketCapData.length ? currentMarketCapData[currentMarketCapData.length - 1] : null;

        const currentPrice = Number(tx.data?.buy_price?.[convertTo] || 0);
        const currentTime = Math.floor(Date.now() / 1000);

        if (
          latestCandle &&
          latestVolume &&
          latestMarketCap &&
          currentTime - (latestCandle as any).time < intervalBy.value
        ) {
          // Update existing candle
          candlestickSeries.current.update({
            time: (latestCandle as any).time as any,
            open: (latestCandle as any).open,
            close: currentPrice,
            high: Math.max((latestCandle as any).high, currentPrice),
            low: Math.min((latestCandle as any).low, currentPrice),
          });

          const newVolume = clampValue((latestVolume as any).value + parseInt(tx.data?.volume || '0'));
          const newMarketCap = clampValue(Number(tx.data?.market_cap?.[convertTo] || 0));
          const isGreen = !currentData.length || currentData.length < 2 || 
            (currentData[currentData.length - 2] as any).close < currentPrice;

          volumeSeries.current.update({
            time: (latestVolume as any).time as any,
            value: newVolume,
            color: isGreen ? '#2BCC61' : '#F5274E',
          });

          marketCapSeries.current.update({
            time: (latestMarketCap as any).time as any,
            value: newMarketCap,
            color: isGreen ? '#2BCC61' : '#F5274E',
          });
        } else {
          // Create new candle
          candlestickSeries.current.update({
            time: currentTime as any,
            open: latestCandle ? (latestCandle as any).close : currentPrice,
            close: currentPrice,
            high: currentPrice,
            low: currentPrice,
          });

          volumeSeries.current.update({
            time: currentTime as any,
            value: clampValue(parseInt(tx.data?.volume || '0')),
            color: '#2BCC61',
          });

          marketCapSeries.current.update({
            time: currentTime as any,
            value: clampValue(Number(tx.data?.market_cap?.[convertTo] || 0)),
            color: '#2BCC61',
          });
        }
      }
    );

    return () => {
      subscription.current?.();
    };
  }, [pairAddress, intervalBy.value, convertTo]);

  if (hasError) {
    return (
      <div className={`bg-gray-900 rounded-lg p-8 text-center ${className}`} style={{ height }}>
        <p className="text-red-400">Failed to load chart data</p>
        <AeButton
          variant="primary"
          size="small"
          onClick={fetchHistoricalData}
          className="mt-4"
        >
          Retry
        </AeButton>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <div className="relative" style={{ height }}>
        {/* Chart Info Overlay */}
        <div className="absolute top-0 left-0 right-24 z-20 p-4 bg-gradient-to-b from-gray-900 via-gray-900/75 to-transparent">
          <div className="flex flex-wrap items-end gap-1 mb-2">
            <div className="text-lg font-bold">
              Pool<span className="mx-1 text-xl font-normal">/</span>AE
            </div>
            <div className="flex gap-1 pb-1 text-sm text-gray-400">
              <span>on</span>
              <span>Aeternity</span>
              <span>·</span>
              <span>{intervalBy.label}</span>
            </div>
          </div>

          {currentCandlePrice && (
            <div className="text-sm">
              <div className="flex gap-4 flex-wrap mb-1">
                <div className="flex gap-2">
                  <span>
                    O{' '}
                    <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                      {currentCandlePrice.open.toFixed(6)}
                    </span>
                  </span>
                  <span>
                    H{' '}
                    <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                      {currentCandlePrice.high.toFixed(6)}
                    </span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <span>
                    L{' '}
                    <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                      {currentCandlePrice.low.toFixed(6)}
                    </span>
                  </span>
                  <span>
                    C{' '}
                    <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                      {currentCandlePrice.close.toFixed(6)}
                    </span>
                  </span>
                </div>
                <div className="pl-2">
                  <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                    {isTrendingUp ? '+' : ''}
                    {(currentCandlePrice.close - currentCandlePrice.open).toFixed(6)} (
                    {isTrendingUp ? '+' : ''}
                    {currentCandleMovePercentage}%)
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  Vol{' '}
                  <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                    {formatLargeNumber(currentCandleVolume)}
                  </span>
                </div>
                <div>
                  MCap{' '}
                  <span className={isTrendingUp ? 'text-green-400' : 'text-red-400'}>
                    {formatLargeNumber(currentCandleMarketCap)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart Container */}
        <div ref={chartContainer} className="w-full h-full" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <div className="text-white">Loading...</div>
          </div>
        )}
      </div>

      {/* Chart Controls */}
      <div className="flex items-center justify-between p-2 border-t border-gray-700">
        <div className="flex flex-wrap items-center">
          {intervals.map((interval) => (
            <AeButton
              key={interval.value}
              variant={intervalBy.value === interval.value ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handleIntervalChange(interval)}
              className="mr-1"
            >
              {interval.label}
            </AeButton>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-gray-400 text-sm">
            {moment().format('HH:mm:ss')}
          </div>
          <div className="text-gray-400">|</div>
          <AeButton
            variant="secondary"
            size="small"
            onClick={handleCurrencyToggle}
            className="text-sm uppercase"
          >
            <span className={!useCurrentCurrency ? 'text-blue-400 font-bold' : ''}>
              AE
            </span>
            /
            <span className={useCurrentCurrency ? 'text-blue-400 font-bold' : ''}>
              USD
            </span>
          </AeButton>
        </div>
      </div>
    </div>
  );
}


export default PoolCandlestickChart;