import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false); // Default to AE
  const isFetchingMoreRef = useRef(false);
  const loadedStartDateRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);
  const lastVisibleRangeRef = useRef<{ from: number; to: number } | null>(null);
  const isUpdatingDataRef = useRef(false);

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

  // Track the earliest loaded date for infinite scrolling
  const minStartDate = moment('2025-01-01T00:00:00Z');
  
  // Fetch portfolio history with infinite query for pagination
  const {
    data,
    isLoading,
    error,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
  } = useInfiniteQuery({
    queryKey: ['portfolio-history', address, dateRange.startDate, dateRange.endDate, dateRange.interval, convertTo, selectedTimeRange],
    queryFn: async ({ pageParam }) => {
      // pageParam is the endDate for this page (undefined means use the current dateRange.endDate)
      const endDate = pageParam ? moment(pageParam) : moment(dateRange.endDate);
      const range = TIME_RANGES[selectedTimeRange];
      
      // Calculate start date for this page
      // For initial load, use dateRange.startDate if available
      // For subsequent loads (scroll left), go back 90 days from endDate
      let startDate: moment.Moment;
      if (!pageParam && dateRange.startDate) {
        // Initial load: use the calculated dateRange.startDate
        startDate = moment(dateRange.startDate);
      } else if (range.days === Infinity) {
        // For 'all', load 90 days at a time going backwards
        startDate = moment(endDate).subtract(90, 'days');
        if (startDate.isBefore(minStartDate)) {
          startDate = minStartDate;
        }
      } else {
        // For specific ranges when loading more, go back the same number of days
        startDate = moment(endDate).subtract(range.days, 'days');
        if (startDate.isBefore(minStartDate)) {
          startDate = minStartDate;
        }
      }
      
      const response = await TrendminerApi.getAccountPortfolioHistory(address, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: dateRange.interval,
        convertTo: convertTo as any,
      });
      
      const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
      
      // Track the earliest loaded date
      if (snapshots.length > 0) {
        const earliest = moment(snapshots[0].timestamp);
        if (!loadedStartDateRef.current || earliest.isBefore(loadedStartDateRef.current)) {
          loadedStartDateRef.current = earliest.toISOString();
        }
      }
      
      return {
        snapshots,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
    getNextPageParam: () => undefined, // No forward pagination needed
    getPreviousPageParam: (firstPage) => {
      // If we've reached the minimum start date, stop loading more
      if (firstPage.startDate === minStartDate.toISOString()) {
        return undefined;
      }
      // Return the start date of this page as the end date for the next page (going backwards)
      return firstPage.startDate;
    },
    initialPageParam: undefined,
    enabled: !!address,
    staleTime: 60_000, // 1 minute
  });

  // Flatten all pages into a single array, sorted by timestamp
  const portfolioData = useMemo(() => {
    if (!data?.pages) return [];
    
    // Combine all snapshots from all pages
    const allSnapshots = data.pages.flatMap(page => page.snapshots);
    
    // Remove duplicates based on timestamp
    const uniqueSnapshots = new Map<string, PortfolioSnapshot>();
    for (const snapshot of allSnapshots) {
      const timestamp = moment(snapshot.timestamp).toISOString();
      if (!uniqueSnapshots.has(timestamp)) {
        uniqueSnapshots.set(timestamp, snapshot);
      }
    }
    
    // Sort by timestamp ascending
    return Array.from(uniqueSnapshots.values()).sort((a, b) => 
      moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf()
    );
  }, [data]);


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
      const retryInit = () => {
        if (chartContainerRef.current && !chartRef.current && portfolioData && portfolioData.length > 0) {
          // Will be handled by the next useEffect run
        }
      };
      requestAnimationFrame(retryInit);
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
        rightBarStaysOnScroll: true,
        lockVisibleTimeRangeOnResize: true,
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
    
    // Fit content to show all data (only on initial load)
    if (chartData.length > 0) {
      chart.timeScale().fitContent();
    }

    // Handle scroll to load previous data
    const handleVisibleRangeChange = () => {
      // Don't trigger if already fetching or no more pages
      if (isFetchingMoreRef.current || !hasPreviousPage || isFetchingPreviousPage) {
        return;
      }
      
      // Skip if we're currently updating data (but allow user scrolls after update completes)
      if (isUpdatingDataRef.current) {
        return;
      }
      
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      if (!logicalRange) return;
      
      // Prevent scrolling past current time
      const currentTime = moment().unix();
      const visibleRange = chart.timeScale().getVisibleRange();
      if (visibleRange && visibleRange.to > currentTime) {
        // Only update if we have a valid from value (not null)
        if (visibleRange.from != null && typeof visibleRange.from === 'number') {
          chart.timeScale().setVisibleRange({
            from: visibleRange.from,
            to: currentTime,
          });
          // Update tracking with corrected range
          const correctedLogicalRange = chart.timeScale().getVisibleLogicalRange();
          if (correctedLogicalRange) {
            lastVisibleRangeRef.current = { from: correctedLogicalRange.from, to: correctedLogicalRange.to };
          }
        }
        return;
      }
      
      // On initial load, just store the range and skip loading
      if (initialLoadRef.current) {
        lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
        initialLoadRef.current = false;
        return;
      }
      
      // Only load if user has scrolled left (from value decreased)
      const currentFrom = logicalRange.from;
      const lastFrom = lastVisibleRangeRef.current?.from;
      
      // If user hasn't scrolled left (from value increased or stayed same), don't load
      // Allow small tolerance (1 logical unit) for rounding/rendering differences
      if (lastFrom !== null && currentFrom >= (lastFrom - 1)) {
        lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
        return;
      }
      
      const barsInfo = lineSeries.barsInLogicalRange(logicalRange);
      if (!barsInfo) {
        lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
        return;
      }
      
      // If we're near the start of the data (within 20 bars) AND user scrolled left, load more
      if (barsInfo.barsBefore < 20 && portfolioData.length > 0) {
        isFetchingMoreRef.current = true;
        fetchPreviousPage().finally(() => {
          isFetchingMoreRef.current = false;
        });
      }
      
      // Update last visible range
      lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
    };

    // Subscribe to visible range changes for infinite scrolling
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

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
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      if (seriesRef.current) {
        seriesRef.current = null;
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
      // Reset initial load flag when chart is destroyed
      initialLoadRef.current = true;
      lastVisibleRangeRef.current = null;
    };
  }, [portfolioData, convertTo, hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage]);

  // Update chart data when portfolio data or currency changes
  useEffect(() => {
    if (!portfolioData || !seriesRef.current || portfolioData.length === 0) return;

    // Mark that we're updating data to prevent scroll handler from triggering
    isUpdatingDataRef.current = true;

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

    // Get current visible range to preserve scroll position
    const chart = chartRef.current;
    const timeScale = chart?.timeScale();
    const visibleRange = timeScale?.getVisibleRange();
    
    seriesRef.current.setData(chartData);
    
    // Set maximum visible range to prevent scrolling past current time
    const currentTime = moment().unix();
    if (chart) {
      // Apply options to prevent scrolling past current time
      chart.timeScale().applyOptions({
        rightBarStaysOnScroll: true,
      });
    }
    
    // Restore visible range if we had one (to preserve scroll position when loading more data)
    if (chart && visibleRange && chartData.length > 0) {
      // Temporarily disable the handler, restore range, then update tracking
      // Ensure we don't restore a range that goes past current time
      const currentTime = moment().unix();
      const restoredTo = Math.min(visibleRange.to, currentTime);
      // Only set range if from is valid (not null)
      if (visibleRange.from != null && typeof visibleRange.from === 'number') {
        timeScale?.setVisibleRange({
          from: visibleRange.from,
          to: restoredTo,
        });
      }
      // Use requestAnimationFrame to ensure the range is set before updating tracking
      requestAnimationFrame(() => {
        const logicalRange = timeScale?.getVisibleLogicalRange();
        if (logicalRange) {
          lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
        }
        // Reset initial load flag after data update so we can detect future scrolls
        initialLoadRef.current = false;
        // Re-enable handler after range is restored
        setTimeout(() => {
          isUpdatingDataRef.current = false;
        }, 100);
      });
    } else if (chart && chartData.length > 0) {
      // Only fit content if we don't have a visible range (initial load)
      chart.timeScale().fitContent();
      // Use requestAnimationFrame to ensure content is fitted before updating tracking
      requestAnimationFrame(() => {
        const logicalRange = chart.timeScale().getVisibleLogicalRange();
        if (logicalRange) {
          lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
        }
        // Reset initial load flag after fitting content
        initialLoadRef.current = true;
        // Re-enable handler after content is fitted
        setTimeout(() => {
          isUpdatingDataRef.current = false;
        }, 100);
      });
    } else {
      // If no chart or data, re-enable handler immediately
      isUpdatingDataRef.current = false;
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
            <>
              <div ref={chartContainerRef} className="w-full h-[300px] min-w-0" />
              {isFetchingPreviousPage && (
                <div className="mt-2 text-center">
                  <div className="text-white/60 text-xs">Loading previous data...</div>
                </div>
              )}
            </>
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

