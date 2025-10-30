import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, LineData, ColorType, LineSeries } from 'lightweight-charts';
import moment from 'moment';
import { TrendminerApi } from '@/api/backend';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';

interface AccountPortfolioProps {
  address: string;
}

interface PortfolioSnapshot {
  timestamp: string | Date;
  total_value_ae: number;
  ae_balance: number;
  tokens_value_ae: number;
  total_value_usd?: number;
}

const TIME_RANGES = {
  '7d': { days: 7, interval: 3600 }, // Hourly for 7 days
  '30d': { days: 30, interval: 86400 }, // Daily for 30 days
  '90d': { days: 90, interval: 86400 }, // Daily for 90 days
  'all': { days: Infinity, interval: 86400 }, // Daily for all time
} as const;

type TimeRange = keyof typeof TIME_RANGES;

export default function AccountPortfolio({ address }: AccountPortfolioProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(true); // Default to USD

  const { currentCurrencyInfo, getFormattedFiat } = useCurrencies();
  const convertTo = useMemo(
    () => (useCurrentCurrency ? currentCurrencyInfo.code.toLowerCase() : 'ae'),
    [useCurrentCurrency, currentCurrencyInfo]
  );

  // Calculate date range - minimum start date is January 1, 2025
  const dateRange = useMemo(() => {
    const range = TIME_RANGES[selectedTimeRange];
    const endDate = moment();
    const minStartDate = moment('2025-01-01T00:00:00Z');
    
    let startDate: moment.Moment | undefined;
    if (range.days === Infinity) {
      startDate = minStartDate;
    } else {
      const calculatedStart = moment().subtract(range.days, 'days');
      // Use the later of: calculated start date or minimum start date (Jan 1, 2025)
      startDate = calculatedStart.isBefore(minStartDate) ? minStartDate : calculatedStart;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      interval: range.interval,
    };
  }, [selectedTimeRange]);

  // Fetch portfolio history (backend now calculates with historical AE prices)
  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['portfolio-history', address, dateRange.startDate, dateRange.endDate, dateRange.interval, convertTo],
    queryFn: async () => {
      const response = await TrendminerApi.getAccountPortfolioHistory(address, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: dateRange.interval,
        convertTo: convertTo as any,
      });
      return (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
    },
    enabled: !!address,
    staleTime: 60_000, // 1 minute
  });


  // Current portfolio value (latest snapshot)
  const currentValue = useMemo(() => {
    if (!portfolioData || portfolioData.length === 0) return null;
    const latest = portfolioData[portfolioData.length - 1];
    return convertTo === 'ae' 
      ? latest.total_value_ae 
      : (latest.total_value_usd || latest.total_value_ae);
  }, [portfolioData, convertTo]);

  // Initialize chart when container and data are available
  useEffect(() => {
    // Only initialize if we have data and container is rendered
    if (!portfolioData || portfolioData.length === 0 || !chartContainerRef.current || chartRef.current) return;

    const container = chartContainerRef.current;
    // Ensure container has a width
    if (container.clientWidth === 0) {
      // Container might not be sized yet, try again on next frame
      requestAnimationFrame(() => {
        if (chartContainerRef.current && !chartRef.current && portfolioData && portfolioData.length > 0) {
          // Retry initialization
        }
      });
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
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
          color: 'rgba(17, 97, 254, 0.5)',
          width: 1,
        },
        horzLine: {
          color: 'rgba(17, 97, 254, 0.5)',
          width: 1,
        },
      },
    });

    chartRef.current = chart;

    // Add portfolio value series (includes AE price conversion for USD/fiat)
    const currentConvertTo = convertTo;
    const lineSeries = chart.addSeries(LineSeries, {
      color: '#1161FE',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        minMove: 0.000001,
        formatter: (price: number) => {
          if (currentConvertTo === 'ae') {
            return `${price.toFixed(4)} AE`;
          }
          return getFormattedFiat(Decimal.from(price));
        },
      },
    });

    seriesRef.current = lineSeries as ISeriesApi<'Line'>;

    // Set initial portfolio data (backend calculates USD using historical AE prices)
    const chartData: LineData[] = portfolioData.map((snapshot) => {
      const timestamp = moment(snapshot.timestamp).unix();
      const value = convertTo === 'ae' 
        ? snapshot.total_value_ae 
        : (snapshot.total_value_usd || snapshot.total_value_ae);
      
      return {
        time: timestamp as any,
        value,
      };
    });

    lineSeries.setData(chartData);
    
    // Fit content to show all data
    if (chartData.length > 0) {
      chart.timeScale().fitContent();
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (seriesRef.current) {
        seriesRef.current = null;
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
    };
  }, [portfolioData, convertTo]);

  // Update chart data when portfolio data or currency changes
  useEffect(() => {
    if (!portfolioData || !seriesRef.current || portfolioData.length === 0) return;

    const chartData: LineData[] = portfolioData.map((snapshot) => {
      const timestamp = moment(snapshot.timestamp).unix();
      const value = convertTo === 'ae' 
        ? snapshot.total_value_ae 
        : (snapshot.total_value_usd || snapshot.total_value_ae);
      
      return {
        time: timestamp as any,
        value,
      };
    });

    seriesRef.current.setData(chartData);
    
    // Fit content to show all data
    if (chartRef.current && chartData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [portfolioData, convertTo]);

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="text-red-400 text-sm">Failed to load portfolio data</div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-red-300 text-xs mt-2 opacity-75">{errorMessage}</div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 mb-6">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Portfolio Value</h3>
              {currentValue !== null && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {convertTo === 'ae' 
                      ? `${Decimal.from(currentValue).prettify()} AE`
                      : getFormattedFiat(Decimal.from(currentValue))
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Currency toggle */}
              <button
                onClick={() => setUseCurrentCurrency(!useCurrentCurrency)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/80 hover:text-white"
              >
                {convertTo.toUpperCase()}
              </button>

              {/* Time range buttons */}
              <div className="flex gap-1 rounded-lg bg-white/[0.05] p-1 border border-white/10">
                {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedTimeRange(range)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      selectedTimeRange === range
                        ? 'bg-white/20 text-white'
                        : 'text-white/60 hover:text-white/80 hover:bg-white/[0.08]'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-white/60">Loading portfolio data...</div>
            </div>
          ) : portfolioData && portfolioData.length > 0 ? (
            <div ref={chartContainerRef} className="w-full h-[300px] min-w-0" />
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-white/60">No portfolio data available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

