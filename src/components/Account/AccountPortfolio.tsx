import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, LineData, ColorType, AreaSeries, AreaSeriesPartialOptions } from 'lightweight-charts';
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
  '6h': { days: 1, interval: 3600 }, // Hourly for 1 day (showing 6h)
  '1d': { days: 1, interval: 3600 }, // Hourly for 1 day
  '1w': { days: 7, interval: 86400 }, // Daily for 7 days
  '1m': { days: 30, interval: 86400 }, // Daily for 30 days
  'all': { days: Infinity, interval: 86400 }, // Daily for all time
} as const;

type TimeRange = keyof typeof TIME_RANGES;

export default function AccountPortfolio({ address }: AccountPortfolioProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1m');
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false); // Default to AE
  const [hoveredPrice, setHoveredPrice] = useState<{ price: number; time: number } | null>(null);
  const [containerReady, setContainerReady] = useState(false);
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
    } else if (selectedTimeRange === '6h') {
      // Special case: show last 6 hours
      startDate = moment().subtract(6, 'hours');
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
    isError,
    refetch,
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
      
      try {
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
      } catch (err) {
        // Enhanced error handling with better logging
        if (process.env.NODE_ENV === 'development') {
          console.error('[AccountPortfolio] Failed to fetch portfolio history:', {
            address,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            interval: dateRange.interval,
            convertTo,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
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
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    gcTime: 10 * 60 * 1000, // Keep cached data for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (user might be scrolling)
    refetchOnReconnect: true, // Refetch when network reconnects
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Current Value] Latest snapshot:', {
        timestamp: latest.timestamp,
        total_value_ae: latest.total_value_ae,
        total_value_usd: latest.total_value_usd,
        convertTo,
      });
    }
    
    if (convertTo === 'ae') {
      return latest.total_value_ae;
    } else {
      // For fiat currencies, use total_value_usd if available (including zero values)
      // Note: total_value_usd contains the value converted to the requested currency (EUR, GBP, etc.), not just USD
      if (latest.total_value_usd != null) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Current Value] Using converted value: ${latest.total_value_usd} (currency: ${convertTo})`);
        }
        return latest.total_value_usd;
      }
      // Fallback: log warning and return AE value
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Current Value] Missing converted value in latest snapshot:', latest);
      }
      return latest.total_value_ae;
    }
  }, [portfolioData, convertTo]);

  // Check if container is ready - continuously check until ready
  useEffect(() => {
    if (containerReady || chartRef.current) return;
    
    const checkContainer = () => {
      if (chartContainerRef.current && chartContainerRef.current.clientWidth > 0) {
        setContainerReady(true);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkContainer()) return;
    
    // If not ready, set up interval to check periodically
    const intervalId = setInterval(() => {
      if (checkContainer() || chartRef.current) {
        clearInterval(intervalId);
      }
    }, 50);
    
    return () => clearInterval(intervalId);
  }, [containerReady]);

  // Initialize chart once when container is available
  // Chart should persist across time range changes
  useEffect(() => {
    // Don't initialize if chart already exists
    if (chartRef.current) return;
    
    // Don't initialize if container isn't ready
    if (!containerReady || !chartContainerRef.current) return;
    
    const container = chartContainerRef.current;
    
    // Double-check container has width
    if (container.clientWidth === 0) return;
    
    // Container is ready, initialize chart

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 180,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      leftPriceScale: {
        visible: false,
        borderVisible: false,
      },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      crosshair: {
        mode: 1, // Normal crosshair mode (shows on hover/touch)
        vertLine: {
          visible: true,
          color: 'rgba(34, 197, 94, 0.5)', // Green vertical line
          width: 1,
          style: 0, // Solid line
        },
        horzLine: {
          visible: false, // Hide horizontal line
        },
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Add portfolio value series with green area fill (mobile-style)
    const currentConvertTo = convertTo;
    const seriesOptions: AreaSeriesPartialOptions = {
      priceLineVisible: false,
      lineColor: '#22c55e', // Green color
      topColor: 'rgba(34, 197, 94, 0.3)', // Lighter green for area fill
      bottomColor: 'rgba(34, 197, 94, 0.01)', // Very light green gradient
      lineWidth: 2,
      crosshairMarkerVisible: true, // Show green dot on hover
      crosshairMarkerRadius: 6, // Size of the dot
      crosshairMarkerBorderColor: '#22c55e', // Green border
      crosshairMarkerBackgroundColor: '#22c55e', // Green fill
      baseLineVisible: false,
      priceFormat: {
        type: 'custom',
        minMove: 0.000001,
        formatter: (price: number) => {
          if (currentConvertTo === 'ae') {
            return `${price.toFixed(4)} AE`;
          }
          // For fiat currencies, price is already in that currency (e.g., USD)
          const currencyCode = currentCurrencyInfo.code.toUpperCase();
          return Number(price).toLocaleString('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        },
      },
    };

    const areaSeries = chart.addSeries(AreaSeries, seriesOptions);
    seriesRef.current = areaSeries;

    // Subscribe to crosshair moves to show price on hover/drag
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData) {
        const priceData = param.seriesData.get(areaSeries) as LineData | undefined;
        if (priceData && typeof priceData.value === 'number') {
          setHoveredPrice({
            price: priceData.value,
            time: param.time as number,
          });
        } else {
          setHoveredPrice(null);
        }
      } else {
        setHoveredPrice(null);
      }
    });
    
    // If data is already available, set it immediately
    if (portfolioData && portfolioData.length > 0) {
      const chartData: LineData[] = portfolioData
        .map((snapshot) => {
          const timestamp = moment(snapshot.timestamp).unix();
          let value: number | null = null;
          
          if (convertTo === 'ae') {
            value = snapshot.total_value_ae;
          } else {
            if (snapshot.total_value_usd != null) {
              value = snapshot.total_value_usd;
            } else {
              return null;
            }
          }
          
          return {
            time: timestamp as any,
            value: value as number,
          };
        })
        .filter((item): item is LineData => item !== null);
      
      if (chartData.length > 0) {
        areaSeries.setData(chartData);
        chart.timeScale().fitContent();
      }
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
      
      // Prevent scrolling past current time - always enforce this constraint
      const currentTime = moment().unix();
      const visibleRange = chart.timeScale().getVisibleRange();
      if (visibleRange) {
        // If the visible range extends past current time, clamp it
        if (visibleRange.to > currentTime) {
          // Only update if we have a valid from value (not null)
          if (visibleRange.from != null && typeof visibleRange.from === 'number') {
            // Calculate the duration to maintain the same visible range duration
            const rangeDuration = visibleRange.to - visibleRange.from;
            const newFrom = Math.max(visibleRange.from, currentTime - rangeDuration);
            
            chart.timeScale().setVisibleRange({
              from: newFrom,
              to: currentTime,
            });
            // Update tracking with corrected range
            const correctedLogicalRange = chart.timeScale().getVisibleLogicalRange();
            if (correctedLogicalRange) {
              lastVisibleRangeRef.current = { from: correctedLogicalRange.from, to: correctedLogicalRange.to };
            }
          }
          return; // Exit early to prevent loading more data when correcting scroll
        }
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
      
      const barsInfo = seriesRef.current?.barsInLogicalRange(logicalRange);
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
    
    // Also subscribe to time scale changes to prevent scrolling past current time
    const handleTimeScaleChange = () => {
      const currentTime = moment().unix();
      const visibleRange = chart.timeScale().getVisibleRange();
      if (visibleRange && visibleRange.to > currentTime) {
        if (visibleRange.from != null && typeof visibleRange.from === 'number') {
          const rangeDuration = visibleRange.to - visibleRange.from;
          const newFrom = Math.max(visibleRange.from, currentTime - rangeDuration);
          chart.timeScale().setVisibleRange({
            from: newFrom,
            to: currentTime,
          });
        }
      }
    };
    
    chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeScaleChange);

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
      // Only cleanup on unmount, not when data changes
      if (chart && !chartContainerRef.current) {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeScaleChange);
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
        chart.remove(); // Removing chart automatically cleans up all subscriptions
        chartRef.current = null;
        if (seriesRef.current) {
          seriesRef.current = null;
        }
        // Reset initial load flag when chart is destroyed
        initialLoadRef.current = true;
        lastVisibleRangeRef.current = null;
        setHoveredPrice(null);
        setContainerReady(false);
      }
    };
  }, [containerReady]); // Only run when container becomes ready, data updates handled by separate effect

  // Track previous time range to detect changes
  const previousTimeRangeRef = useRef<TimeRange>(selectedTimeRange);

  // Update chart data when portfolio data, currency, or time range changes
  useEffect(() => {
    // Wait for chart to be initialized
    if (!chartRef.current || !seriesRef.current) {
      // Chart not initialized yet, wait for it
      if (process.env.NODE_ENV === 'development') {
        console.log('[AccountPortfolio] Chart not ready yet, waiting...', {
          chartExists: !!chartRef.current,
          seriesExists: !!seriesRef.current,
          portfolioDataLength: portfolioData?.length || 0,
        });
      }
      return;
    }
    
    if (!portfolioData || portfolioData.length === 0) {
      // Reset the flag if no data
      isUpdatingDataRef.current = false;
      if (process.env.NODE_ENV === 'development') {
        console.log('[AccountPortfolio] No portfolio data available');
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[AccountPortfolio] Updating chart data', {
        dataPoints: portfolioData.length,
        convertTo,
        selectedTimeRange,
      });
    }

    // Detect if time range changed
    const isTimeRangeChange = previousTimeRangeRef.current !== selectedTimeRange;

    // Mark that we're updating data to prevent scroll handler from triggering
    isUpdatingDataRef.current = true;

    const chartData: LineData[] = portfolioData
      .map((snapshot, index) => {
        const timestamp = moment(snapshot.timestamp).unix();
        let value: number | null = null;
        
        if (convertTo === 'ae') {
          value = snapshot.total_value_ae;
        } else {
          // For fiat currencies, use total_value_usd if available (including zero values)
          // Note: total_value_usd contains the value converted to the requested currency (EUR, GBP, etc.), not just USD
          if (snapshot.total_value_usd != null) {
            value = snapshot.total_value_usd;
          } else {
            // Log warning if converted value is missing
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[Chart Data] Missing converted value for ${moment(snapshot.timestamp).format('YYYY-MM-DD HH:mm')}: total_value_ae=${snapshot.total_value_ae}, total_value_usd=${snapshot.total_value_usd}, ae_balance=${snapshot.ae_balance}, convertTo=${convertTo}`);
            }
            // Skip this data point to show a gap rather than misleading zero value
            return null;
          }
        }
        
        // Debug log for first few and last few data points (development only)
        if (process.env.NODE_ENV === 'development' && (index < 3 || index >= portfolioData.length - 3)) {
          console.log(`[Chart Data] ${moment(snapshot.timestamp).format('YYYY-MM-DD HH:mm')}: total_value_ae=${snapshot.total_value_ae}, total_value_usd=${snapshot.total_value_usd}, ae_balance=${snapshot.ae_balance}, convertTo=${convertTo}, value=${value}`);
        }
        
        return {
          time: timestamp as any,
          value: value as number,
        };
      })
      .filter((item): item is LineData => item !== null);

    const chart = chartRef.current;
    const timeScale = chart?.timeScale();
    
    // Update series price formatter when currency changes
    if (seriesRef.current) {
      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'custom',
          minMove: 0.000001,
          formatter: (price: number) => {
            if (convertTo === 'ae') {
              return `${price.toFixed(4)} AE`;
            }
            // For fiat currencies, price is already in that currency (e.g., USD)
            const currencyCode = currentCurrencyInfo.code.toUpperCase();
            return Number(price).toLocaleString('en-US', {
              style: 'currency',
              currency: currencyCode,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          },
        },
      });
    }
    
    // Update the series data
    seriesRef.current.setData(chartData);
    
    // Set maximum visible range to prevent scrolling past current time
    const currentTime = moment().unix();
    if (chart) {
      // Apply options to prevent scrolling past current time
      chart.timeScale().applyOptions({
        rightBarStaysOnScroll: true,
      });
    }
    
    // When time range changes, always fit content to show the new range
    // When currency changes or loading more data, preserve scroll position
    if (isTimeRangeChange) {
      // Time range changed - fit content to show the full new range
      if (chart && chartData.length > 0) {
        chart.timeScale().fitContent();
        // Ensure we don't show future data
        const visibleRange = chart.timeScale().getVisibleRange();
        if (visibleRange && visibleRange.to > currentTime) {
          if (visibleRange.from != null && typeof visibleRange.from === 'number') {
            chart.timeScale().setVisibleRange({
              from: visibleRange.from,
              to: currentTime,
            });
          }
        }
        // Update tracking after fitting
        requestAnimationFrame(() => {
          const logicalRange = chart.timeScale().getVisibleLogicalRange();
          if (logicalRange) {
            lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
          }
          initialLoadRef.current = true;
          setTimeout(() => {
            isUpdatingDataRef.current = false;
          }, 100);
        });
      } else {
        isUpdatingDataRef.current = false;
      }
      // Update the previous time range reference
      previousTimeRangeRef.current = selectedTimeRange;
    } else {
      // Currency changed or loading more data - preserve scroll position
      const visibleRange = timeScale?.getVisibleRange();
      
      if (chart && visibleRange && chartData.length > 0) {
        // Restore visible range to preserve scroll position
        const restoredTo = Math.min(visibleRange.to, currentTime);
        if (visibleRange.from != null && typeof visibleRange.from === 'number') {
          timeScale.setVisibleRange({
            from: visibleRange.from,
            to: restoredTo,
          });
        }
        // Use requestAnimationFrame to ensure the range is set before updating tracking
        requestAnimationFrame(() => {
          const logicalRange = timeScale.getVisibleLogicalRange();
          if (logicalRange) {
            lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
          }
          initialLoadRef.current = false;
          setTimeout(() => {
            isUpdatingDataRef.current = false;
          }, 100);
        });
      } else if (chart && chartData.length > 0) {
        // No visible range yet (initial load) - fit content
        chart.timeScale().fitContent();
        requestAnimationFrame(() => {
          const logicalRange = chart.timeScale().getVisibleLogicalRange();
          if (logicalRange) {
            lastVisibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
          }
          initialLoadRef.current = true;
          setTimeout(() => {
            isUpdatingDataRef.current = false;
          }, 100);
        });
      } else {
        isUpdatingDataRef.current = false;
      }
    }
  }, [portfolioData, convertTo, selectedTimeRange, currentCurrencyInfo]);

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="mt-4 mb-6">
        <div className="bg-white/[0.02] border border-red-500/30 rounded-2xl overflow-hidden">
          <div className="px-4 md:px-6 pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Portfolio Value</h3>
            </div>
            <div className="text-red-400 text-sm mb-3">Failed to load portfolio data</div>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-red-300 text-xs mb-3 opacity-75">{errorMessage}</div>
            )}
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/80 hover:text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 mb-6">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 pt-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">Portfolio Value</h3>
            {/* Currency toggle */}
            <button
              onClick={() => setUseCurrentCurrency(!useCurrentCurrency)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/80 hover:text-white"
            >
              {convertTo.toUpperCase()}
            </button>
          </div>
          <div className="mb-2 min-h-[3.5rem]">
            <span className={`text-3xl md:text-4xl font-extrabold ${hoveredPrice ? 'text-green-400' : 'text-white'} block min-h-[2.5rem] leading-tight`}>
              {hoveredPrice ? (
                convertTo === 'ae' 
                  ? `${Decimal.from(hoveredPrice.price).prettify()} AE`
                  : (() => {
                      const fiatValue = typeof hoveredPrice.price === 'number' ? hoveredPrice.price : Number(hoveredPrice.price);
                      const currencyCode = currentCurrencyInfo.code.toUpperCase();
                      return fiatValue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                    })()
              ) : currentValue !== null ? (
                convertTo === 'ae' 
                  ? `${Decimal.from(currentValue).prettify()} AE`
                  : (() => {
                      const fiatValue = typeof currentValue === 'number' ? currentValue : Number(currentValue);
                      const currencyCode = currentCurrencyInfo.code.toUpperCase();
                      return fiatValue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                    })()
              ) : (
                <span className="opacity-0">0.00 AE</span>
              )}
            </span>
            {/* Reserve space for timestamp to prevent height jump */}
            <div className="text-sm text-white/60 mt-1 h-5">
              {hoveredPrice ? (
                <span>{moment.unix(hoveredPrice.time).format('MMM D, YYYY HH:mm')}</span>
              ) : (
                <span className="opacity-0">&#8203;</span>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-4 md:px-6 pb-4">
          {isLoading ? (
            <div className="h-[180px] flex items-center justify-center">
              <div className="text-white/60">Loading portfolio data...</div>
            </div>
          ) : portfolioData && portfolioData.length > 0 ? (
            <>
              <div 
                ref={chartContainerRef} 
                className="w-full h-[180px] min-w-0 touch-none"
                style={{ touchAction: 'none' }}
              />
              {isFetchingPreviousPage && (
                <div className="mt-2 text-center">
                  <div className="text-white/60 text-xs">Loading previous data...</div>
                </div>
              )}
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <div className="text-white/60">No portfolio data available</div>
            </div>
          )}
        </div>

        {/* Time range buttons - below chart */}
        <div className="px-4 md:px-6 pb-4">
          <div className="flex gap-2 justify-center">
            {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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
  );
}

