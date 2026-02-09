import { DexPairService } from '@/api/generated';
import { DEX_ADDRESSES } from '@/libs/dex';
import { useQuery } from '@tanstack/react-query';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  ISeriesApi,
} from 'lightweight-charts';
import moment from 'moment';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import AeButton from '../../../../components/AeButton';
import { TokenChip } from '../../../../components/TokenChip';
import { useChart } from '../../../../hooks/useChart';
import { Decimal } from '../../../../libs/decimal';
import WebSocketClient from '../../../../libs/WebSocketClient';

interface PoolCandlestickChartProps {
  pairAddress: string;
  fromTokenAddress?: string;
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

export const PoolCandlestickChart = ({
  pairAddress,
  height = 600,
  className = '',
  fromTokenAddress,
}: PoolCandlestickChartProps) => {
  const { data: pair } = useQuery({
    queryKey: ['pair', pairAddress],
    queryFn: () => DexPairService.getPairByAddress({ address: pairAddress }),
    enabled: !!pairAddress,
  });
  const [intervalBy, setIntervalBy] = useState<Interval>(intervals[3]); // Default to 1h
  const [useCurrentCurrency] = useState(false);
  const [fromToken, setFromToken] = useState<'token0' | 'token1'>('token0');
  const [currentCandlePrice, setCurrentCandlePrice] = useState<CandlePrice | null>(null);
  const [currentCandleVolume, setCurrentCandleVolume] = useState<number>(0);
  const [currentCandleMarketCap, setCurrentCandleMarketCap] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const candlestickSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const marketCapSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const subscription = useRef<(() => void) | null>(null);
  const touchHandlersCleanup = useRef<(() => void) | null>(null);

  const convertTo = useMemo(
    () => (useCurrentCurrency ? 'usd' : 'ae'),
    [useCurrentCurrency],
  );

  useEffect(() => {
    if (fromTokenAddress) {
      const isAe = fromTokenAddress === 'AE';
      if (isAe) {
        const WAE_ADDRESS = DEX_ADDRESSES.wae;
        setFromToken(pair?.token0?.address === WAE_ADDRESS ? 'token0' : 'token1');
      } else {
        setFromToken(fromTokenAddress === pair?.token0?.address ? 'token0' : 'token1');
      }
    }
  }, [fromTokenAddress, pair]);

  const currentCandleMovePercentage = useMemo(() => {
    if (!currentCandlePrice) return '0.00';
    const percentage = Number(
      (currentCandlePrice.close - currentCandlePrice.open) / currentCandlePrice.open,
    ) * 100;

    if (Math.abs(percentage) < 0.01) {
      return percentage.toFixed(3);
    }
    return percentage.toFixed(2);
  }, [currentCandlePrice]);

  const isTrendingUp = useMemo(
    () => (currentCandlePrice ? currentCandlePrice.open <= currentCandlePrice.close : false),
    [currentCandlePrice],
  );

  // Helper function to safely clamp large numbers for lightweight-charts
  const parseVolume = (value: string): number => {
    try {
      if (!value || value === 'undefined' || value === 'null') {
        return 0;
      }
      const parsed = Number(Decimal.from(value).div(Decimal.from(10 ** 18)).prettify());
      return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : 0;
    } catch (error) {
      console.warn('Error parsing volume:', value, error);
      return 0;
    }
  };

  // Helper function to safely parse and validate numeric values
  const safeParseNumber = (value: any, fallback: number = 0): number => {
    // return Number(Decimal.from(value).prettify()) ?? 0;
    if (value === null || value === undefined || value === '' || value === 'undefined' || value === 'null') {
      return fallback;
    }
    const parsed = Number(value);
    const result = Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : fallback;
    if (result > 90071992547409) {
      return 90071992547409;
    }
    return result;
  };

  // Helper function to format large numbers for display
  const formatLargeNumber = (value: number): string => Decimal.from(value || '0').shorten();

  const updateSeriesData = useCallback((pages: any[]) => {
    if (!candlestickSeries.current || !volumeSeries.current || !marketCapSeries.current) return;

    // Merge pages arrays
    const newData = pages.reduce((acc, page) => [...acc, ...page], []);

    const formattedData = newData
      .map((item: any) => {
        const volumeString = item.quote?.volume || item.volume || '0';
        const volume = parseVolume(volumeString);
        const marketCap = safeParseNumber(item.quote?.market_cap || item.market_cap, 0);

        return {
          time: moment(item.timeClose).unix(),
          open: safeParseNumber(item.quote?.open || item.open, 0),
          close: safeParseNumber(item.quote?.close || item.close, 0),
          high: safeParseNumber(item.quote?.high || item.high, 0),
          low: safeParseNumber(item.quote?.low || item.low, 0),
          volume,
          market_cap: marketCap,
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
      const safeValue = safeParseNumber(item.volume, 0);

      return {
        time: item.time,
        value: safeValue,
        color: index === 0 || isGreen ? '#2BCC61' : '#F5274E',
      };
    });

    volumeSeries.current.setData(volumeData);

    // Set market cap data with clamped values
    const marketCapData = formattedData.map((item, index) => {
      const previousItem = index > 0 ? formattedData[index - 1] : item;
      const isGreen = item.close > previousItem.close || item.close === item.open;
      const safeValue = safeParseNumber(item.market_cap, 0);

      return {
        time: item.time,
        value: safeValue,
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
  }, []);

  const fetchHistoricalData = useCallback(async () => {
    if (!pairAddress) return;

    setIsLoading(true);
    setHasError(false);

    try {
      const result = await DexPairService.getPaginatedHistory({
        address: pairAddress,
        interval: intervalBy.value,
        convertTo: convertTo as any,
        limit: 100,
        page: 1,
        fromToken,
      });

      updateSeriesData([result]);
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pairAddress, intervalBy.value, convertTo, fromToken, updateSeriesData]);

  const initializeSeries = useCallback((
    chartInstance: any,
    containerEl?: HTMLDivElement | null,
    shouldRemoveExisting = true,
  ) => {
    // Clear existing series only if we're reinitializing and they exist
    if (shouldRemoveExisting) {
      if (candlestickSeries.current) {
        try {
          chartInstance.removeSeries(candlestickSeries.current);
          candlestickSeries.current = null;
        } catch (error) {
          console.warn('Error removing candlestick series:', error);
        }
      }
      if (volumeSeries.current) {
        try {
          chartInstance.removeSeries(volumeSeries.current);
          volumeSeries.current = null;
        } catch (error) {
          console.warn('Error removing volume series:', error);
        }
      }
      if (marketCapSeries.current) {
        try {
          chartInstance.removeSeries(marketCapSeries.current);
          marketCapSeries.current = null;
        } catch (error) {
          console.warn('Error removing market cap series:', error);
        }
      }
    }

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
          const baseToken = fromToken === 'token0' ? pair?.token1?.symbol : pair?.token0?.symbol;
          return `${price.toFixed(6)} ${baseToken || convertTo.toUpperCase()}`;
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

    // Add touch handlers for mobile drag support
    // Clean up any existing touch handlers first to prevent memory leaks
    if (touchHandlersCleanup.current) {
      touchHandlersCleanup.current();
      touchHandlersCleanup.current = null;
    }

    const container = containerEl;
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
          console.warn('[PoolCandlestickChart] Error setting crosshair on touchstart:', error);
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
          console.warn('[PoolCandlestickChart] Error setting crosshair on touchmove:', error);
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!chartInstance) return;

        try {
          chartInstance.setCrosshairPosition(-1, -1, {});
        } catch (error) {
          console.warn('[PoolCandlestickChart] Error clearing crosshair on touchend:', error);
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

    candlestickSeries.current = candlestickSeriesInstance;
    volumeSeries.current = volumeSeriesInstance;
    marketCapSeries.current = marketCapSeriesInstance;
  }, [fromToken, pair, convertTo]);

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
      initializeSeries(chartInstance, chartContainer.current, false);
    },
  });

  const handleIntervalChange = (interval: Interval) => {
    setIntervalBy(interval);
  };

  const handleFlipPair = () => {
    setFromToken(fromToken === 'token0' ? 'token1' : 'token0');
  };

  // Reinitialize chart series when fromToken or pair changes
  useEffect(() => {
    if (chart) {
      // true = remove existing series before creating new ones
      initializeSeries(chart, chartContainer.current, true);
    }
  }, [chart, chartContainer, initializeSeries]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!pairAddress) return () => {};

    subscription.current = WebSocketClient.subscribeForTokenHistories(
      `PairTransaction::${pairAddress}`,
      (tx: any) => {
        if (!candlestickSeries.current || !volumeSeries.current || !marketCapSeries.current) return;

        const currentData = candlestickSeries.current.data();
        const currentVolumeData = volumeSeries.current.data();
        const currentMarketCapData = marketCapSeries.current.data();

        const latestCandle = currentData.length ? currentData[currentData.length - 1] : null;
        const latestVolume = currentVolumeData.length
          ? currentVolumeData[currentVolumeData.length - 1]
          : null;
        const latestMarketCap = currentMarketCapData.length
          ? currentMarketCapData[currentMarketCapData.length - 1]
          : null;

        const currentPrice = safeParseNumber(tx.data?.buy_price?.[convertTo], 0);
        const currentTime = Math.floor(Date.now() / 1000);

        if (
          latestCandle
          && latestVolume
          && latestMarketCap
          && currentTime - (latestCandle as any).time < intervalBy.value
        ) {
          // Update existing candle
          const safeOpen = safeParseNumber((latestCandle as any).open, 0);
          const safeHigh = safeParseNumber((latestCandle as any).high, 0);
          const safeLow = safeParseNumber((latestCandle as any).low, 0);

          candlestickSeries.current.update({
            time: (latestCandle as any).time as any,
            open: safeOpen,
            close: currentPrice,
            high: Math.max(safeHigh, currentPrice),
            low: Math.min(safeLow, currentPrice),
          });

          const currentVolumeValue = safeParseNumber((latestVolume as any).value, 0);
          const additionalVolume = parseVolume(tx.data?.volume || '0');
          const newVolume = safeParseNumber(currentVolumeValue + additionalVolume, 0);
          const newMarketCap = safeParseNumber(tx.data?.market_cap?.[convertTo], 0);
          const isGreen = !currentData.length || currentData.length < 2
            || safeParseNumber((currentData[currentData.length - 2] as any).close, 0) < currentPrice;

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
          const openPrice = latestCandle ? safeParseNumber((latestCandle as any).close, 0) : currentPrice;

          candlestickSeries.current.update({
            time: currentTime as any,
            open: openPrice,
            close: currentPrice,
            high: currentPrice,
            low: currentPrice,
          });

          volumeSeries.current.update({
            time: currentTime as any,
            value: parseVolume(tx.data?.volume || '0'),
            color: '#2BCC61',
          });

          marketCapSeries.current.update({
            time: currentTime as any,
            value: safeParseNumber(tx.data?.market_cap?.[convertTo], 0),
            color: '#2BCC61',
          });
        }
      },
    );

    return () => {
      subscription.current?.();
    };
  }, [pairAddress, intervalBy.value, convertTo, fromToken]);

  // Cleanup touch handlers when component unmounts or chart changes
  useEffect(() => () => {
    if (touchHandlersCleanup.current) {
      touchHandlersCleanup.current();
      touchHandlersCleanup.current = null;
    }
  }, [chart]);

  if (hasError) {
    return (
      <div className={`${className} w-full mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col items-center justify-center text-center`} style={{ height }}>
        <div className="text-base text-red-400 mb-4 font-medium">
          Failed to load chart data
        </div>
        <AeButton
          variant="primary"
          size="medium"
          onClick={fetchHistoricalData}
        >
          Retry
        </AeButton>
      </div>
    );
  }

  return (
    <div className={`${className} w-full mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden`}>
      <div className="relative" style={{ height }}>
        {/* Chart Info Overlay */}
        <div className="hidden sm:block absolute top-0 left-0 right-0 z-20 p-5 bg-gradient-to-b from-background/50 via-background/15 to-transparent">
          <div className="flex flex-wrap items-end gap-1 mb-2">
            <div className="text-lg font-bold text-foreground flex items-center gap-2">
              <TokenChip
                token={fromToken === 'token0' ? pair?.token0 : pair?.token1}
              />
              <span>/</span>
              <TokenChip
                token={fromToken === 'token0' ? pair?.token1 : pair?.token0}
              />
              <button
                type="button"
                onClick={handleFlipPair}
                className="bg-white/10 border border-border rounded-lg px-2 py-0 text-muted-foreground text-xs font-medium cursor-pointer backdrop-blur-sm transition-all duration-200 ease-in-out flex items-center gap-1 hover:bg-white/15 hover:scale-105"
                title="Flip trading pair"
              >
                🔄
              </button>
            </div>
            <div className="flex gap-1 pb-1 pl-2 text-xs text-muted-foreground">
              <div>on</div>
              <div>Aeternity</div>
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
                    {formatLargeNumber(currentCandleVolume)}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  MCap
                  {' '}
                  <span className={`font-semibold font-mono ${isTrendingUp ? 'text-green-500' : 'text-red-500'}`}>
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
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-foreground text-base font-medium">
              Loading chart data...
            </div>
          </div>
        )}
      </div>

      {/* Chart Controls */}
      <div className="flex flex-row flex-wrap items-center justify-between p-2 border-t border-white/10 bg-white/[0.05] backdrop-blur-[10px]">
        <div className="flex flex-row flex-wrap items-center gap-0 sm:gap-2">
          {intervals.map((interval) => (
            <AeButton
              key={interval.value}
              variant={intervalBy.value === interval.value ? 'primary' : 'secondary-dark'}
              size="small"
              onClick={() => handleIntervalChange(interval)}
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
};

export default PoolCandlestickChart;
