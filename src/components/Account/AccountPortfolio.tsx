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
  '1w': { days: 7, interval: 21600 }, // 7 days, 6-hour intervals (4x as many intervals as original)
  '1m': { days: 30, interval: 86400 }, // 30 days, daily intervals
  'all': { days: Infinity, interval: 86400 }, // All time, daily intervals
} as const;

type TimeRange = keyof typeof TIME_RANGES;

const MIN_START_DATE = moment('2025-01-01T00:00:00Z');

interface RechartsChartProps {
  data: Array<{ time: number; timestamp: number; value: number; date: Date }>;
  onHover: (price: number | null, time: number | null) => void;
  convertTo: string;
  currentCurrencyInfo: { code: string };
}

// Recharts component with touch support - simplified with default styling
const RechartsChart: React.FC<RechartsChartProps> = ({
  data,
  onHover,
  convertTo,
  currentCurrencyInfo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);
  const [crosshairY, setCrosshairY] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalDragRef = useRef<boolean | null>(null);
  const DRAG_THRESHOLD = 10; // pixels

  // Use native event listeners to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Update crosshair position and find Y coordinate from SVG path
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
        setHoveredPoint(point);
        onHover(point.value, point.time);
        
        // Find Y position by querying the SVG path element
        // Use requestAnimationFrame to ensure SVG is rendered
          requestAnimationFrame(() => {
          const svg = container.querySelector('svg');
          if (svg) {
            // Find the stroke path (the actual data line), not the fill area
            // Recharts AreaChart has two paths: fill area (first) and stroke/curve (second)
            const paths = Array.from(svg.querySelectorAll('path')) as SVGPathElement[];
            let strokePath: SVGPathElement | null = null;
            
            // Strategy 1: Look for path with 'curve' in class name (most reliable)
            for (const path of paths) {
              const className = path.getAttribute('class') || '';
              if (className.includes('curve')) {
                strokePath = path;
                break;
        }
      }
            
            // Strategy 2: If not found, identify by path characteristics
            // The stroke path typically has a smaller bounding box height than the fill area
            if (!strokePath && paths.length > 1) {
              // Check bounding boxes - fill area spans full height, stroke is just the line
              const pathBounds = paths.map(p => {
                const bbox = p.getBBox();
                return { path: p, height: bbox.height, y: bbox.y };
              });
              
              // The stroke path should have a smaller height (just the line thickness)
              // Sort by height ascending - the smallest is likely the stroke
              pathBounds.sort((a, b) => a.height - b.height);
              
              // Use the path with smallest height, but make sure it's not too small (at least 10px)
              // and not at the very bottom (fill area typically starts near bottom)
              for (const { path: p } of pathBounds) {
                const bbox = p.getBBox();
                // Stroke path should be near the top/middle, not at the bottom
                if (bbox.height < svg.getBoundingClientRect().height * 0.9 && bbox.y < svg.getBoundingClientRect().height * 0.8) {
                  strokePath = p;
                  break;
                }
              }
            }
            
            // Strategy 3: Fallback to second path (stroke usually comes after fill in DOM order)
            if (!strokePath && paths.length > 1) {
              strokePath = paths[1];
          }
            
            // Only proceed if we found a valid stroke path
            // Verify it's actually the stroke path by checking its bounding box
            if (strokePath && strokePath.getTotalLength() > 0) {
              const pathBBox = strokePath.getBBox();
              const svgRect = svg.getBoundingClientRect();
              const svgHeight = svgRect.height;
              
              // Verify: stroke path should not span the full height (that would be fill area)
              // Stroke path bounding box should be reasonable (not too tall)
              if (pathBBox.height > svgHeight * 0.9) {
                // This is likely the fill area, skip it
                return;
              }
              
              const containerBounds = container.getBoundingClientRect();
        
              // Get the actual plot area bounds from the path's bounding box
              // This accounts for Recharts margins/padding
              const plotAreaLeft = pathBBox.x;
              const plotAreaWidth = pathBBox.width;
              const plotAreaTop = pathBBox.y;
              const plotAreaHeight = pathBBox.height;
        
              // Calculate X position within the plot area using the actual mouse position
              // Use xPercent (from mouse position) instead of pointXPercent (from data point time)
              // This ensures the crosshair follows the mouse, not the data point's time position
              const relativeX = plotAreaLeft + (xPercent * plotAreaWidth);
              
              // Set crosshair X position relative to container
              // Convert from SVG coordinates to container coordinates
              const crosshairXPos = svgRect.left - containerBounds.left + relativeX;
              setCrosshairX(crosshairXPos);
              
              // Use binary search to find the exact point on the path at this X coordinate
              const pathLength = strokePath.getTotalLength();
              
              // Clamp relativeX to path bounds to prevent edge case issues
              const pathStartX = pathBBox.x;
              const pathEndX = pathBBox.x + pathBBox.width;
              const clampedRelativeX = Math.max(pathStartX, Math.min(pathEndX, relativeX));

              // Binary search for the point closest to our X coordinate
              let low = 0;
              let high = pathLength;
              let bestPoint = { x: 0, y: 0 };
              let minDistance = Infinity;
              const tolerance = 0.1; // pixels
              
              // Binary search with refinement
              for (let iteration = 0; iteration < 50; iteration++) {
                const mid = (low + high) / 2;
                const pathPoint = strokePath.getPointAtLength(mid);
                const distance = pathPoint.x - clampedRelativeX;
                
                if (Math.abs(distance) < minDistance) {
                  minDistance = Math.abs(distance);
                  bestPoint = pathPoint;
                }
                
                if (Math.abs(distance) < tolerance) {
                  break; // Found close enough point
                }
                
                if (distance > 0) {
                  high = mid;
                } else {
                  low = mid;
                }
              }
              
              // Final refinement: check points around the best point
              const refinePercent = 0.01; // 1% of path
              const refineRange = pathLength * refinePercent;
              const refineLengthStart = Math.max(0, 
                (bestPoint.x - pathStartX) / pathBBox.width * pathLength - refineRange
              );
              const refineLengthEnd = Math.min(pathLength,
                (bestPoint.x - pathStartX) / pathBBox.width * pathLength + refineRange
              );
              
              for (let i = 0; i <= 100; i++) {
                const length = Math.max(0, Math.min(pathLength, 
                  refineLengthStart + (refineLengthEnd - refineLengthStart) * (i / 100)
                ));
                const pathPoint = strokePath.getPointAtLength(length);
                const distance = Math.abs(pathPoint.x - clampedRelativeX);
                if (distance < minDistance) {
                  minDistance = distance;
                  bestPoint = pathPoint;
                }
              }
              
              // Validate the Y position - it should be within the SVG bounds
              const y = svgRect.top - containerBounds.top + bestPoint.y;
              const containerTop = 0; // Relative to container
              const containerBottom = svgRect.height;
              
              // Only set Y if it's reasonable (not at the very bottom, which indicates fill area)
              // The Y should be within the SVG bounds and not too close to the bottom
              if (y >= containerTop && y <= containerBottom * 0.95) {
                setCrosshairY(y);
              }
            }
          }
        });
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
      setCrosshairY(null);
      setHoveredPoint(null);
      onHover(null, null); // Reset hover state in parent
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

  return (
      <div
      ref={containerRef}
      className="w-full h-[180px] relative"
        style={{ 
          touchAction: 'pan-y', 
          width: '100%', 
          height: '180px', 
        }}
      >
      {data.length > 0 && (
          <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(34, 197, 94, 0.01)" stopOpacity={1} />
                </linearGradient>
              </defs>
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
      {crosshairX !== null && crosshairY !== null && hoveredPoint && (
        <>
          {/* Vertical crosshair line */}
          <div
            style={{
              position: 'absolute',
              left: `${crosshairX}px`,
              top: 0,
              height: '180px',
              width: '1px',
              backgroundColor: '#22c55e',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
          {/* Crosshair dot */}
            <div
              style={{
                position: 'absolute',
                left: `${crosshairX}px`,
              top: `${crosshairY}px`,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 11,
              }}
            />
        </>
      )}
    </div>
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
      const sorted = snapshots.sort((a, b) => 
        moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf()
      );
      
      // Filter to ensure one point per interval period
      // Group snapshots by their interval period and take the latest one in each period
      const intervalSeconds = dateRange.interval;
      const periodMap = new Map<number, PortfolioSnapshot>();
      
      for (const snapshot of sorted) {
        const timestamp = moment(snapshot.timestamp).unix();
        // Calculate which interval period this timestamp belongs to
        const periodStart = Math.floor(timestamp / intervalSeconds) * intervalSeconds;
        
        // If we already have a snapshot for this period, keep the one closest to the period start
        // (or the latest one if they're equally close)
        const existing = periodMap.get(periodStart);
        if (!existing) {
          periodMap.set(periodStart, snapshot);
        } else {
          const existingTime = moment(existing.timestamp).unix();
          const existingDistance = Math.abs(existingTime - periodStart);
          const currentDistance = Math.abs(timestamp - periodStart);
          
          // Keep the one closer to the period start, or the later one if equidistant
          if (currentDistance < existingDistance || 
              (currentDistance === existingDistance && timestamp > existingTime)) {
            periodMap.set(periodStart, snapshot);
          }
        }
      }
      
      // Convert map values back to array and sort
      return Array.from(periodMap.values()).sort((a, b) => 
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
    
    const nowUnix = moment.utc().unix();
    
    const data = portfolioData
      .map((snapshot) => {
        const timestamp = moment(snapshot.timestamp).unix();
        
        // Filter out any future data points
        if (timestamp > nowUnix) {
          return null;
        }
        
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

    // Add current portfolio value, but don't create a future point
    if (currentPortfolioValue !== null && currentPortfolioValue !== undefined) {
      try {
        const currentValue = typeof currentPortfolioValue.toNumber === 'function' 
          ? currentPortfolioValue.toNumber()
          : typeof currentPortfolioValue === 'number'
          ? currentPortfolioValue
          : Number(currentPortfolioValue);

        if (!isNaN(currentValue) && isFinite(currentValue)) {
          const lastPoint = data.length > 0 ? data[data.length - 1] : null;
          
          // Only add/update if the last point is in the past (not at or after current time)
          // This prevents creating future data points
          if (!lastPoint || lastPoint.time < nowUnix) {
          if (lastPoint && Math.abs(lastPoint.value - currentValue) < 0.000001) {
              // Same value, update timestamp to current time
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
              // Different value, add new point with current time
            data.push({
              time: nowUnix,
              timestamp: nowUnix,
              value: currentValue,
              date: moment.unix(nowUnix).toDate(),
            });
            }
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
                  onHover={(price, time) => {
                    if (price !== null && time !== null) {
                      setHoveredPrice({ price, time });
                    } else {
                      setHoveredPrice(null);
                    }
                  }}
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

