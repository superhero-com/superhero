import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, LineData, ColorType, AreaSeries, AreaSeriesPartialOptions, CrosshairMode } from 'lightweight-charts';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import { TrendminerApi } from '@/api/backend';
import { useCurrencies } from '@/hooks/useCurrencies';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';
import { Decimal } from '@/libs/decimal';
import { IS_MOBILE } from '@/utils/constants';

interface AccountPortfolioProps {
  address: string;
}

interface PnlAmount {
  ae: number;
  usd: number;
}

interface TotalPnl {
  percentage: number;
  invested: PnlAmount;
  current_value: PnlAmount;
  gain: PnlAmount;
}

interface TokenPnl {
  current_unit_price: PnlAmount;
  percentage: number;
  invested: PnlAmount;
  current_value: PnlAmount;
  gain: PnlAmount;
}

interface PortfolioSnapshot {
  timestamp: string | Date;
  total_value_ae: number;
  ae_balance: number;
  tokens_value_ae: number;
  total_value_usd?: number;
  total_pnl?: TotalPnl;
  tokens_pnl?: Record<string, TokenPnl>;
}

const TIME_RANGES = {
  '1d': { days: 1, interval: 3600 }, // 1 day, hourly intervals
  '1w': { days: 7, interval: 86400 }, // 7 days, daily intervals
  '1m': { days: 30, interval: 86400 }, // 30 days, daily intervals
  'all': { days: Infinity, interval: 86400 }, // All time, daily intervals
} as const;

type TimeRange = keyof typeof TIME_RANGES;

const MIN_START_DATE = moment('2025-01-01T00:00:00Z');

interface MobileRechartsChartProps {
  data: Array<{ time: number; timestamp: number; value: number; date: Date }>;
  onHover: (price: number, time: number) => void;
  convertTo: string;
  currentCurrencyInfo: { code: string };
}

