import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import { TrendminerApi } from '@/api/backend';
import { useCurrencies } from '@/hooks/useCurrencies';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';
import { Decimal } from '@/libs/decimal';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  '1d': { days: 1, interval: 3600 }, // 1 day, hourly intervals
  '1w': { days: 7, interval: 86400 }, // 7 days, daily intervals
  '1m': { days: 30, interval: 86400 }, // 30 days, daily intervals
  'all': { days: Infinity, interval: 86400 }, // All time, daily intervals
} as const;

type TimeRange = keyof typeof TIME_RANGES;

const MIN_START_DATE = moment('2025-01-01T00:00:00Z');

interface RechartsChartProps {
  data: Array<{ time: number; timestamp: number; value: number; date: Date }>;
  onHover: (price: number, time: number) => void;
  convertTo: string;
  currentCurrencyInfo: { code: string };
}

// Recharts component with touch support
const RechartsChart: React.FC<RechartsChartProps> = ({
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

    // Mouse hover support for desktop
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      updateCrosshair(x);
    };

    const handleMouseLeave = () => {
      setCrosshairX(null);
      // Don't reset hover state - let parent component handle it
    };

    // Use { passive: false } to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
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
        .recharts-chart-container *,
        .recharts-chart-container svg,
        .recharts-chart-container svg * {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>
      <div
        ref={chartRef}
        className="w-full h-[180px] relative recharts-chart-container"
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
  const portfolioDataRef = useRef<PortfolioSnapshot[] | undefined>(undefined);
  const convertToRef = useRef<string>('ae');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1m');
  const [useCurrentCurrency, setUseCurrentCurrency] = useState(false);
  const [hoveredPrice, setHoveredPrice] = useState<{ price: number; time: number } | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [useTouchPopover, setUseTouchPopover] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipButtonRef = useRef<HTMLButtonElement>(null);
  const tooltipContentRef = useRef<HTMLDivElement>(null);

  const { currentCurrencyInfo } = useCurrencies();
  const convertTo = useMemo(
    () => (useCurrentCurrency ? currentCurrencyInfo.code.toLowerCase() : 'ae'),
    [useCurrentCurrency, currentCurrencyInfo.code]
  );

  // Keep convertTo ref up to date
  useEffect(() => {
    convertToRef.current = convertTo;
  }, [convertTo]);

  // Detect coarse pointer (mobile/tablet) for tooltip behavior
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(pointer: coarse)');
    const setFromMql = () => setIsCoarsePointer(!!mql.matches);
    setFromMql();
    try {
      mql.addEventListener('change', setFromMql);
    } catch {
      // Safari fallback
      // @ts-ignore
      mql.addListener(setFromMql);
    }
    return () => {
      try {
        mql.removeEventListener('change', setFromMql);
      } catch {
        // @ts-ignore
        mql.removeListener(setFromMql);
      }
    };
  }, []);

  // Broad touch/small-screen detection for devtools/mobile quirks
  useEffect(() => {
    const compute = () => {
      const hasTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0;
      const smallScreen = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
      setUseTouchPopover(isCoarsePointer || hasTouch || smallScreen);
    };
    compute();
    const resize = () => compute();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isCoarsePointer]);

  // Position tooltip manually on mobile
  useEffect(() => {
    if (!useTouchPopover || !tooltipOpen || !tooltipButtonRef.current || !tooltipContentRef.current) return;

    const positionTooltip = () => {
      const button = tooltipButtonRef.current;
      const content = tooltipContentRef.current;
      if (!button || !content) return;

      const buttonRect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Get content dimensions (may be 0 on first render, so use a reasonable default)
      const contentRect = content.getBoundingClientRect();
      const contentHeight = contentRect.height || 100; // fallback if not measured yet
      const contentWidth = contentRect.width || 320; // fallback if not measured yet

      // Position above the button
      let top = buttonRect.top - contentHeight - 8;
      let left = buttonRect.left;

      // Ensure it doesn't go off screen
      if (top < 8) {
        // If not enough space above, try positioning below
        top = buttonRect.bottom + 8;
        // Check if positioning below would overflow the bottom of the viewport
        if (top + contentHeight > viewportHeight - 8) {
          // If both above and below would overflow, position it in the direction with more space
          // while keeping it as close to the button as possible
          const spaceAbove = buttonRect.top - 8;
          const spaceBelow = viewportHeight - buttonRect.bottom - 8;
          
          if (spaceAbove >= spaceBelow && spaceAbove > 0) {
            // More space above, position above the button (may be partially cut off at top)
            top = Math.max(8, buttonRect.top - contentHeight - 8);
          } else if (spaceBelow > 0) {
            // More space below, position below the button (may be partially cut off at bottom)
            top = buttonRect.bottom + 8;
            // Clamp to bottom edge if it would overflow
            if (top + contentHeight > viewportHeight - 8) {
              top = viewportHeight - contentHeight - 8;
            }
          } else {
            // No space above or below (very edge case), position overlapping the button
            top = buttonRect.top - (contentHeight / 2);
            // Clamp to viewport bounds
            top = Math.max(8, Math.min(top, viewportHeight - contentHeight - 8));
          }
        }
      }
      // Final safety check: ensure it's within viewport bounds
      if (top < 8) {
        top = 8;
      }
      if (top + contentHeight > viewportHeight - 8) {
        top = viewportHeight - contentHeight - 8;
      }
      if (left + contentWidth > viewportWidth - 8) {
        left = viewportWidth - contentWidth - 8;
      }
      if (left < 8) {
        left = 8;
      }

      content.style.position = 'fixed';
      content.style.top = `${top}px`;
      content.style.left = `${left}px`;
      content.style.zIndex = '100';
    };

    // Use requestAnimationFrame to ensure DOM is ready
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const rafId = requestAnimationFrame(() => {
      positionTooltip();
      // Also position after a small delay to account for content sizing
      timeoutId = setTimeout(positionTooltip, 0);
    });

    // Position on resize/scroll
    window.addEventListener('resize', positionTooltip);
    window.addEventListener('scroll', positionTooltip, true);

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', positionTooltip);
      window.removeEventListener('scroll', positionTooltip, true);
    };
  }, [useTouchPopover, tooltipOpen]);

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

  // Prepare chart data for Recharts
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Portfolio Value</h3>
              {useTouchPopover ? (
                <>
                  <button
                    ref={tooltipButtonRef}
                    type="button"
                    aria-label="What does Portfolio Value include?"
                    aria-expanded={tooltipOpen}
                    className="relative p-1 rounded-md text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors touch-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTooltipOpen((v) => !v);
                    }}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {tooltipOpen && (
                    <>
                      {/* Backdrop to close on click outside */}
                      <div
                        className="fixed inset-0 z-[99]"
                        onClick={() => setTooltipOpen(false)}
                      />
                      {/* Tooltip content */}
                      <div
                        ref={tooltipContentRef}
                        className="max-w-[320px] rounded-xl border border-white/10 bg-white/10 text-white/90 backdrop-blur-md shadow-lg ring-1 ring-black/5 px-3 py-2 text-[12px] leading-relaxed z-[100]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Portfolio value summarizes the total worth of all assets held in this wallet — including AE balance, Trend tokens, and other assets such as WAE, aeETH and more. This chart represents the wallet's complete portfolio.
                      </div>
                    </>
                  )}
                </>
              ) : (
                <TooltipProvider delayDuration={150} skipDelayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="What does Portfolio Value include?"
                        className="p-1 rounded-md text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      align="start" 
                      sideOffset={8}
                      alignOffset={0}
                      className="max-w-[320px] z-[100]"
                    >
                      Portfolio value summarizes the total worth of all assets held in this wallet — including AE balance, Trend tokens, and other assets such as WAE, aeETH and more. This chart represents the wallet's complete portfolio.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
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

        {/* Chart - no padding, full width */}
        <div className="p-4 w-full">
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
              <RechartsChart
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

