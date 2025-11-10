import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, LineData, ColorType, AreaSeries, AreaSeriesPartialOptions, CrosshairMode } from 'lightweight-charts';
import moment from 'moment';
import { TrendminerApi } from '@/api/backend';
import { useCurrencies } from '@/hooks/useCurrencies';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';
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
  '6h': { days: 0.25, interval: 3600 }, // 6 hours, hourly intervals
  '1d': { days: 1, interval: 3600 }, // 1 day, hourly intervals
  '1w': { days: 7, interval: 86400 }, // 7 days, daily intervals
  '1m': { days: 30, interval: 86400 }, // 30 days, daily intervals
  'all': { days: Infinity, interval: 86400 }, // All time, daily intervals
} as const;

type TimeRange = keyof typeof TIME_RANGES;

const MIN_START_DATE = moment('2025-01-01T00:00:00Z');

export default function AccountPortfolio({ address }: AccountPortfolioProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const portfolioDataRef = useRef<PortfolioSnapshot[] | undefined>(undefined);
  const convertToRef = useRef<string>('ae');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1m');
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false);
  const [hoveredPrice, setHoveredPrice] = useState<{ price: number; time: number } | null>(null);

  const { currentCurrencyInfo } = useCurrencies();
  const convertTo = useMemo(
    () => (useCurrentCurrency ? currentCurrencyInfo.code.toLowerCase() : 'ae'),
    [useCurrentCurrency, currentCurrencyInfo.code]
  );

  // Keep convertTo ref up to date
  useEffect(() => {
    convertToRef.current = convertTo;
  }, [convertTo]);

  // Fetch current portfolio value separately
  const { value: currentPortfolioValue } = usePortfolioValue({
    address,
    convertTo: convertTo as any,
    enabled: !!address,
  });

  // Calculate date range for the selected time range
  const dateRange = useMemo(() => {
    const range = TIME_RANGES[selectedTimeRange];
    const endDate = moment();
    
    let startDate: moment.Moment;
    if (range.days === Infinity) {
      startDate = MIN_START_DATE;
    } else if (selectedTimeRange === '6h') {
      startDate = moment().subtract(6, 'hours');
    } else {
      startDate = moment().subtract(range.days, 'days');
      if (startDate.isBefore(MIN_START_DATE)) {
        startDate = MIN_START_DATE;
      }
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      interval: range.interval,
    };
  }, [selectedTimeRange]);

  // Fetch portfolio history - simple useQuery with stable cache key
  const {
    data: portfolioData,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    // Stable query key: only changes when time range or currency changes
    queryKey: ['portfolio-history', address, selectedTimeRange, convertTo],
    queryFn: async () => {
      const response = await TrendminerApi.getAccountPortfolioHistory(address, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: dateRange.interval,
        convertTo: convertTo as any,
      });
      
      const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
      
      // Sort by timestamp ascending
      return snapshots.sort((a, b) => 
        moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf()
      );
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Keep portfolioData ref up to date for initialization effect
  useEffect(() => {
    portfolioDataRef.current = portfolioData;
  }, [portfolioData]);

  // Calculate display value
  const displayValue = useMemo(() => {
    if (hoveredPrice) {
      return hoveredPrice.price;
    }
    
    if (currentPortfolioValue) {
      try {
        return typeof currentPortfolioValue.toNumber === 'function' 
          ? currentPortfolioValue.toNumber()
          : typeof currentPortfolioValue === 'number'
          ? currentPortfolioValue
          : Number(currentPortfolioValue);
      } catch {
        return null;
      }
    }
    
    return null;
  }, [hoveredPrice, currentPortfolioValue]);

  // Check container readiness and initialize chart
  useEffect(() => {
    if (chartRef.current) return; // Already initialized
    
    let resizeObserver: ResizeObserver | null = null;
    let windowResizeHandler: (() => void) | null = null;
    let touchHandlers: {
      handleTouchStart: (e: TouchEvent) => void;
      handleTouchMove: (e: TouchEvent) => void;
      handleTouchEnd: (e: TouchEvent) => void;
      container: HTMLDivElement;
    } | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const checkAndInit = () => {
      if (!chartContainerRef.current) return false;

    const container = chartContainerRef.current;
      if (container.clientWidth === 0) return false; // Not ready yet
      
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
        scaleMargins: {
          top: 0.1,
          bottom: 0,
        },
      },
      leftPriceScale: {
        visible: false,
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0,
        },
      },
      timeScale: {
        visible: false,
        borderVisible: false,
        rightOffset: 0,
        leftOffset: 0,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          visible: true,
          color: 'rgba(34, 197, 94, 0.5)',
          width: 1,
          style: 0,
        },
        horzLine: {
          visible: false,
        },
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    const seriesOptions: AreaSeriesPartialOptions = {
      priceLineVisible: false,
        lineColor: '#22c55e',
        topColor: 'rgba(34, 197, 94, 0.3)',
        bottomColor: 'rgba(34, 197, 94, 0.01)',
      lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBorderColor: '#22c55e',
        crosshairMarkerBackgroundColor: '#22c55e',
      baseLineVisible: false,
      priceFormat: {
        type: 'custom',
        minMove: 0.000001,
        formatter: (price: number) => {
            if (convertTo === 'ae') {
            return `${price.toFixed(4)} AE`;
          }
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

      // Subscribe to crosshair moves
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

    // Add touch handlers for mobile drag support
    // Track initial touch position and drag direction
    let initialTouchX: number | null = null;
    let initialTouchY: number | null = null;
    let lastTouchY: number | null = null;
    let isHorizontalDrag: boolean | null = null;
    let hasMoved: boolean = false;
    const DRAG_THRESHOLD = 3; // pixels to determine drag direction (reduced for faster detection)

    const handleTouchStart = (e: TouchEvent) => {
      if (!chart || !container || !areaSeries) return;
      
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      initialTouchX = touch.clientX;
      initialTouchY = touch.clientY;
      lastTouchY = touch.clientY;
      isHorizontalDrag = null;
      hasMoved = false;
      
      const x = touch.clientX - rect.left;
      
      try {
        // Use timeScale to convert coordinate to time
        const time = chart.timeScale().coordinateToTime(x);
        if (time !== null) {
          // Set crosshair position - chart will calculate Y automatically from time
          chart.setCrosshairPosition(x, 0, { time: time as any });
        }
      } catch (error) {
        console.warn('[AccountPortfolio] Error setting crosshair on touchstart:', error);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!chart || !container || !areaSeries || initialTouchX === null || initialTouchY === null) {
        return;
      }
      
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - initialTouchX);
      const deltaY = Math.abs(touch.clientY - initialTouchY);
      const currentY = touch.clientY;
      const lastY = lastTouchY ?? initialTouchY;
      
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const clampedX = Math.max(0, Math.min(x, rect.width));
      
      // Determine drag direction if not yet determined
      if (isHorizontalDrag === null) {
        // Check if we've moved enough to determine direction
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isHorizontalDrag = deltaX > deltaY;
          hasMoved = true;
          
          // If horizontal, prevent default immediately
          if (isHorizontalDrag) {
            e.preventDefault();
            e.stopPropagation();
          }
        } else {
          // Still within threshold - update crosshair position but don't prevent default yet
          try {
            const time = chart.timeScale().coordinateToTime(clampedX);
            if (time !== null) {
              chart.setCrosshairPosition(clampedX, 0, { time: time as any });
            }
          } catch (error) {
            // Ignore errors during threshold phase
          }
          return;
        }
      }
      
      // Handle based on drag direction
      if (isHorizontalDrag === true) {
        // Horizontal drag: prevent default and move crosshair
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const time = chart.timeScale().coordinateToTime(clampedX);
          if (time !== null) {
            // Ensure we have valid time before setting crosshair
            const timeValue = time as number;
            
            // Check if time is within visible range
            const visibleRange = chart.timeScale().getVisibleRange();
            if (visibleRange && visibleRange.from && visibleRange.to) {
              const fromTime = visibleRange.from as number;
              const toTime = visibleRange.to as number;
              
              if (timeValue >= fromTime && timeValue <= toTime) {
                // Set crosshair position using X coordinate and time
                // When time is provided, chart automatically calculates Y from series data
                chart.setCrosshairPosition(clampedX, 0, { time: timeValue as any });
                
                // Log occasionally to avoid spam
                if (Math.random() < 0.05) {
                  console.log('[AccountPortfolio] Moving crosshair:', { clampedX, time: timeValue, inRange: true });
                }
              } else {
                console.warn('[AccountPortfolio] Time out of visible range:', { timeValue, fromTime, toTime });
              }
            } else {
              // Fallback: set crosshair even if visible range not available
              chart.setCrosshairPosition(clampedX, 0, { time: timeValue as any });
            }
          } else {
            console.warn('[AccountPortfolio] Could not convert X to time:', clampedX);
          }
        } catch (error) {
          console.warn('[AccountPortfolio] Error setting crosshair on touchmove:', error);
        }
      } else {
        // Vertical drag: manually scroll the page
        e.preventDefault();
        e.stopPropagation();
        
        const scrollDelta = currentY - lastY;
        window.scrollBy(0, -scrollDelta);
        
        // Update last Y for next move to enable continuous scrolling
        lastTouchY = currentY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Only prevent default if it was a horizontal drag
      if (isHorizontalDrag === true) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      if (!chart) {
        // Reset drag state even if chart is not available
        initialTouchX = null;
        initialTouchY = null;
        lastTouchY = null;
        isHorizontalDrag = null;
        hasMoved = false;
        return;
      }
      
      try {
        // If it was a horizontal drag, jump crosshair back to current time
        if (isHorizontalDrag === true) {
          console.log('[AccountPortfolio] Horizontal drag ended, jumping to current time');
          const visibleRange = chart.timeScale().getVisibleRange();
          
          // Use the end of visible range (which represents the latest data point / current time)
          if (visibleRange && visibleRange.to) {
            const endTime = visibleRange.to as number;
            const endX = chart.timeScale().timeToCoordinate(endTime);
            
            if (endX !== null && endX >= 0) {
              // Set crosshair to current time position (end of visible range)
              chart.setCrosshairPosition(endX, 0, { time: endTime as any });
              console.log('[AccountPortfolio] Crosshair set to current time:', { endTime, endX });
            } else {
              console.warn('[AccountPortfolio] Could not convert end time to coordinate');
              // Fallback: try current unix time
              const currentTime = moment().unix();
              const currentX = chart.timeScale().timeToCoordinate(currentTime);
              if (currentX !== null && currentX >= 0) {
                chart.setCrosshairPosition(currentX, 0, { time: currentTime as any });
              } else {
                // Last resort: clear crosshair
                chart.setCrosshairPosition(-1, -1, {});
                setHoveredPrice(null);
              }
            }
          } else {
            console.warn('[AccountPortfolio] No visible range available');
            chart.setCrosshairPosition(-1, -1, {});
            setHoveredPrice(null);
          }
        } else if (isHorizontalDrag === null && !hasMoved) {
          // Tap without drag: keep crosshair at tap position (already set in touchstart)
          console.log('[AccountPortfolio] Tap without drag, keeping crosshair at tap position');
          // Crosshair is already set in touchstart, so we don't need to do anything
        } else {
          // For vertical drags, clear crosshair
          console.log('[AccountPortfolio] Vertical drag, clearing crosshair');
          chart.setCrosshairPosition(-1, -1, {});
          setHoveredPrice(null);
        }
      } catch (error) {
        console.warn('[AccountPortfolio] Error handling crosshair on touchend:', error);
        // Fallback: clear crosshair on error
        try {
          chart.setCrosshairPosition(-1, -1, {});
          setHoveredPrice(null);
        } catch (e) {
          // Ignore fallback errors
        }
      }
      
      // Reset drag state
      initialTouchX = null;
      initialTouchY = null;
      lastTouchY = null;
      isHorizontalDrag = null;
      hasMoved = false;
    };

    // Add touch event listeners after chart is initialized
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      
      // Store handlers for cleanup
      touchHandlers = { handleTouchStart, handleTouchMove, handleTouchEnd, container };
    }
    
      // Handle resize - use ResizeObserver for container size changes
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          const newWidth = chartContainerRef.current.clientWidth;
          const newHeight = chartContainerRef.current.clientHeight;
          if (newWidth > 0 && newHeight > 0) {
            // Use both resize and applyOptions to ensure chart internal state is correct
            chart.resize(newWidth, newHeight);
            chart.applyOptions({
              width: newWidth,
              height: newHeight,
              timeScale: {
                rightOffset: 0,
                leftOffset: 0,
              },
            });
          }
        }
      };

      // Initial resize
      handleResize();

      // Use ResizeObserver to watch container size changes
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });

      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current);
      }

      // Also listen to window resize as fallback
      windowResizeHandler = () => handleResize();
      window.addEventListener('resize', windowResizeHandler);

      // If data is already available, set it immediately
      // This handles the case where data loads before chart initializes
      const currentData = portfolioDataRef.current;
      const currentConvertTo = convertToRef.current;
      if (currentData && currentData.length > 0) {
        const chartData: LineData[] = currentData
          .map((snapshot) => {
            const timestamp = moment(snapshot.timestamp).unix();
            let value: number | null = null;
            
            if (currentConvertTo === 'ae') {
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
          // Note: Current portfolio value will be added in the update effect
          // This is just for initial chart setup
          areaSeries.setData(chartData);
    const currentTime = moment().unix();
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
    }
      }

      return true; // Successfully initialized
    };

    // Try immediately
    const initializedImmediately = checkAndInit();

    // If not ready, check periodically
    if (!initializedImmediately) {
      intervalId = setInterval(() => {
        if (checkAndInit() || chartRef.current) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 100); // Check every 100ms

      // Also try on next frame
      timeoutId = setTimeout(() => {
        if (checkAndInit() || chartRef.current) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 0);
    }

    // Always return cleanup function to ensure resources are cleaned up
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (windowResizeHandler) {
        window.removeEventListener('resize', windowResizeHandler);
      }
      // Clean up touch event listeners
      if (touchHandlers) {
        touchHandlers.container.removeEventListener('touchstart', touchHandlers.handleTouchStart);
        touchHandlers.container.removeEventListener('touchmove', touchHandlers.handleTouchMove);
        touchHandlers.container.removeEventListener('touchend', touchHandlers.handleTouchEnd);
        touchHandlers.container.removeEventListener('touchcancel', touchHandlers.handleTouchEnd);
      }
      // Always clean up chart on unmount
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        setHoveredPrice(null);
      }
    };
  }, []); // Only run once on mount - use ref to access latest data

  // Update chart data when portfolio data, currency, or time range changes
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !portfolioData || portfolioData.length === 0) {
      return;
    }

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

    if (chartData.length === 0) return;

    // Always add current portfolio value as the last point with current timestamp
    if (currentPortfolioValue !== null && currentPortfolioValue !== undefined) {
      try {
        const currentValue = typeof currentPortfolioValue.toNumber === 'function' 
          ? currentPortfolioValue.toNumber()
          : typeof currentPortfolioValue === 'number'
          ? currentPortfolioValue
          : Number(currentPortfolioValue);

        if (!isNaN(currentValue) && isFinite(currentValue)) {
          // Calculate current timestamp based on time range
          let currentTimestamp: moment.Moment;
          
          if (selectedTimeRange === '6h' || selectedTimeRange === '1d') {
            // For hourly ranges, round down to the current hour (use UTC to match API timestamps)
            currentTimestamp = moment.utc().startOf('hour');
          } else {
            // For daily ranges (1w, 1m, all), round down to the current day (use UTC to match API timestamps)
            currentTimestamp = moment.utc().startOf('day');
          }
          
          const currentTimeUnix = currentTimestamp.unix();
          
          // Check if we should update the last point or add a new one
          const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
          const nowUnix = moment.utc().unix();
          
          if (lastPoint) {
            const lastPointTime = lastPoint.time as number;
            const lastPointValue = lastPoint.value as number;
            const valueMatches = Math.abs(lastPointValue - currentValue) < 0.000001;
            
            // If the last point has the same value, just update its timestamp to current time
            // This prevents visual drops when the value hasn't actually changed
            if (valueMatches) {
              // Only update timestamp if it's older than current time (don't move backwards)
              if (lastPointTime < nowUnix) {
                chartData[chartData.length - 1] = {
                  time: nowUnix as any,
                  value: currentValue,
                };
              }
              // If last point is already at or after current time, keep it as is
            } else {
              // Value is different - remove points at or after rounded timestamp and add new point
              while (chartData.length > 0 && (chartData[chartData.length - 1].time as number) >= currentTimeUnix) {
                chartData.pop();
              }
              // Add the current value as the last point with actual current timestamp
              chartData.push({
                time: nowUnix as any,
                value: currentValue,
              });
            }
          } else {
            // No existing points, add the current value with actual current timestamp
            chartData.push({
              time: nowUnix as any,
              value: currentValue,
            });
          }
        }
      } catch (error) {
        // Silently handle errors when converting current portfolio value
        console.warn('Failed to add current portfolio value to chart:', error);
      }
    }

    // Update price formatter when currency changes
    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'custom',
        minMove: 0.000001,
        formatter: (price: number) => {
          if (convertTo === 'ae') {
            return `${price.toFixed(4)} AE`;
          }
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

    // Ensure chart width matches container BEFORE setting data
    if (!chartContainerRef.current) return;
    
    const containerWidth = chartContainerRef.current.clientWidth;
    const containerHeight = chartContainerRef.current.clientHeight;
    
    if (containerWidth <= 0 || containerHeight <= 0) return;
    
    // Explicitly set width using both resize and applyOptions to ensure chart internal state is correct
    chartRef.current.resize(containerWidth, containerHeight);
    chartRef.current.applyOptions({
      width: containerWidth,
      height: containerHeight,
    });
    
    // Set data after ensuring width is correct
    seriesRef.current.setData(chartData);
    
    // Use double requestAnimationFrame to ensure chart has fully rendered before fitContent
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!chartRef.current || !chartContainerRef.current) return;
        
        // Ensure width is correct before fitContent
        const currentWidth = chartContainerRef.current.clientWidth;
        const currentHeight = chartContainerRef.current.clientHeight;
        if (currentWidth > 0 && currentHeight > 0) {
          chartRef.current.resize(currentWidth, currentHeight);
          chartRef.current.applyOptions({
            width: currentWidth,
            height: currentHeight,
          });
        }
        
        const currentTime = moment().unix();
        
        // Calculate the actual data range from chartData
        if (chartData.length > 0) {
          const firstTime = chartData[0].time as number;
          const lastTime = Math.min(chartData[chartData.length - 1].time as number, currentTime);
          
          // Set visible range directly to ensure full width without padding
          // This ensures the graph line always fills the entire plot area width
          chartRef.current.timeScale().setVisibleRange({
            from: firstTime,
            to: lastTime,
          });
        } else {
          // Fallback to fitContent if no data
          chartRef.current.timeScale().fitContent();
          
          // Ensure we don't show future data
          const visibleRange = chartRef.current.timeScale().getVisibleRange();
          if (visibleRange && visibleRange.to > currentTime) {
            if (visibleRange.from != null && typeof visibleRange.from === 'number') {
              chartRef.current.timeScale().setVisibleRange({
                from: visibleRange.from,
                to: currentTime,
              });
            }
          }
        }
        
        // Final resize after visible range adjustment
        // Use another requestAnimationFrame to ensure chart has fully rendered
        requestAnimationFrame(() => {
          if (!chartRef.current || !chartContainerRef.current) return;
          
          const finalWidth = chartContainerRef.current.clientWidth;
          const finalHeight = chartContainerRef.current.clientHeight;
          if (finalWidth > 0 && finalHeight > 0) {
            // Force resize to ensure plot area fills entire width
            chartRef.current.resize(finalWidth, finalHeight);
            chartRef.current.applyOptions({
              width: finalWidth,
              height: finalHeight,
              timeScale: {
                rightOffset: 0,
                leftOffset: 0,
              },
            });
            
            // Re-apply visible range to ensure graph fills full width after resize
            if (chartData.length > 0) {
              const firstTime = chartData[0].time as number;
              const lastTime = Math.min(chartData[chartData.length - 1].time as number, currentTime);
              chartRef.current.timeScale().setVisibleRange({
                from: firstTime,
                to: lastTime,
              });
            }
          }
        });
      });
    });
  }, [portfolioData, convertTo, selectedTimeRange, currentCurrencyInfo, currentPortfolioValue]);

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
            <button
              onClick={() => setUseCurrentCurrency(!useCurrentCurrency)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-colors bg-white/[0.05] hover:bg-white/[0.08] text-white/80 hover:text-white"
            >
              {convertTo.toUpperCase()}
            </button>
          </div>
          <div className="mb-2 min-h-[3.5rem]">
            <span className={`text-3xl md:text-4xl font-extrabold ${hoveredPrice ? 'text-green-400' : 'text-white'} block min-h-[2.5rem] leading-tight`}>
              {displayValue !== null ? (
                convertTo === 'ae' 
                  ? (() => {
                      try {
                        return `${Decimal.from(displayValue).prettify()} AE`;
                      } catch {
                        return `${Number(displayValue).toFixed(4)} AE`;
                      }
                    })()
                  : (() => {
                      try {
                        const fiatValue = typeof displayValue === 'number' ? displayValue : Number(displayValue);
                      const currencyCode = currentCurrencyInfo.code.toUpperCase();
                      return fiatValue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      } catch {
                        return `$${Number(displayValue).toFixed(2)}`;
                      }
                    })()
              ) : (
                <span className="opacity-0">0.00 AE</span>
              )}
            </span>
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
        <div className="px-4 md:px-6 pb-4 relative">
              <div 
                ref={chartContainerRef} 
                className="w-full h-[180px] min-w-0"
                style={{ touchAction: 'none' }}
              />
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute left-0 right-0 top-[30%] flex justify-center z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-white/10 rounded-full text-white text-xs font-medium">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-label="loading" />
                <span>Loading portfolio data...</span>
              </div>
            </div>
          )}
          
          {/* No data message */}
          {!isLoading && (!portfolioData || portfolioData.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none z-10">
              <div className="text-white/60">No portfolio data available</div>
            </div>
          )}
        </div>

        {/* Time range buttons */}
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