// Mobile Recharts component with touch support
const MobileRechartsChart: React.FC<MobileRechartsChartProps> = ({
  data,
  onHover,
  convertTo,
  currentCurrencyInfo,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [svgBounds, setSvgBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalDragRef = useRef<boolean | null>(null);
  const DRAG_THRESHOLD = 10; // pixels

  // Measure container size for ResponsiveContainer
  useEffect(() => {
    const updateSize = () => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        // Get the parent container to measure full width
        const parent = chartRef.current.parentElement;
        const parentRect = parent?.getBoundingClientRect();
        
        // Always use 180px for height to match the container
        const height = 180;
        
        if (rect.width > 0 && height > 0) {
          // Use parent width if available and larger, otherwise use container width
          const width = parentRect && parentRect.width > rect.width ? parentRect.width : rect.width;
          setContainerSize({ width, height });
          
          // Check if wrapper is ready (180px height)
          if (wrapperRef.current) {
            const wrapperRect = wrapperRef.current.getBoundingClientRect();
            if (wrapperRect.height >= 180) {
              setIsContainerReady(true);
            } else {
              // Force wrapper to 180px
              wrapperRef.current.style.height = '180px';
              wrapperRef.current.style.minHeight = '180px';
              wrapperRef.current.style.maxHeight = '180px';
              setIsContainerReady(true);
            }
          }
        } else {
          // If size is 0, try again on next frame
          requestAnimationFrame(() => {
            if (chartRef.current) {
              const newRect = chartRef.current.getBoundingClientRect();
              const newParent = chartRef.current.parentElement;
              const newParentRect = newParent?.getBoundingClientRect();
              const newHeight = 180;
              if (newRect.width > 0 && newHeight > 0) {
                const width = newParentRect && newParentRect.width > newRect.width ? newParentRect.width : newRect.width;
                setContainerSize({ width, height: newHeight });
              }
            }
          });
        }
      }
    };

    // Initial measurement with delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSize, 0);
    window.addEventListener('resize', updateSize);
    const resizeObserver = new ResizeObserver(updateSize);
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
      // Also observe parent if it exists
      if (chartRef.current.parentElement) {
        resizeObserver.observe(chartRef.current.parentElement);
      }
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, []);

  // Ensure wrapper is 180px before ResponsiveContainer renders
  useEffect(() => {
    if (wrapperRef.current && containerSize) {
      const checkAndSetHeight = () => {
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          if (rect.height < 180) {
            wrapperRef.current.style.height = '180px';
            wrapperRef.current.style.minHeight = '180px';
            wrapperRef.current.style.maxHeight = '180px';
          }
          // Use requestAnimationFrame to ensure DOM has updated
          requestAnimationFrame(() => {
            if (wrapperRef.current) {
              const newRect = wrapperRef.current.getBoundingClientRect();
              if (newRect.height >= 180) {
                setIsContainerReady(true);
              }
            }
          });
        }
      };
      
      checkAndSetHeight();
      // Also check after a short delay
      const timeoutId = setTimeout(checkAndSetHeight, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [containerSize]);

  // Measure actual SVG element bounds and plot area
  useEffect(() => {
    const measureSvg = () => {
      if (!chartRef.current) return;
      
      // Find the SVG element inside the container
      const svg = chartRef.current.querySelector('svg');
      if (svg) {
        const containerRect = chartRef.current.getBoundingClientRect();
        
        // Find the actual plot area - look for the clipPath or the main chart group
        // Recharts uses a clipPath to define the plot area
        const clipPath = svg.querySelector('defs clipPath');
        let plotArea = svg.querySelector('g[clip-path]');
        
        // If no clip-path group, try to find the cartesian grid or the area path parent
        if (!plotArea) {
          plotArea = svg.querySelector('g.recharts-cartesian-grid') || 
                     svg.querySelector('g.recharts-layer') ||
                     svg.querySelector('g');
        }
        
        let plotRect = svg.getBoundingClientRect();
        
        if (plotArea) {
          plotRect = plotArea.getBoundingClientRect();
        }
        
        // Calculate position relative to container
        setSvgBounds({
          left: plotRect.left - containerRect.left,
          top: plotRect.top - containerRect.top,
          width: plotRect.width,
          height: plotRect.height,
        });
      }
    };
    
    // Measure after a short delay to ensure SVG is rendered
    const timeoutId = setTimeout(measureSvg, 100);
    const intervalId = setInterval(measureSvg, 500); // Re-measure periodically
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [data, isContainerReady]);

  // Use native event listeners to allow preventDefault
  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    const updateCrosshair = (x: number) => {
      if (!container || data.length === 0) return;
      
      const rect = container.getBoundingClientRect();
      const clampedX = Math.max(0, Math.min(x, rect.width));
      
      // Find the closest data point based on time position
      const firstTime = data[0].time;
      const lastTime = data[data.length - 1].time;
      
      // Calculate X position as percentage of container width
      const xPercent = Math.max(0, Math.min(1, clampedX / rect.width));
      
      const targetTime = firstTime + (lastTime - firstTime) * xPercent;
      
      // Find closest point by time
      let closestIndex = 0;
      let minDiff = Math.abs(data[0].time - targetTime);
      for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].time - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
      
      const point = data[closestIndex];
      if (point) {
        // Calculate actual X position based on the point's time
        const pointXPercent = (point.time - firstTime) / (lastTime - firstTime);
        const pointX = pointXPercent * rect.width;
        setCrosshairX(pointX);
        onHover(point.value, point.time);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Prevent focus outline
      if (e.target instanceof HTMLElement) {
        e.target.blur();
      }
      if (container instanceof HTMLElement) {
        container.blur();
      }
      
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      dragStartRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      isDraggingRef.current = true;
      isHorizontalDragRef.current = null;
      updateCrosshair(dragStartRef.current.x);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;
      
      const deltaX = Math.abs(currentX - dragStartRef.current.x);
      const deltaY = Math.abs(currentY - dragStartRef.current.y);
      
      // Determine drag direction if not yet determined
      if (isHorizontalDragRef.current === null) {
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isHorizontalDragRef.current = deltaX > deltaY;
        }
      }
      
      // If horizontal drag, prevent default and update crosshair
      if (isHorizontalDragRef.current === true) {
        e.preventDefault();
        updateCrosshair(currentX);
      }
      // If vertical drag, allow default (scrolling)
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      isHorizontalDragRef.current = null;
      // Keep crosshair visible after drag ends
    };

    // Use { passive: false } to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [data, onHover]); // Re-run if data or onHover changes

  // Format X axis labels
  const formatXAxis = (tickItem: Date) => {
    return moment(tickItem).format('MMM D');
  };

  // Format Y axis labels
  const formatYAxis = (value: number) => {
    if (convertTo === 'ae') {
      return `${value.toFixed(2)}`;
    }
    return Number(value).toLocaleString('en-US', {
      style: 'currency',
      currency: currentCurrencyInfo.code.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Find the closest point to crosshair
  const crosshairPoint = crosshairX !== null && data.length > 0
    ? (() => {
        const firstTime = data[0].time;
        const lastTime = data[data.length - 1].time;
        const rect = chartRef.current?.getBoundingClientRect();
        if (!rect) return null;
        
        // Calculate X position as percentage of container width
        const xPercent = crosshairX / rect.width;
        const targetTime = firstTime + (lastTime - firstTime) * xPercent;
        
        // Find closest point by time
        let closestIndex = 0;
        let minDiff = Math.abs(data[0].time - targetTime);
        for (let i = 1; i < data.length; i++) {
          const diff = Math.abs(data[i].time - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
        
        return data[closestIndex];
      })()
    : null;

  return (
    <>
      <style>{`
        .mobile-chart-container *,
        .mobile-chart-container svg,
        .mobile-chart-container svg * {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>
      <div
        ref={chartRef}
        className="w-full h-[180px] relative mobile-chart-container"
        tabIndex={-1}
        style={{ 
          touchAction: 'pan-y', 
          width: '100%', 
          height: '180px', 
          minWidth: 0, 
          position: 'relative', 
          display: 'block',
          boxSizing: 'border-box',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={(e) => {
          // Prevent focus on touch
          e.currentTarget.blur();
          if (e.target instanceof HTMLElement) {
            e.target.blur();
          }
          // Also blur any parent elements that might be focusable
          let parent = e.currentTarget.parentElement;
          while (parent) {
            if (parent instanceof HTMLElement) {
              parent.blur();
            }
            parent = parent.parentElement;
          }
        }}
      >
      {data.length > 0 && (
        containerSize && containerSize.width > 0 ? (
          <div 
            ref={wrapperRef}
            tabIndex={-1}
            style={{ 
              width: containerSize.width, 
              height: '180px', 
              minWidth: 0, 
              minHeight: '180px',
              maxHeight: '180px',
              overflow: 'visible',
              position: 'relative',
              display: 'block',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isContainerReady && (
              <ResponsiveContainer 
                width={containerSize.width} 
                height={180}
              >
                <AreaChart
                  data={data}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" stopOpacity={1} />
                      <stop offset="100%" stopColor="rgba(34, 197, 94, 0.01)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    width={0}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    dot={false}
                    activeDot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={data}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(34, 197, 94, 0.01)" stopOpacity={1} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={false}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                width={0}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      )}
      {crosshairX !== null && crosshairPoint && (
        <>
          {/* Vertical crosshair line - match SVG height */}
          <div
            style={{
              position: 'absolute',
              left: `${crosshairX}px`,
              top: svgBounds ? `${svgBounds.top - 10}px` : '-10px',
              height: svgBounds ? `${svgBounds.height + 20}px` : '158px',
              width: '2px',
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
          {/* Crosshair dot - hidden on mobile for now */}
          {false && (
            <div
              style={{
                position: 'absolute',
                left: `${crosshairX}px`,
                top: `${(() => {
                  if (!svgBounds || !crosshairPoint) return '50%';
                  
                  const minValue = Math.min(...data.map(d => d.value));
                  const maxValue = Math.max(...data.map(d => d.value));
                  const valueRange = maxValue - minValue;
                  
                  if (valueRange === 0) return `${svgBounds.top + svgBounds.height / 2}px`;
                  
                  // Calculate value position: 0 = bottom, 1 = top
                  // Recharts plots from bottom to top, so higher values are at the top
                  const valuePercent = (crosshairPoint.value - minValue) / valueRange;
                  
                  // Account for AreaChart margin: { top: 5, right: 0, left: 0, bottom: 0 }
                  const marginTop = 5;
                  const plotHeight = svgBounds.height - marginTop;
                  
                  // Calculate Y position: top of plot area + margin + (inverted percent * plot height)
                  // Invert because CSS top=0 is at top, but we want min value at bottom
                  const y = svgBounds.top + marginTop + ((1 - valuePercent) * plotHeight);
                  return `${y}px`;
                })()}`,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '2px solid #22c55e',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 11,
              }}
            />
          )}
        </>
      )}
    </div>
    </>
  );
};

export default function AccountPortfolio({ address }: AccountPortfolioProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const portfolioDataRef = useRef<PortfolioSnapshot[] | undefined>(undefined);
  const convertToRef = useRef<string>('ae');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1m');
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false);
  const [hoveredPrice, setHoveredPrice] = useState<{ price: number; time: number } | null>(null);
  
  // Responsive mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || IS_MOBILE;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || IS_MOBILE);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        include: 'pnl', // Request PNL data
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

  // Fetch current PNL data separately for the latest snapshot
  const {
    data: currentPnlData,
    isLoading: isLoadingPnl,
  } = useQuery({
    queryKey: ['account-pnl', address],
    queryFn: async () => {
      return await TrendminerApi.getAccountPnl(address);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Calculate period PNL (change over the selected timeframe)
  const periodPnl = useMemo(() => {
    if (!portfolioData || portfolioData.length < 2) return null;
    
    const firstSnapshot = portfolioData[0];
    const lastSnapshot = portfolioData[portfolioData.length - 1];
    
    if (!firstSnapshot.total_pnl || !lastSnapshot.total_pnl) return null;
    
    // For period PNL, calculate the actual change in portfolio value
    // Period gain = (end portfolio value - start portfolio value) - purchases made during period
    // This shows the profit/loss from price movements, excluding new capital invested
    
    const purchasesDuringPeriod = {
      ae: lastSnapshot.total_pnl.invested.ae - firstSnapshot.total_pnl.invested.ae,
      usd: lastSnapshot.total_pnl.invested.usd - firstSnapshot.total_pnl.invested.usd,
    };
    
    // Use the actual portfolio value change (what the chart shows)
    const portfolioValueChange = {
      ae: lastSnapshot.total_value_ae - firstSnapshot.total_value_ae,
      usd: (lastSnapshot.total_value_usd || 0) - (firstSnapshot.total_value_usd || 0),
    };
    
    // Period gain = portfolio value change - purchases
    // If you bought tokens during the period, that increases portfolio value but isn't a gain
    const periodGain = {
      ae: portfolioValueChange.ae - purchasesDuringPeriod.ae,
      usd: portfolioValueChange.usd - purchasesDuringPeriod.usd,
    };
    
    // Calculate percentage - prioritize purchases during period if starting value is low
    // ROI should be calculated based on what was actually invested during the period
    let periodPercentage = 0;
    if (Math.abs(purchasesDuringPeriod.ae) > 0.000001) {
      // If purchases were made during the period, calculate ROI on those purchases
      periodPercentage = (periodGain.ae / Math.abs(purchasesDuringPeriod.ae)) * 100;
    } else {
      // If no purchases during period, calculate ROI based on starting portfolio value
      const startPortfolioValue = firstSnapshot.total_value_ae;
      if (startPortfolioValue > 0.000001) {
        periodPercentage = (periodGain.ae / startPortfolioValue) * 100;
      }
    }
    
    // Calculate portfolio value percentage change
    const startPortfolioValue = firstSnapshot.total_value_ae;
    const endPortfolioValue = lastSnapshot.total_value_ae;
    let portfolioValuePercentageChange = 0;
    if (startPortfolioValue > 0.000001) {
      portfolioValuePercentageChange = ((endPortfolioValue - startPortfolioValue) / startPortfolioValue) * 100;
    }
    
    return {
      gain: periodGain,
      invested: purchasesDuringPeriod,
      current_value: portfolioValueChange,
      percentage: periodPercentage,
      portfolio_value_percentage_change: portfolioValuePercentageChange,
    };
  }, [portfolioData]);

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

  // Prepare chart data for Recharts (mobile)
  const rechartsData = useMemo(() => {
    if (!portfolioData || portfolioData.length === 0) return [];
    
    const data = portfolioData
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
          time: timestamp,
          timestamp: timestamp,
          value: value as number,
          date: moment(snapshot.timestamp).toDate(),
        };
      })
      .filter((item): item is { time: number; timestamp: number; value: number; date: Date } => item !== null);

    // Add current portfolio value
    if (currentPortfolioValue !== null && currentPortfolioValue !== undefined) {
      try {
        const currentValue = typeof currentPortfolioValue.toNumber === 'function' 
          ? currentPortfolioValue.toNumber()
          : typeof currentPortfolioValue === 'number'
          ? currentPortfolioValue
          : Number(currentPortfolioValue);

        if (!isNaN(currentValue) && isFinite(currentValue)) {
          const nowUnix = moment.utc().unix();
          const lastPoint = data.length > 0 ? data[data.length - 1] : null;
          
          if (lastPoint && Math.abs(lastPoint.value - currentValue) < 0.000001) {
            // Same value, update timestamp if needed
            const timeDiff = nowUnix - lastPoint.time;
            if (timeDiff > 300) {
              data[data.length - 1] = {
                ...lastPoint,
                time: nowUnix,
                timestamp: nowUnix,
                date: moment.unix(nowUnix).toDate(),
              };
            }
          } else {
            // Different value, add new point
            data.push({
              time: nowUnix,
              timestamp: nowUnix,
              value: currentValue,
              date: moment.unix(nowUnix).toDate(),
            });
          }
        }
      } catch (error) {
        console.warn('Failed to add current portfolio value to chart:', error);
      }
    }

    return data.sort((a, b) => a.time - b.time);
  }, [portfolioData, convertTo, currentPortfolioValue]);

  // Check container readiness and initialize chart (desktop only)
  useEffect(() => {
    if (isMobile) return; // Skip lightweight-charts on mobile
    if (chartRef.current) return; // Already initialized
    
    let resizeObserver: ResizeObserver | null = null;
    let windowResizeHandler: (() => void) | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let touchStartHandler: ((e: TouchEvent) => void) | null = null;
    let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
    let touchEndHandler: ((e: TouchEvent) => void) | null = null;
    let touchContainer: HTMLDivElement | null = null;
    
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
      // Disable built-in touch drag - we handle it manually
      horzTouchDrag: false,
      vertTouchDrag: false,
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
      console.log('[AccountPortfolio] subscribeCrosshairMove fired:', { 
        time: param.time, 
        point: param.point,
        seriesData: param.seriesData ? 'exists' : 'null'
      });
      
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

    // Mobile touch handling - replicate mouse hover logic 1:1 but for touch drag
    // The library handles mousemove automatically - we'll simulate that for touch
    
    // Track if we're in a touch drag to prevent conflicts
    let isTouchDrag = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (!container || !chart) return;
      
      isTouchDrag = true;
      
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const clampedX = Math.max(0, Math.min(x, rect.width));
      const xPercent = (clampedX / rect.width) * 100;
      
      console.log(`[AccountPortfolio] Touch start: ${xPercent.toFixed(2)}% (${clampedX.toFixed(1)}px / ${rect.width.toFixed(1)}px)`);
      
      // Simulate full mouse interaction: mousedown -> mousemove
      // This activates mouse mode in the library
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        buttons: 1,
      });
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        buttons: 1,
      });
      
      // Dispatch mousedown first to activate mouse mode
      container.dispatchEvent(mouseDownEvent);
      
      // Then dispatch mousemove to set crosshair position
      container.dispatchEvent(mouseMoveEvent);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!container || !chart || !isTouchDrag) {
        return;
      }
      
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const clampedX = Math.max(0, Math.min(x, rect.width));
      const xPercent = (clampedX / rect.width) * 100;
      
      console.log(`[AccountPortfolio] X drag: ${xPercent.toFixed(2)}% (${clampedX.toFixed(1)}px / ${rect.width.toFixed(1)}px)`);
      
      // Try NOT preventing default - let library process touch naturally
      // Then manually update crosshair
      try {
        const time = chart.timeScale().coordinateToTime(clampedX);
        if (time !== null) {
          console.log('[AccountPortfolio] TouchMove: Setting crosshair directly:', { clampedX, time });
          
          // Set crosshair directly
          chart.setCrosshairPosition(clampedX, 0, { time: time as any });
          
          console.log('[AccountPortfolio] TouchMove: Crosshair set');
        }
      } catch (error) {
        console.error('[AccountPortfolio] Error updating crosshair:', error);
      }
      
      // Only prevent default if we're dragging horizontally
      // For now, always prevent to test
      e.preventDefault();
      e.stopPropagation();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!container) return;
      
      isTouchDrag = false;
      
      // Simulate mouseup to end mouse interaction
      const touch = e.changedTouches[0] || e.touches[0];
      if (touch) {
        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0,
          buttons: 0,
        });
        
        container.dispatchEvent(mouseUpEvent);
      }
      
      // Don't clear crosshair - keep it visible
      console.log('[AccountPortfolio] Touch end - crosshair remains visible');
    };

    // Add touch event listeners
    if (container) {
      touchStartHandler = handleTouchStart;
      touchMoveHandler = handleTouchMove;
      touchEndHandler = handleTouchEnd;
      touchContainer = container;
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
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
        if (chartRef.current || checkAndInit()) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }, 100); // Check every 100ms

      // Also try on next frame
      timeoutId = setTimeout(() => {
        if (chartRef.current || checkAndInit()) {
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
      if (touchContainer && touchStartHandler && touchMoveHandler && touchEndHandler) {
        touchContainer.removeEventListener('touchstart', touchStartHandler);
        touchContainer.removeEventListener('touchmove', touchMoveHandler);
        touchContainer.removeEventListener('touchend', touchEndHandler);
      }
      // Always clean up chart on unmount
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        setHoveredPrice(null);
      }
    };
  }, [isMobile]); // Re-run when mobile state changes

  // Update chart data when portfolio data, currency, or time range changes (desktop only)
  useEffect(() => {
    if (isMobile) return; // Skip lightweight-charts updates on mobile
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
          
          if (selectedTimeRange === '1d') {
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
            
            // If the last point has the same value, check if we need to update it
            if (valueMatches) {
              // Check how old the last point is relative to the current time
              const timeDiff = nowUnix - lastPointTime;
              
              // For 1d view, check if the last point is within the current hour
              // If it is and the value matches, don't update to avoid rendering issues
              let shouldSkipUpdate = false;
              if (selectedTimeRange === '1d') {
                const lastPointHour = moment.unix(lastPointTime).utc().startOf('hour').unix();
                const currentHour = moment.utc().startOf('hour').unix();
                
                // If the last point is already in the current hour and value matches,
                // don't update the timestamp - this prevents the visual drop
                if (lastPointHour === currentHour && timeDiff < 3600) {
                  // Last point is already in current hour with same value - skip update
                  // This prevents the chart from re-rendering incorrectly
                  shouldSkipUpdate = true;
                }
              }
              
              // Only update timestamp if it's significantly older (more than 5 minutes)
              // AND we're not skipping the update
              if (!shouldSkipUpdate && timeDiff > 300) {
                // Timestamp is more than 5 minutes old, update it
                chartData[chartData.length - 1] = {
                  time: nowUnix as any,
                  value: currentValue,
                };
              }
              // If timestamp is recent (within 5 minutes) or we're skipping update,
              // don't modify chartData - this prevents the chart from re-rendering and showing a drop
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
          
          // Ensure data is sorted by time (should already be sorted, but be safe)
          chartData.sort((a, b) => (a.time as number) - (b.time as number));
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
    
    // Remove any duplicate timestamps (keep the last one) to prevent rendering issues
    const cleanedChartData: LineData[] = [];
    const seenTimes = new Set<number>();
    
    // Process in reverse to keep the last occurrence of each timestamp
    for (let i = chartData.length - 1; i >= 0; i--) {
      const time = chartData[i].time as number;
      if (!seenTimes.has(time)) {
        seenTimes.add(time);
        cleanedChartData.unshift(chartData[i]);
      }
    }
    
    // Ensure we have at least 2 points for proper rendering
    // If the last two points have the same value, ensure they're both included
    const finalData = cleanedChartData.length > 0 ? cleanedChartData : chartData;
    
    // Set data after ensuring width is correct
    seriesRef.current.setData(finalData);
    
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
        // Use finalData which is cleanedChartData if available, otherwise chartData
        const dataForRange = finalData;
        if (dataForRange.length > 0) {
          const firstTime = dataForRange[0].time as number;
          // Use the last point's time directly to ensure it's fully visible
          // Don't clamp to currentTime as it might cause rendering issues
          const lastTime = dataForRange[dataForRange.length - 1].time as number;
          
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
            const dataForRange = finalData;
            if (dataForRange.length > 0) {
              const firstTime = dataForRange[0].time as number;
              // Use the last point's time directly to ensure it's fully visible
              const lastTime = dataForRange[dataForRange.length - 1].time as number;
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
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl md:text-4xl font-extrabold ${hoveredPrice ? 'text-green-400' : 'text-white'} min-h-[2.5rem] leading-tight`}>
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
              {/* Portfolio value percentage change - show for period PNL or when hovering */}
              {(() => {
                let portfolioPercentageChange: number | undefined;
                
                if (hoveredPrice && portfolioData && portfolioData.length > 0) {
                  // Calculate percentage change from start of period to hovered point
                  const firstSnapshot = portfolioData[0];
                  const hoveredTimestamp = hoveredPrice.time;
                  const closestSnapshot = portfolioData.reduce((closest, snapshot) => {
                    const snapshotTime = moment(snapshot.timestamp).unix();
                    const closestTime = closest ? moment(closest.timestamp).unix() : Infinity;
                    return Math.abs(snapshotTime - hoveredTimestamp) < Math.abs(closestTime - hoveredTimestamp)
                      ? snapshot
                      : closest;
                  });
                  
                  const startPortfolioValue = firstSnapshot.total_value_ae;
                  const hoveredPortfolioValue = closestSnapshot.total_value_ae;
                  
                  if (startPortfolioValue > 0.000001) {
                    portfolioPercentageChange = ((hoveredPortfolioValue - startPortfolioValue) / startPortfolioValue) * 100;
                  }
                } else if (periodPnl && periodPnl.portfolio_value_percentage_change !== undefined) {
                  portfolioPercentageChange = periodPnl.portfolio_value_percentage_change;
                }
                
                if (portfolioPercentageChange !== undefined && Math.abs(portfolioPercentageChange) > 0.0001) {
                  return (
                    <span className={`text-lg font-semibold ${portfolioPercentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioPercentageChange >= 0 ? '+' : ''}
                      {portfolioPercentageChange.toFixed(2)}%
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <div className="text-sm text-white/60 mt-1 h-5">
              {hoveredPrice ? (
                <span>{moment.unix(hoveredPrice.time).format('MMM D, YYYY HH:mm')}</span>
              ) : (
                <span className="opacity-0">&#8203;</span>
              )}
            </div>
          </div>
          
          {/* Profit/Loss Information */}
          {(periodPnl || (hoveredPrice && portfolioData)) && (
            <div className="mb-4 pt-3 border-t border-white/10">
              {(() => {
                // Use hovered snapshot PNL if available, otherwise use period PNL
                let pnlData: TotalPnl | undefined;
                if (hoveredPrice && portfolioData) {
                  // Find the snapshot closest to the hovered time
                  const hoveredTimestamp = hoveredPrice.time;
                  const closestSnapshot = portfolioData.reduce((closest, snapshot) => {
                    const snapshotTime = moment(snapshot.timestamp).unix();
                    const closestTime = closest ? moment(closest.timestamp).unix() : Infinity;
                    return Math.abs(snapshotTime - hoveredTimestamp) < Math.abs(closestTime - hoveredTimestamp)
                      ? snapshot
                      : closest;
                  });
                  pnlData = closestSnapshot?.total_pnl;
                } else if (periodPnl && portfolioData) {
                  // Use period PNL (convert to TotalPnl format)
                  // For period PNL, current_value should be the actual end value, not the change
                  const lastSnapshot = portfolioData[portfolioData.length - 1];
                  pnlData = {
                    percentage: periodPnl.percentage,
                    invested: periodPnl.invested,
                    current_value: {
                      ae: lastSnapshot.total_pnl?.current_value.ae || 0,
                      usd: lastSnapshot.total_pnl?.current_value.usd || 0,
                    },
                    gain: periodPnl.gain,
                  };
                  
                  // Add portfolio value percentage change for period PNL
                  (pnlData as any).portfolio_value_percentage_change = periodPnl.portfolio_value_percentage_change;
                }
                
                if (!pnlData) return null;
                
                const isPositive = pnlData.gain.ae >= 0;
                const gainValue = convertTo === 'ae' 
                  ? pnlData.gain.ae 
                  : (convertTo === 'usd' ? pnlData.gain.usd : pnlData.gain.usd);
                const investedValue = convertTo === 'ae'
                  ? pnlData.invested.ae
                  : (convertTo === 'usd' ? pnlData.invested.usd : pnlData.invested.usd);
                const currentValue = convertTo === 'ae'
                  ? pnlData.current_value.ae
                  : (convertTo === 'usd' ? pnlData.current_value.usd : pnlData.current_value.usd);
                
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Profit/Loss</div>
                      <div className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}
                        {convertTo === 'ae' 
                          ? `${Decimal.from(gainValue).prettify()} AE`
                          : (() => {
                              try {
                                const currencyCode = currentCurrencyInfo.code.toUpperCase();
                                return gainValue.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: currencyCode,
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                });
                              } catch {
                                return `$${Number(gainValue).toFixed(2)}`;
                              }
                            })()}
                      </div>
                      <div className={`text-xs ${isPositive ? 'text-green-400/80' : 'text-red-400/80'}`}>
                        {isPositive ? '+' : ''}{pnlData.percentage.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/60 mb-1">Total Purchased</div>
                      <div className="text-sm font-semibold text-white">
                        {convertTo === 'ae'
                          ? `${Decimal.from(investedValue).prettify()} AE`
                          : (() => {
                              try {
                                const currencyCode = currentCurrencyInfo.code.toUpperCase();
                                return investedValue.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: currencyCode,
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                });
                              } catch {
                                return `$${Number(investedValue).toFixed(2)}`;
                              }
                            })()}
                      </div>
                      <div className="text-xs text-white/60">
                        Current: {convertTo === 'ae'
                          ? `${Decimal.from(currentValue).prettify()} AE`
                          : (() => {
                              try {
                                const currencyCode = currentCurrencyInfo.code.toUpperCase();
                                return currentValue.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: currencyCode,
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                });
                              } catch {
                                return `$${Number(currentValue).toFixed(2)}`;
                              }
                            })()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Chart - no padding, full width */}
        <div className="p-4 w-full">
          {isMobile ? (
            // Recharts for mobile - full width
            <div 
              className="h-[180px] relative w-full" 
              tabIndex={-1}
              style={{ 
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={(e) => {
                // Prevent focus on touch
                e.currentTarget.blur();
                if (e.target instanceof HTMLElement) {
                  e.target.blur();
                }
              }}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center z-10 px-4 md:px-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-white/10 rounded-full text-white text-xs font-medium">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-label="loading" />
                    <span>Loading portfolio data...</span>
                  </div>
                </div>
              ) : rechartsData.length > 0 ? (
                <MobileRechartsChart
                  data={rechartsData}
                  onHover={(price, time) => setHoveredPrice({ price, time })}
                  convertTo={convertTo}
                  currentCurrencyInfo={currentCurrencyInfo}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none z-10 px-4 md:px-6">
                  <div className="text-white/60">No portfolio data available</div>
                </div>
              )}
            </div>
          ) : (
            // Lightweight-charts for desktop
            <div className="px-4 md:px-6 relative">
              <div 
                ref={chartContainerRef} 
                className="w-full h-[180px] min-w-0"
                style={{ touchAction: 'none' }}
              />
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
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

