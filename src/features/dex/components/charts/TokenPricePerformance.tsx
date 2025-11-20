import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, HistogramData, ColorType, LineSeries, HistogramSeries } from 'lightweight-charts';
import AeButton from '../../../../components/AeButton';
import { getGraph } from '../../../../libs/dexBackend';
import { AeCard } from '../../../../components/ui/ae-card';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';

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
  'MAX': Infinity,
} as const;

type TimeFrame = keyof typeof TIME_FRAMES;

const BAR_CHART_TYPES = ['TVL', 'Volume', 'Fees', 'Locked'];

export default function TokenPricePerformance({
  availableGraphTypes,
  initialChart,
  initialTimeFrame = 'MAX',
  pairId,
  tokenId,
  className = '',
}: TokenPricePerformanceProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const touchHandlersCleanup = useRef<(() => void) | null>(null);
  
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(initialTimeFrame as TimeFrame);
  const [selectedChart, setSelectedChart] = useState<ChartType>(initialChart);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<{
    labels: number[];
    data: number[];
    graphType: string;
  }>({
    labels: [],
    data: [],
    graphType: '',
  });

  const isBarChart = BAR_CHART_TYPES.includes(selectedChart.type);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#ffffff',
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

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    handleResize(); // Initial resize
    window.addEventListener('resize', handleResize);

    // Add touch handlers for mobile drag support
    const container = chartContainerRef.current;
    if (container) {
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!chart || !container) return;
        
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        
        try {
          const time = chart.timeScale().coordinateToTime(x);
          if (time !== null) {
            chart.setCrosshairPosition(x, 0, { time: time as any });
          }
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
          const time = chart.timeScale().coordinateToTime(clampedX);
          if (time !== null) {
            chart.setCrosshairPosition(clampedX, 0, { time: time as any });
          }
        } catch (error) {
          console.warn('[TokenPricePerformance] Error setting crosshair on touchmove:', error);
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!chart) return;
        
        try {
          chart.setCrosshairPosition(-1, -1, {});
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
      window.removeEventListener('resize', handleResize);
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
    const seriesOptions = {
      color: 'rgb(0, 255, 157)',
      priceFormat: {
        type: 'price' as const,
        precision: ['TVL', 'Fees', 'Volume'].includes(selectedChart.type) ? 2 : 6,
        minMove: 0.01,
      },
    };

    if (isBarChart) {
      seriesRef.current = chartRef.current.addSeries(HistogramSeries, seriesOptions);
    } else {
      seriesRef.current = chartRef.current.addSeries(LineSeries, seriesOptions);
    }

    // Update chart data
    updateChartData();
  }, [selectedChart.type, isBarChart]);

  // Update chart data when timeframe changes
  useEffect(() => {
    updateChartData();
  }, [chartData]);

  const updateChartData = useCallback(() => {
    if (!seriesRef.current || !chartData.labels.length) return;

    const now = Date.now() / 1000;
    const timeFrameHours = TIME_FRAMES[selectedTimeFrame];
    const minTime = timeFrameHours === Infinity ? 0 : now - (timeFrameHours * 3600);

    // Convert data format - TradingView expects Unix timestamps in seconds
    const rawData = chartData.labels
      .map((timestamp, index) => {
        // Ensure timestamp is in seconds (not milliseconds)
        const timeInSeconds = timestamp > 1e10 ? Math.floor(timestamp / 1000) : timestamp;
        return {
          time: timeInSeconds as any,
          value: Number(chartData.data[index]) || 0,
        };
      })
      .filter((item) => timeFrameHours === Infinity || item.time >= minTime)
      .sort((a, b) => a.time - b.time); // Ensure data is sorted by time

    // Remove duplicate timestamps and ensure strict ascending order
    const formattedData: typeof rawData = [];
    let lastTime = 0;
    
    for (const item of rawData) {
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
          value: item.value
        });
        lastTime = lastTime + 1;
      }
    }

    if (formattedData.length > 0) {
      seriesRef.current.setData(formattedData);
      
      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [chartData, selectedTimeFrame, isBarChart]);

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
        });
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setChartData({ labels: [], data: [], graphType: selectedChart.type });
    } finally {
      setLoading(false);
    }
  }, [selectedChart.type, selectedTimeFrame, pairId, tokenId]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [pairId, tokenId]);

  const handleTimeFrameChange = (timeFrame: TimeFrame) => {
    setSelectedTimeFrame(timeFrame);
  };

  const handleChartTypeChange = (chartType: ChartType) => {
    setSelectedChart(chartType);
  };

  const showNoData = !chartData.data.length || chartData.data.every(d => d === 0);

  return (
    <div className={`${className}`}>
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
              Select Chart Type
            </label>
            <AppSelect
              value={selectedChart.type}
              onValueChange={(v) => {
                const chartType = availableGraphTypes.find(c => c.type === v);
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
            <div className="text-foreground">Loading...</div>
          </div>
        )}

        {/* No Data Overlay */}
        {showNoData && !loading && (
          <div className="absolute inset-0 flex justify-center items-center text-3xl text-muted-foreground">
            No Data
          </div>
        )}
      </AeCard>

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
}
