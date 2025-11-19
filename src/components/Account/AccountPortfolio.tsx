import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import { SuperheroApi } from '@/api/backend';
import { useCurrencies } from '@/hooks/useCurrencies';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';
import { Decimal } from '@/libs/decimal';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Spinner from '@/components/Spinner';

interface AccountPortfolioProps {
  address: string;
}

interface PortfolioSnapshot {
  timestamp: string | Date;
  total_value_ae: number;
  ae_balance: number;
  tokens_value_ae: number;
  total_value_usd?: number;
  total_pnl?: {
    percentage: number;
    invested: {
      ae: number;
      usd: number;
    };
    current_value: {
      ae: number;
      usd: number;
    };
    gain: {
      ae: number;
      usd: number;
    };
    range: {
      from: string | null;
      to: string | null;
    };
  };
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
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);

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
            const containerBounds = container.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();
            
            if (strokePath && strokePath.getTotalLength() > 0) {
              const pathBBox = strokePath.getBBox();
              const svgHeight = svgRect.height;
              
              // Verify: stroke path should not span the full height (that would be fill area)
              // Stroke path bounding box should be reasonable (not too tall)
              if (pathBBox.height > svgHeight * 0.9) {
                // This is likely the fill area - use it to find the top edge (data line)
                const fillPath = strokePath;
                const fillBBox = pathBBox;
                
                // Calculate X position within the plot area
                const plotAreaLeft = fillBBox.x;
                const plotAreaWidth = fillBBox.width;
                const relativeX = plotAreaLeft + (xPercent * plotAreaWidth);
                const clampedRelativeX = Math.max(plotAreaLeft, Math.min(plotAreaLeft + plotAreaWidth, relativeX));
                
                // Set crosshair X position
                const crosshairXPos = svgRect.left - containerBounds.left + clampedRelativeX;
                setCrosshairX(crosshairXPos);
                
                // Sample the fill area path to find the Y coordinate at this X
                // The top edge of the fill area corresponds to the data line
                // Optimized: Use binary search instead of exhaustive sampling
                const pathLength = fillPath.getTotalLength();
                let bestY = fillBBox.y + fillBBox.height; // Default to bottom
                
                // Binary search for the point closest to target X
                let low = 0;
                let high = pathLength;
                let bestLength = 0;
                const tolerance = 1.0; // pixels - slightly relaxed for performance
                
                // Binary search with fewer iterations for better performance
                for (let iteration = 0; iteration < 30; iteration++) {
                  const mid = (low + high) / 2;
                  const pathPoint = fillPath.getPointAtLength(mid);
                  const xDistance = Math.abs(pathPoint.x - clampedRelativeX);
                  
                  if (xDistance < tolerance && pathPoint.y < bestY) {
                    bestY = pathPoint.y;
                    bestLength = mid;
                  }
                  
                  if (pathPoint.x < clampedRelativeX) {
                    low = mid;
                  } else {
                    high = mid;
                  }
                  
                  if (high - low < 0.1) break; // Early exit if range is small enough
                }
                
                // Quick refinement around best point (reduced iterations)
                if (bestLength > 0) {
                  const refineRange = pathLength * 0.01; // 1% of path
                  const refineStart = Math.max(0, bestLength - refineRange);
                  const refineEnd = Math.min(pathLength, bestLength + refineRange);
                  
                  // Reduced from 200 to 50 iterations
                  for (let i = 0; i <= 50; i++) {
                    const length = refineStart + (refineEnd - refineStart) * (i / 50);
                    const pathPoint = fillPath.getPointAtLength(length);
                    const xDistance = Math.abs(pathPoint.x - clampedRelativeX);
                    
                    if (xDistance < tolerance && pathPoint.y < bestY) {
                      bestY = pathPoint.y;
                    }
                  }
                }
                
                // Convert to container coordinates
                const y = svgRect.top - containerBounds.top + bestY;
                if (y >= 0 && y <= svgRect.height) {
                  setCrosshairY(y);
                }
                return;
              }
        
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
              // Optimized: Reduced iterations for better performance
              let low = 0;
              let high = pathLength;
              let bestPoint = { x: 0, y: 0 };
              let minDistance = Infinity;
              const tolerance = 0.5; // pixels - slightly relaxed for performance
              
              // Binary search with fewer iterations
              for (let iteration = 0; iteration < 30; iteration++) {
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
                
                if (high - low < 0.1) break; // Early exit if range is small enough
              }
              
              // Final refinement: check points around the best point (reduced iterations)
              const refinePercent = 0.01; // 1% of path
              const refineRange = pathLength * refinePercent;
              const refineLengthStart = Math.max(0, 
                (bestPoint.x - pathStartX) / pathBBox.width * pathLength - refineRange
              );
              const refineLengthEnd = Math.min(pathLength,
                (bestPoint.x - pathStartX) / pathBBox.width * pathLength + refineRange
              );
              
              // Reduced from 100 to 30 iterations
              for (let i = 0; i <= 30; i++) {
                const length = Math.max(0, Math.min(pathLength, 
                  refineLengthStart + (refineLengthEnd - refineLengthStart) * (i / 30)
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
              
              // Set Y if it's within reasonable bounds
              // Use a more lenient check for "ALL" time range which may have data at edges
              if (y >= containerTop && y <= containerBottom) {
                setCrosshairY(y);
              } else {
                // Fallback: calculate Y from data value if path-based calculation fails
                // This ensures crosshair still appears even if path detection has issues
                const valueRange = Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value));
                if (valueRange > 0) {
                  const normalizedValue = (point.value - Math.min(...data.map(d => d.value))) / valueRange;
                  const fallbackY = containerTop + (1 - normalizedValue) * (containerBottom - containerTop) * 0.8 + containerTop * 0.1;
                  setCrosshairY(Math.max(containerTop, Math.min(containerBottom, fallbackY)));
                }
              }
            } else {
              // Fallback when stroke path is not found - use data-based calculation
              const fallbackX = svgRect.left - containerBounds.left + svgRect.width * xPercent;
              setCrosshairX(fallbackX);
              
              // Calculate Y from data value
              const valueRange = Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value));
              if (valueRange > 0) {
                const normalizedValue = (point.value - Math.min(...data.map(d => d.value))) / valueRange;
                const fallbackY = svgRect.top - containerBounds.top + svgRect.height * (1 - normalizedValue) * 0.8 + svgRect.height * 0.1;
                setCrosshairY(Math.max(0, Math.min(svgRect.height, fallbackY)));
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

    // Mouse hover support for desktop - throttled with requestAnimationFrame
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // Store the latest mouse position
      pendingXRef.current = x;
      
      // Throttle updates using requestAnimationFrame
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingXRef.current !== null) {
            updateCrosshair(pendingXRef.current);
            pendingXRef.current = null;
          }
          rafRef.current = null;
        });
      }
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
      
      // Cancel any pending animation frame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingXRef.current = null;
    };
  }, [data, onHover]); // Re-run if data or onHover changes

  // Prevent SVG elements from receiving focus
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const disableSVGFocus = () => {
      const svg = container.querySelector('svg');
      if (svg) {
        svg.setAttribute('tabindex', '-1');
        svg.setAttribute('focusable', 'false');
        // Disable focus on all SVG child elements
        const svgElements = svg.querySelectorAll('*');
        svgElements.forEach((el) => {
          el.setAttribute('tabindex', '-1');
          el.setAttribute('focusable', 'false');
        });
      }
    };

    // Run immediately and after a short delay to catch dynamically rendered SVG
    disableSVGFocus();
    const timeout = setTimeout(disableSVGFocus, 100);

    return () => clearTimeout(timeout);
  }, [data]);

  return (
      <div
      ref={containerRef}
      className="w-full h-[180px] relative focus:outline-none focus-visible:outline-none"
        style={{ 
          touchAction: 'pan-y', 
          width: '100%', 
          height: '180px',
          outline: 'none',
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
                animationDuration={300}
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
  const [animatedValue, setAnimatedValue] = useState<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const animationStartValueRef = useRef<number | null>(null);
  const animationTargetValueRef = useRef<number | null>(null);
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

  const queryClient = useQueryClient();

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
    data: rawPortfolioData,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    // Stable query key: only changes when time range or currency changes
    queryKey: ['portfolio-history', address, selectedTimeRange, convertTo],
    queryFn: async () => {
      const response = await SuperheroApi.getAccountPortfolioHistory(address, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: dateRange.interval,
        convertTo: convertTo as any,
        include: 'pnl-range', // Include PNL data with each snapshot for hover support
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
      const nowUnix = moment().unix();
      
      for (const snapshot of sorted) {
        const timestamp = moment(snapshot.timestamp).unix();
        // Calculate which interval period this timestamp belongs to
        const periodStart = Math.floor(timestamp / intervalSeconds) * intervalSeconds;
        
        // Check if this is the last period (current period)
        const currentPeriodStart = Math.floor(nowUnix / intervalSeconds) * intervalSeconds;
        const isLastPeriod = periodStart === currentPeriodStart;
        
        const existing = periodMap.get(periodStart);
        if (!existing) {
          periodMap.set(periodStart, snapshot);
        } else {
          if (isLastPeriod) {
            // For the last period (current period), always keep the latest snapshot
            // This ensures we use the most recent value for consistency across timeframes
            const existingTime = moment(existing.timestamp).unix();
            if (timestamp > existingTime) {
              periodMap.set(periodStart, snapshot);
            }
          } else {
            // For other periods, keep the one closest to the period start
            // (or the latest one if they're equally close)
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
      }
      
      // Convert map values back to array and sort
      const filtered = Array.from(periodMap.values()).sort((a, b) => 
        moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf()
      );
      
      // Store raw data for current value extraction (before filtering)
      // This ensures consistency across all timeframes
      return {
        filtered,
        raw: sorted, // Keep raw data for current value extraction
      };
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Extract portfolioData and rawData from query result
  const portfolioData = useMemo(() => {
    if (!rawPortfolioData) return undefined;
    // Handle both old format (array) and new format (object with filtered/raw)
    if (Array.isArray(rawPortfolioData)) {
      return rawPortfolioData;
    }
    return rawPortfolioData.filtered;
  }, [rawPortfolioData]);
  
  const rawData = useMemo(() => {
    if (!rawPortfolioData) return undefined;
    // Handle both old format (array) and new format (object with filtered/raw)
    if (Array.isArray(rawPortfolioData)) {
      return rawPortfolioData;
    }
    return rawPortfolioData.raw;
  }, [rawPortfolioData]);

  // Prepare chart data for Recharts first (needed for currentPortfolioValue extraction)
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

    // Add current portfolio value from the independent query (usePortfolioValue)
    // This ensures consistency across all timeframes by always using the same current value source
    if (currentPortfolioSnapshot) {
      try {
        let currentValue: number | null = null;
        if (convertTo === 'ae') {
          currentValue = currentPortfolioSnapshot.total_value_ae;
        } else {
          currentValue = currentPortfolioSnapshot.total_value_usd ?? currentPortfolioSnapshot.total_value_ae;
        }

          if (currentValue !== null && !isNaN(currentValue) && isFinite(currentValue)) {
            const lastPoint = data.length > 0 ? data[data.length - 1] : null;
            
            // Only add/update if the last point is in the past (not at or after current time)
            if (!lastPoint || lastPoint.time < nowUnix) {
              if (lastPoint) {
                const valueDiff = Math.abs(lastPoint.value - currentValue);
                const valueDiffPercent = lastPoint.value > 0 ? (valueDiff / lastPoint.value) * 100 : 0;
                
                // For daily intervals (1M, ALL), be more conservative:
                // Only add a new point if value changed significantly (> 0.1% or > 1 AE)
                // Otherwise, just update the timestamp to keep the line flat
                const isDailyInterval = dateRange.interval >= 86400; // Daily or longer intervals
                const significantChange = valueDiffPercent > 0.1 || valueDiff > 1; // More than 0.1% or 1 AE change
                
                if (valueDiff < 0.000001) {
                  // Same value (within floating point precision), always update value to current
                  // This ensures consistency across all timeframes, even if timestamp is recent
                  const timeDiff = nowUnix - lastPoint.time;
                  if (timeDiff > 300) {
                    // Update timestamp and value if enough time has passed
                    data[data.length - 1] = {
                      ...lastPoint,
                      value: currentValue, // Update to current value to ensure consistency
                      time: nowUnix,
                      timestamp: nowUnix,
                      date: moment.unix(nowUnix).toDate(),
                    };
                  } else {
                    // Even if timestamp is recent, update value to ensure consistency
                    data[data.length - 1] = {
                      ...lastPoint,
                      value: currentValue, // Always use current value for consistency
                    };
                  }
                } else if (isDailyInterval && !significantChange) {
                  // Daily interval with insignificant change - update timestamp AND value to current
                  // This ensures the displayed value matches the actual current value
                  const timeDiff = nowUnix - lastPoint.time;
                  if (timeDiff > 300) {
                    data[data.length - 1] = {
                      ...lastPoint,
                      value: currentValue, // Update to current value to ensure consistency
                      time: nowUnix,
                      timestamp: nowUnix,
                      date: moment.unix(nowUnix).toDate(),
                    };
                  }
                } else {
                  // Significant change or non-daily interval - add new point
                  data.push({
                    time: nowUnix,
                    timestamp: nowUnix,
                    value: currentValue,
                    date: moment.unix(nowUnix).toDate(),
                  });
                }
              } else {
                // No last point, add current value
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
    }

    return data.sort((a, b) => a.time - b.time);
  }, [portfolioData, currentPortfolioSnapshot, convertTo, dateRange]);

  // Fetch current portfolio value independently of timeframe
  // This ensures consistency across all timeframes by always using the same current value source
  const { data: currentPortfolioSnapshot } = usePortfolioValue({
    address,
    convertTo: convertTo as any,
    enabled: !!address,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  });

  // Extract current portfolio value from the independent query
  // This ensures consistency across all timeframes
  const currentPortfolioValue = useMemo(() => {
    if (!currentPortfolioSnapshot) return null;
    
    try {
      if (convertTo === 'ae') {
        return Decimal.from(currentPortfolioSnapshot.total_value_ae);
      } else {
        return Decimal.from(currentPortfolioSnapshot.total_value_usd ?? currentPortfolioSnapshot.total_value_ae);
      }
    } catch {
      return null;
    }
  }, [currentPortfolioSnapshot, convertTo]);

  // Fetch PNL data for current timeframe
  const {
    data: pnlData,
    isLoading: isPnlLoading,
  } = useQuery({
    queryKey: ['portfolio-pnl', address, selectedTimeRange, convertTo],
    queryFn: async () => {
      const response = await SuperheroApi.getAccountPortfolioHistory(address, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: dateRange.interval,
        convertTo: convertTo as any,
        include: 'pnl-range',
      });
      
      const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
      if (snapshots.length === 0) return null;
      
      // With range-based PNL, the backend now calculates PNL for each timeframe range
      // The last snapshot's PNL represents PNL for transactions from startDate to endDate
      // We can use it directly without needing to subtract
      const lastSnapshot = snapshots[snapshots.length - 1];
      if (!lastSnapshot.total_pnl) return null;
      
      const firstSnapshot = snapshots[0];
      
      // Use the last snapshot's PNL directly - it represents PNL for the timeframe
      return {
        percentage: lastSnapshot.total_pnl.percentage,
        invested: lastSnapshot.total_pnl.invested,
        current_value: lastSnapshot.total_pnl.current_value,
        gain: lastSnapshot.total_pnl.gain,
        range: {
          from: firstSnapshot.total_pnl?.range?.from || null,
          to: lastSnapshot.total_pnl?.range?.to || null,
        },
      };
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Use PNL data from portfolioData instead of fetching on hover
  // Each snapshot already includes PNL range from startDate to that timestamp
  const hoverPnlData = useMemo(() => {
    if (!hoveredPrice || !portfolioData || portfolioData.length === 0) {
      return null;
    }
    
    // Find the snapshot closest to the hovered timestamp
    const hoverTime = hoveredPrice.time;
    let closestSnapshot: PortfolioSnapshot | null = null;
    let minDistance = Infinity;
    
    for (const snapshot of portfolioData) {
      const snapshotTime = moment(snapshot.timestamp).unix();
      const distance = Math.abs(snapshotTime - hoverTime);
      if (distance < minDistance) {
        minDistance = distance;
        closestSnapshot = snapshot;
      }
    }
    
    // Use PNL data from the closest snapshot (which includes range from startDate to that timestamp)
    if (closestSnapshot?.total_pnl) {
      return {
        percentage: closestSnapshot.total_pnl.percentage,
        invested: closestSnapshot.total_pnl.invested,
        current_value: closestSnapshot.total_pnl.current_value,
        gain: closestSnapshot.total_pnl.gain,
        range: closestSnapshot.total_pnl.range,
      };
    }
    
    return null;
  }, [hoveredPrice, portfolioData]);

  // Keep portfolioData ref up to date for initialization effect
  useEffect(() => {
    portfolioDataRef.current = portfolioData;
  }, [portfolioData]);

  // Prefetch other time ranges in the background after first load
  useEffect(() => {
    // Only prefetch if the current query has successfully loaded
    if (!portfolioData || isLoading) return;

    // Get all time ranges except the currently selected one
    const otherTimeRanges = (Object.keys(TIME_RANGES) as TimeRange[]).filter(
      (range) => range !== selectedTimeRange
    );

    // Prefetch each other time range
    otherTimeRanges.forEach((timeRange) => {
      const range = TIME_RANGES[timeRange];
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

      const prefetchDateRange = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: range.interval,
      };

      // Check if data is already cached
      const queryKey = ['portfolio-history', address, timeRange, convertTo];
      const cachedData = queryClient.getQueryData(queryKey);
      
      // Only prefetch if not already cached
      if (!cachedData) {
        // Prefetch the query
        queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const response = await SuperheroApi.getAccountPortfolioHistory(address, {
              startDate: prefetchDateRange.startDate,
              endDate: prefetchDateRange.endDate,
              interval: prefetchDateRange.interval,
              convertTo: convertTo as any,
            });
            
            const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
            
            // Sort by timestamp ascending
            const sorted = snapshots.sort((a, b) => 
              moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf()
            );
            
            // Filter to ensure one point per interval period
            const intervalSeconds = prefetchDateRange.interval;
            const periodMap = new Map<number, PortfolioSnapshot>();
            
            for (const snapshot of sorted) {
              const timestamp = moment(snapshot.timestamp).unix();
              const periodStart = Math.floor(timestamp / intervalSeconds) * intervalSeconds;
              
              const existing = periodMap.get(periodStart);
              if (!existing) {
                periodMap.set(periodStart, snapshot);
              } else {
                const existingTime = moment(existing.timestamp).unix();
                const existingDistance = Math.abs(existingTime - periodStart);
                const currentDistance = Math.abs(timestamp - periodStart);
                
                if (currentDistance < existingDistance || 
                    (currentDistance === existingDistance && timestamp > existingTime)) {
                  periodMap.set(periodStart, snapshot);
                }
              }
            }
            
            return Array.from(periodMap.values()).sort((a, b) => 
              moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf()
            );
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
        });
      }
    });
  }, [portfolioData, isLoading, selectedTimeRange, address, convertTo, queryClient]);

  // Prefetch PNL data for other time ranges in the background after first load
  useEffect(() => {
    // Only prefetch if the current PNL query has successfully loaded
    if (!pnlData || isPnlLoading) return;

    // Get all time ranges except the currently selected one
    const otherTimeRanges = (Object.keys(TIME_RANGES) as TimeRange[]).filter(
      (range) => range !== selectedTimeRange
    );

    // Prefetch PNL for each other time range
    otherTimeRanges.forEach((timeRange) => {
      const range = TIME_RANGES[timeRange];
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

      const prefetchDateRange = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval: range.interval,
      };

      // Check if PNL data is already cached
      const queryKey = ['portfolio-pnl', address, timeRange, convertTo];
      const cachedData = queryClient.getQueryData(queryKey);
      
      // Only prefetch if not already cached
      if (!cachedData) {
        // Prefetch the PNL query
        queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const response = await SuperheroApi.getAccountPortfolioHistory(address, {
              startDate: prefetchDateRange.startDate,
              endDate: prefetchDateRange.endDate,
              interval: prefetchDateRange.interval,
              convertTo: convertTo as any,
              include: 'pnl-range',
            });
            
            const snapshots = (Array.isArray(response) ? response : []) as PortfolioSnapshot[];
            if (snapshots.length === 0) return null;
            
            // Get the last snapshot which should have the PNL range from start to end
            const lastSnapshot = snapshots[snapshots.length - 1];
            return lastSnapshot.total_pnl || null;
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 30 * 60 * 1000, // Keep cached data for 30 minutes
        });
      }
    });
  }, [pnlData, isPnlLoading, selectedTimeRange, address, convertTo, queryClient]);

  // Check if both portfolio value and PNL are ready to display together
  const bothReady = useMemo(() => {
    // If hovering, show immediately (hover data comes from portfolioData which is already loaded)
    if (hoveredPrice) return true;
    
    // Otherwise, wait for both portfolio data and PNL to be ready
    return !isLoading && !isPnlLoading && portfolioData && portfolioData.length > 0 && currentPortfolioValue !== null && currentPortfolioValue !== undefined;
  }, [hoveredPrice, isLoading, isPnlLoading, portfolioData, currentPortfolioValue]);

  // Calculate display value
  const displayValue = useMemo(() => {
    if (hoveredPrice) {
      return hoveredPrice.price;
    }
    
    // Only show portfolio value if both are ready (or if hovering)
    if (bothReady && currentPortfolioValue) {
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
  }, [hoveredPrice, currentPortfolioValue, bothReady]);

  // Animate value when displayValue changes
  useEffect(() => {
    if (displayValue === null) {
      setAnimatedValue(null);
      return;
    }

    // Cancel any ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startValue = animatedValue ?? displayValue;
    const targetValue = displayValue;
    const duration = 400; // 400ms animation duration

    // If values are the same, no need to animate
    if (Math.abs(startValue - targetValue) < 0.0001) {
      setAnimatedValue(targetValue);
        return;
      }
      
    animationStartRef.current = performance.now();
    animationStartValueRef.current = startValue;
    animationTargetValueRef.current = targetValue;

    const animate = (currentTime: number) => {
      const startTime = animationStartRef.current ?? currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const start = animationStartValueRef.current ?? startValue;
      const target = animationTargetValueRef.current ?? targetValue;
      const current = start + (target - start) * easeOut;

      setAnimatedValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
            } else {
        setAnimatedValue(targetValue);
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [displayValue]);

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
                        Portfolio value shows the combined worth of AE balance and trend tokens held in this wallet. The chart tracks how this value changes over time.
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
                      Portfolio value shows the combined worth of AE balance and trend tokens held in this wallet. The chart tracks how this value changes over time.
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
            <span className={`text-3xl md:text-4xl ${hoveredPrice ? 'text-green-400' : 'text-white'} block min-h-[2.5rem] leading-tight`}>
              {animatedValue !== null ? (
                convertTo === 'ae' 
                  ? (() => {
                      try {
                        const value = Number(animatedValue);
                        // If value is above 1 AE, show 2 decimals
                        if (value >= 1) {
                          return (
                            <>
                              <span className="font-light">AE</span>{' '}
                              <span className="font-extrabold">{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </>
                          );
                        }
                        // Otherwise use prettify for values below 1 AE
                        return (
                          <>
                            <span className="font-light">AE</span>{' '}
                            <span className="font-extrabold">{Decimal.from(animatedValue).prettify()}</span>
                          </>
                        );
                      } catch {
                        const value = Number(animatedValue);
                        // If value is above 1 AE, show 2 decimals
                        if (value >= 1) {
                          return (
                            <>
                              <span className="font-light">AE</span>{' '}
                              <span className="font-extrabold">{value.toFixed(2)}</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <span className="font-light">AE</span>{' '}
                            <span className="font-extrabold">{value.toFixed(4)}</span>
                          </>
                        );
                      }
                    })()
                  : (() => {
                      try {
                        const fiatValue = typeof animatedValue === 'number' ? animatedValue : Number(animatedValue);
                      const currencyCode = currentCurrencyInfo.code.toUpperCase();
                        // Format number separately to extract currency symbol
                        const formatter = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                        const parts = formatter.formatToParts(fiatValue);
                        const currencySymbol = parts.find(p => p.type === 'currency')?.value || '$';
                        const amount = parts.filter(p => p.type !== 'currency').map(p => p.value).join('');
                        return (
                          <>
                            <span className="font-light">{currencySymbol}</span>
                            <span className="font-extrabold">{amount}</span>
                          </>
                        );
                      } catch {
                        const amount = Number(animatedValue).toFixed(2);
                        return (
                          <>
                            <span className="font-light">$</span>
                            <span className="font-extrabold">{amount}</span>
                          </>
                        );
                      }
                    })()
              ) : (
                <>
                  <span className="font-light opacity-0">AE</span>{' '}
                  <span className="font-extrabold opacity-0">0.00</span>
                </>
              )}
            </span>
            
            {/* Profit/Loss Display */}
            <div className="mt-1 mb-1 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
              <div className="flex items-center gap-2 text-sm">
                {hoveredPrice && hoverPnlData ? (
                  <>
                    <span className="text-white/60">Profit/Loss:</span>
                    <span className={`font-semibold ${
                      hoverPnlData.gain[convertTo === 'ae' ? 'ae' : 'usd'] === 0 
                        ? 'text-white/60' 
                        : hoverPnlData.gain[convertTo === 'ae' ? 'ae' : 'usd'] >= 0 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {convertTo === 'ae' ? (
                        <>
                          {hoverPnlData.gain.ae === 0 ? (
                            <>0 AE</>
                          ) : (
                            <>
                              {hoverPnlData.gain.ae >= 0 ? '+' : ''}
                              {hoverPnlData.gain.ae >= 1 
                                ? hoverPnlData.gain.ae.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : Decimal.from(hoverPnlData.gain.ae).prettify()}
                              {' AE '}
                              <span className="text-white/60">
                                ({hoverPnlData.percentage >= 0 ? '+' : ''}{hoverPnlData.percentage.toFixed(2)}%)
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {hoverPnlData.gain.usd === 0 ? (
                            <>{hoverPnlData.gain.usd.toLocaleString('en-US', { style: 'currency', currency: currentCurrencyInfo.code, minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                          ) : (
                            <>
                              {hoverPnlData.gain.usd >= 0 ? '+' : ''}
                              {hoverPnlData.gain.usd.toLocaleString('en-US', { style: 'currency', currency: currentCurrencyInfo.code, minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' '}
                              <span className="text-white/60">
                                ({hoverPnlData.percentage >= 0 ? '+' : ''}{hoverPnlData.percentage.toFixed(2)}%)
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </>
                ) : bothReady && pnlData ? (
                  <>
                    <span className="text-white/60">Profit/Loss:</span>
                    <span className={`font-semibold ${
                      pnlData.gain[convertTo === 'ae' ? 'ae' : 'usd'] === 0 
                        ? 'text-white/60' 
                        : pnlData.gain[convertTo === 'ae' ? 'ae' : 'usd'] >= 0 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {convertTo === 'ae' ? (
                        <>
                          {pnlData.gain.ae === 0 ? (
                            <>0 AE</>
                          ) : (
                            <>
                              {pnlData.gain.ae >= 0 ? '+' : ''}
                              {pnlData.gain.ae >= 1 
                                ? pnlData.gain.ae.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : Decimal.from(pnlData.gain.ae).prettify()}
                              {' AE '}
                              <span className="text-white/60">
                                ({pnlData.percentage >= 0 ? '+' : ''}{pnlData.percentage.toFixed(2)}%)
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {pnlData.gain.usd === 0 ? (
                            <>{pnlData.gain.usd.toLocaleString('en-US', { style: 'currency', currency: currentCurrencyInfo.code, minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                          ) : (
                            <>
                              {pnlData.gain.usd >= 0 ? '+' : ''}
                              {pnlData.gain.usd.toLocaleString('en-US', { style: 'currency', currency: currentCurrencyInfo.code, minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' '}
                              <span className="text-white/60">
                                ({pnlData.percentage >= 0 ? '+' : ''}{pnlData.percentage.toFixed(2)}%)
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </>
                ) : null}
              </div>
              
              <div className="text-sm text-white/60 md:text-right">
                {hoveredPrice ? (
                  <span>{moment.unix(hoveredPrice.time).format('MMM D, YYYY HH:mm')}</span>
                ) : (
                  <span className="opacity-0">&#8203;</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart - no padding, full width */}
        <div className="p-4 w-full">
            <div 
              className="h-[180px] relative w-full focus:outline-none focus-visible:outline-none" 
              tabIndex={-1}
              style={{ 
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseDown={(e) => {
                // Prevent focus on mouse click
                e.preventDefault();
                e.currentTarget.blur();
                if (e.target instanceof HTMLElement) {
                  e.target.blur();
                }
              }}
              onClick={(e) => {
                // Prevent focus on click
                e.currentTarget.blur();
                if (e.target instanceof HTMLElement) {
                  e.target.blur();
                }
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
                <div className="absolute inset-0 flex items-start justify-center pt-10 z-10 px-4 md:px-6">
                  <div className="inline-flex items-center gap-1.5 text-white text-xs font-medium">
                    <Spinner className="w-3.5 h-3.5" />
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

