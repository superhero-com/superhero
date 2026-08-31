import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import {
  createChart, IChartApi, ISeriesApi, ColorType, LineSeries, HistogramSeries, MismatchDirection,
} from 'lightweight-charts';
import { useTranslation } from 'react-i18next';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import { formatFractionalPrice } from '@/utils/common';
import AeButton from '../../../../components/AeButton';
import { getGraph } from '../../../../libs/dexBackend';
import { AeCard } from '../../../../components/ui/ae-card';
import { TradingViewAttribution } from '../../../../components/charts/TradingViewAttribution';
import { Decimal } from '../../../../libs/decimal';

interface ChartType {
  type: string;
  text: string;
}

interface TokenPricePerformanceProps {
  availableGraphTypes: ChartType[];
  initialChart: ChartType;
  initialTimeFrame?: string;
  pairId?: string;
  tokenId?: string;
  className?: string;
}

const TIME_FRAMES = {
  '1H': 1,
  '1D': 24,
  '1W': 24 * 7,
  '1M': 24 * 30,
  '1Y': 24 * 365,
  MAX: Infinity,
} as const;

type TimeFrame = keyof typeof TIME_FRAMES;

const BAR_CHART_TYPES = ['TVL', 'Volume', 'Fees', 'Locked'];

// Price series can hold values far below the axis' fixed step (e.g. 0.0000001032),
// which lightweight-charts' fixed-precision formatter renders as a flat
// "0.0000000". Reuse the same compressed-zeros style used for the token's own
// price ("0.0 (7) 1032") so tiny prices stay distinguishable on axis/crosshair.
const formatChartPrice = (price: number): string => {
  const formatted = formatFractionalPrice(Decimal.from(price));
  return formatted.value ?? formatted.number;
};

const TokenPricePerformance = ({
  availableGraphTypes,
  initialChart,
  initialTimeFrame = 'MAX',
  pairId,
  tokenId,
  className = '',
}: TokenPricePerformanceProps) => {
  const { t } = useTranslation('dex');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const touchHandlersCleanup = useRef<(() => void) | null>(null);

  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(initialTimeFrame as TimeFrame);
  const [selectedChart, setSelectedChart] = useState<ChartType>(initialChart);
  const [loading, setLoading] = useState(false);
  // Tracks whether the currently selected timeframe actually has points to plot,
  // so the "No data" overlay reflects what's on screen rather than the raw,
  // pre-filter response.
  const [hasPlottedData, setHasPlottedData] = useState(false);
  const [chartData, setChartData] = useState<{
    labels: number[];
    data: number[];
    graphType: string;
    unit: string | null;
  }>({
    labels: [],
    data: [],
    graphType: '',
    unit: null,
  });

  const isBarChart = BAR_CHART_TYPES.includes(selectedChart.type);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return () => {};

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#ffffff',
        // Dropped by the Trusted Types `default` policy under the enforcing CSP; the licence's
        // link is carried by src/components/charts/TradingViewAttribution.tsx instead.
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(0, 255, 157, 0.5)',
          width: 1,
        },
        horzLine: {
          color: 'rgba(0, 255, 157, 0.5)',
          width: 1,
        },
      },
    });

    chartRef.current = chart;

    // Handle resize - keep both width and height in sync with the container so
    // the time (date) axis is never clipped by the card's fixed height/padding.
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    handleResize(); // Initial resize
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
        handleResize();
      });
    resizeObserver?.observe(chartContainerRef.current);

    // Add touch handlers for mobile drag support
    const container = chartContainerRef.current;
    if (container) {
      const applyTouchCrosshairAtX = (xInContainer: number) => {
        if (!seriesRef.current) return;

        const time = chart.timeScale().coordinateToTime(xInContainer);
        if (time === null) return;

        const pointIndex = chart.timeScale().timeToIndex(time, true);
        if (pointIndex === null) return;

        const dataPoint = seriesRef.current.dataByIndex(
          pointIndex,
          MismatchDirection.NearestLeft,
        );
        if (!dataPoint || !('value' in dataPoint) || typeof dataPoint.value !== 'number') return;

        chart.setCrosshairPosition(dataPoint.value, time, seriesRef.current);
      };

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!chart || !container) return;

        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;

        try {
          applyTouchCrosshairAtX(x);
        } catch (error) {
          console.warn('[TokenPricePerformance] Error setting crosshair on touchstart:', error);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!chart || !container) return;

        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;

        // Clamp x to chart bounds
        const clampedX = Math.max(0, Math.min(x, rect.width));

        try {
          applyTouchCrosshairAtX(clampedX);
        } catch (error) {
          console.warn('[TokenPricePerformance] Error setting crosshair on touchmove:', error);
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!chart) return;

        try {
          chart.clearCrosshairPosition();
        } catch (error) {
          console.warn('[TokenPricePerformance] Error clearing crosshair on touchend:', error);
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

    return () => {
      if (typeof ResizeObserver === 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      resizeObserver?.disconnect();
      if (touchHandlersCleanup.current) {
        touchHandlersCleanup.current();
        touchHandlersCleanup.current = null;
      }
      if (seriesRef.current) {
        seriesRef.current = null;
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
    };
  }, []);

  const updateChartData = useCallback(() => {
    if (!seriesRef.current || !chartData.labels.length) {
      setHasPlottedData(false);
      // Clear any series carried over from a previous chart type/timeframe so
      // the canvas actually goes empty behind the "No data" overlay.
      seriesRef.current?.setData([]);
      return;
    }

    const timeFrameHours = TIME_FRAMES[selectedTimeFrame];

    // lightweight-charts rejects series values outside ±(MAX_SAFE_INTEGER/100)
    // and throws, which crashes the whole page. Degenerate DEX data (e.g. a
    // dust-state transaction in a near-empty pool) can yield absurd prices like
    // 5e17, so drop out-of-range / non-finite points instead of plotting them.
    const CHART_VALUE_LIMIT = 90071992547409.91;

    // Convert data format - TradingView expects Unix timestamps in seconds
    const valuePoints = chartData.labels
      .map((timestamp, index) => {
        // Ensure timestamp is in seconds (not milliseconds)
        const timeInSeconds = timestamp > 1e10 ? Math.floor(timestamp / 1000) : timestamp;
        return {
          time: timeInSeconds as any,
          value: Number(chartData.data[index]) || 0,
        };
      })
      .filter(
        (item) => Number.isFinite(item.value) && Math.abs(item.value) < CHART_VALUE_LIMIT,
      );

    // Anchor the visible window to the most recent available data point instead
    // of the wall-clock now. Otherwise a token whose latest trade is older than
    // the selected window (e.g. a 1Y window for a token last traded 13 months
    // ago) filters out every point and renders an empty chart.
    const latestTime = valuePoints.length
      ? valuePoints.reduce((max, item) => (item.time > max ? item.time : max), valuePoints[0].time)
      : Date.now() / 1000;
    const minTime = timeFrameHours === Infinity ? 0 : latestTime - (timeFrameHours * 3600);

    const rawData = valuePoints
      .filter((item) => timeFrameHours === Infinity || item.time >= minTime)
      .sort((a, b) => a.time - b.time); // Ensure data is sorted by time

    // Remove duplicate timestamps and ensure strict ascending order
    const formattedData: typeof rawData = [];
    let lastTime = 0;

    rawData.forEach((item) => {
      if (item.time > lastTime) {
        formattedData.push(item);
        lastTime = item.time;
      } else if (item.time === lastTime && formattedData.length > 0) {
        // If timestamp is the same, update the value of the last item
        formattedData[formattedData.length - 1].value = item.value;
      } else if (item.time === lastTime) {
        // If it's the first item with this timestamp, add a small increment
        formattedData.push({
          time: (lastTime + 1) as any,
          value: item.value,
        });
        lastTime += 1;
      }
    });

    setHasPlottedData(formattedData.length > 0);

    if (formattedData.length > 0) {
      seriesRef.current.setData(formattedData);

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } else {
      // Clear any series left over from a previous timeframe/chart type so the
      // canvas matches the (empty) "No data" state.
      seriesRef.current.setData([]);
    }
  }, [chartData, selectedTimeFrame]);

  // Update series when chart type changes
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove existing series
    if (seriesRef.current && chartRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
      } catch (error) {
        console.warn('Failed to remove series:', error);
      }
      seriesRef.current = null;
    }

    // Create new series based on chart type
    const precision = ['TVL', 'Fees', 'Volume'].includes(selectedChart.type) ? 2 : 6;
    const seriesOptions = {
      color: 'rgb(0, 255, 157)',
      priceFormat: selectedChart.type === 'Price'
        ? {
          // Custom formatter keeps sub-step prices readable instead of rounding
          // them to a flat "0.0000000" (see formatChartPrice). The formatter
          // receives the raw price, so the crosshair stays exact regardless of
          // minMove. Keep minMove at 1e-9 (not 1e-18): the tick builder computes
          // price / minMove, and a 1e-18 step overflows MAX_SAFE_INTEGER for
          // ordinary prices (0.25 / 1e-18 = 2.5e17), which NaNs the price scale
          // and renders nothing. 1e-9 still resolves very small prices.
          type: 'custom' as const,
          formatter: formatChartPrice,
          minMove: 1 / 10 ** 9,
        }
        : {
          type: 'price' as const,
          precision,
          // minMove must match the precision, otherwise tiny token prices
          // (e.g. 0.00005) get rounded to the nearest 0.01 and render as 0.000000.
          minMove: 1 / 10 ** precision,
        },
    };

    if (isBarChart) {
      seriesRef.current = chartRef.current.addSeries(HistogramSeries, seriesOptions);
    } else {
      seriesRef.current = chartRef.current.addSeries(LineSeries, seriesOptions);
    }

    // Update chart data
    updateChartData();
  }, [selectedChart.type, isBarChart, updateChartData]);

  // Update chart data when timeframe changes
  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const options: Record<string, any> = {
        graphType: selectedChart.type,
        timeFrame: selectedTimeFrame,
      };

      if (pairId) {
        options.pairAddress = pairId;
      }
      if (tokenId) {
        options.tokenAddress = tokenId;
      }

      const result = await getGraph(options);

      if (result) {
        setChartData({
          labels: result.labels?.map((l: any) => Number(l)) || [],
          data: result.data?.map((d: any) => Number(d)) || [],
          graphType: result.graphType || selectedChart.type,
          unit: result.unit ?? null,
        });
      } else {
        // getGraph returns null for chart types the backend has no series for
        // (e.g. TVL/Fees/Locked). Without resetting here, chartData keeps the
        // previous selection's points and the canvas would keep rendering the
        // old series (e.g. Price) under the new selection with no "No data" overlay.
        setChartData({
          labels: [],
          data: [],
          graphType: selectedChart.type,
          unit: null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setChartData({
        labels: [],
        data: [],
        graphType: selectedChart.type,
        unit: null,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedChart.type, selectedTimeFrame, pairId, tokenId]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTimeFrameChange = (timeFrame: TimeFrame) => {
    setSelectedTimeFrame(timeFrame);
  };

  const handleChartTypeChange = (chartType: ChartType) => {
    setSelectedChart(chartType);
  };

  // Reflect what's actually plotted for the selected timeframe, not the raw
  // pre-filter response — otherwise a window that filters out every point would
  // render a blank canvas with no overlay.
  const showNoData = !loading && !hasPlottedData;

  return (
    <div className={`${className}`}>
      {/* Denomination — make the price chart's unit explicit, and clearly warn
          when the series is NOT in AE (the token has no AE pool, so 0.25 here
          means 0.25 of another token, not 0.25 AE). */}
      {selectedChart.type === 'Price' && chartData.unit && (
        <div
          className={`mb-2 text-xs font-medium ${
            chartData.unit === 'ae' ? 'text-white/50' : 'text-amber-400'
          }`}
        >
          {chartData.unit === 'ae'
            ? 'Price in AE'
            : `Price in ${chartData.unit} — no AE pool, so this is not an AE price`}
        </div>
      )}
      {/* Chart Type Selector */}
      {availableGraphTypes.length > 1 && (
        <div className="flex gap-2 mb-3">
          {/* Desktop buttons */}
          <div className="hidden md:flex gap-2">
            {availableGraphTypes.map((chartType) => (
              <AeButton
                key={chartType.type}
                variant={chartType.type === selectedChart.type ? 'primary' : 'ghost'}
                size="small"
                onClick={() => handleChartTypeChange(chartType)}
              >
                {chartType.text}
              </AeButton>
            ))}
          </div>

          {/* Mobile dropdown */}
          <div className="md:hidden border border-border rounded-xl p-2">
            <label htmlFor="chart-select" className="sr-only">
              {t('tokenPricePerformance.selectChartType')}
            </label>
            <AppSelect
              value={selectedChart.type}
              onValueChange={(v) => {
                const chartType = availableGraphTypes.find((c) => c.type === v);
                if (chartType) handleChartTypeChange(chartType);
              }}
              triggerClassName="block bg-transparent text-foreground outline-0"
              contentClassName="bg-background border-border"
            >
              {availableGraphTypes.map((chartType) => (
                <AppSelectItem key={chartType.type} value={chartType.type}>
                  {chartType.text}
                </AppSelectItem>
              ))}
            </AppSelect>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <AeCard className="relative p-4" style={{ height: '400px' }}>
        <div
          ref={chartContainerRef}
          className="w-full h-full"
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex justify-center items-center text-3xl bg-background/20 rounded-xl">
            <div className="text-foreground">{t('tokenPricePerformance.loading')}</div>
          </div>
        )}

        {/* No Data Overlay */}
        {showNoData && (
          <div className="absolute inset-0 flex justify-center items-center text-3xl text-muted-foreground">
            {t('tokenPricePerformance.noData')}
          </div>
        )}
      </AeCard>

      <TradingViewAttribution className="text-right" />

      {/* Time Frame Selector */}
      <div className="flex gap-2 mt-3 justify-center">
        {Object.keys(TIME_FRAMES).map((timeFrame) => (
          <AeButton
            key={timeFrame}
            variant={timeFrame === selectedTimeFrame ? 'primary' : 'ghost'}
            size="small"
            onClick={() => handleTimeFrameChange(timeFrame as TimeFrame)}
            className="w-14"
          >
            {timeFrame}
          </AeButton>
        ))}
      </div>
    </div>
  );
};

export default TokenPricePerformance;
