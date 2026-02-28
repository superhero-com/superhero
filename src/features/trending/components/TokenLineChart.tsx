import React, {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useAtomValue } from 'jotai';
import { formatNumber } from '@/utils/number';
import { TransactionHistoricalService } from '../../../api/generated';
import { performanceChartTimeframeAtom, PriceMovementTimeframe } from '../atoms';

const COLOR_UP = '#2EB88A';
const COLOR_DOWN = '#E14E4E';
const MIN_POINTS = 10;
const PAD = 2;

interface TokenLineChartProps {
  saleAddress: string;
  height?: number;
  hideTimeframe?: boolean;
  showCrosshair?: boolean;
  showTimeScale?: boolean;
  allTime?: boolean;
  showDateLegend?: boolean;
  allowParentClick?: boolean;
  timeframe?: PriceMovementTimeframe;
  className?: string;
}

interface ChartPoint {
  date: Date;
  value: number;
}

function buildSvgPaths(
  points: ChartPoint[],
  canvasWidth: number,
  canvasHeight: number,
): { linePath: string; fillPath: string } {
  const drawW = canvasWidth - 2 * PAD;
  const drawH = canvasHeight - 2 * PAD;

  const dates = points.map((p) => p.date.getTime());
  const values = points.map((p) => p.value);
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const rangeDate = maxDate - minDate || 1;
  const rangeVal = maxVal - minVal || 1;

  const toX = (d: number) => PAD + ((d - minDate) / rangeDate) * drawW;
  const toY = (v: number) => PAD + drawH - ((v - minVal) / rangeVal) * drawH;

  const pts = points.map((p) => ({ x: toX(p.date.getTime()), y: toY(p.value) }));

  let linePath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    linePath += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const last = pts[pts.length - 1];
  const fillPath = `${linePath} L ${last.x} ${canvasHeight} L ${pts[0].x} ${canvasHeight} Z`;

  return { linePath, fillPath };
}

function historyPagesToPoints(pages: any[]): ChartPoint[] {
  const merged = pages.reduce((acc: any[], page: any[]) => [...acc, ...page], []);
  return merged
    .map((item: any) => {
      const time = item?.timeClose || item?.time || item?.end_time;
      const price = item?.quote?.close ?? item?.close ?? item?.last_price ?? item?.price;
      if (!time || !Number.isFinite(Number(price))) return null;
      return { date: new Date(time), value: Number(price) };
    })
    .filter(Boolean)
    .sort((a: ChartPoint, b: ChartPoint) => a.date.getTime() - b.date.getTime());
}

export const TokenLineChart = ({
  saleAddress,
  height = 200,
  hideTimeframe = false,
  showCrosshair = false,
  allTime = false,
  showDateLegend = false,
  allowParentClick = false,
  className,
  timeframe,
}: TokenLineChartProps) => {
  const uid = useId();
  const gradientId = `chart-grad-${uid.replace(/:/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedWidth, setResolvedWidth] = useState<number | undefined>();
  const [crosshairX, setCrosshairX] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ price: number; label: string; x: number } | null>(null);
  const [legendRange, setLegendRange] = useState<[Date, Date] | null>(null);
  const legendHeight = showDateLegend ? 12 : 0;
  const chartHeight = Math.max(0, height - legendHeight);
  const performanceChartTimeframe = useAtomValue(performanceChartTimeframeAtom);
  const chartTimeframe = timeframe || performanceChartTimeframe;

  // Measure container width — read immediately on mount, then track resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = (w: number) => { if (w) setResolvedWidth(Math.floor(w)); };
    measure(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      measure(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data } = useQuery({
    queryFn: () => TransactionHistoricalService.getForPreview({
      address: saleAddress,
      interval: chartTimeframe as PriceMovementTimeframe,
    }),
    enabled: !!saleAddress && !allTime,
    queryKey: [
      'TransactionHistoricalService.getForPreview',
      saleAddress,
      chartTimeframe,
    ],
    staleTime: 1000 * 60 * 5,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ['TransactionHistoricalService.getPaginatedHistory', saleAddress],
    queryFn: ({ pageParam = 1 }) => TransactionHistoricalService.getPaginatedHistory({
      address: saleAddress,
      interval: 24 * 60 * 60,
      page: pageParam,
      limit: 200,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length === 0) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: !!saleAddress && allTime,
    staleTime: 1000 * 60 * 5,
  });

  const { hasNextPage, isFetching, fetchNextPage } = historyQuery;
  useEffect(() => {
    if (!allTime) return;
    if (hasNextPage && !isFetching) fetchNextPage();
  }, [allTime, hasNextPage, isFetching, fetchNextPage]);

  // Build lineData — identical logic to mobile
  const lineData = useMemo<ChartPoint[]>(() => {
    if (allTime) {
      const pages = historyQuery.data?.pages;
      if (!pages?.length) return [];
      return historyPagesToPoints(pages);
    }
    if (!data?.result?.length) return [];
    const points = data.result
      .slice()
      .sort((a: any, b: any) => moment(a.end_time).diff(moment(b.end_time)))
      .map((item: any) => ({
        date: new Date(item.end_time),
        value: Number(item.last_price),
      }));
    if (points.length < MIN_POINTS) {
      const { date: firstDate, value: firstValue } = points[0];
      const paddingCount = MIN_POINTS - points.length;
      const padding = Array.from({ length: paddingCount }, (_, i) => ({
        date: new Date(firstDate.getTime() - (paddingCount - i) * 3_600_000),
        value: firstValue,
      }));
      return [...padding, ...points];
    }
    return points;
  }, [allTime, data, historyQuery.data?.pages]);

  useEffect(() => {
    if (lineData.length >= 2) {
      setLegendRange([lineData[0].date, lineData[lineData.length - 1].date]);
    }
  }, [lineData]);

  const trendIsUp = useMemo(() => {
    if (lineData.length < 2) return true;
    return lineData[lineData.length - 1].value >= lineData[0].value;
  }, [lineData]);

  const strokeColor = trendIsUp ? COLOR_UP : COLOR_DOWN;

  const paths = useMemo(() => {
    if (!lineData.length || !resolvedWidth) return null;
    return buildSvgPaths(lineData, resolvedWidth, chartHeight);
  }, [lineData, resolvedWidth, chartHeight]);

  // Map an x pixel position back to the closest data point
  const getHoverInfoAtX = useCallback((clientX: number) => {
    if (!containerRef.current || !lineData.length || !resolvedWidth) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, resolvedWidth));
    const drawW = resolvedWidth - 2 * PAD;
    const dates = lineData.map((p) => p.date.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const rangeDate = maxDate - minDate || 1;
    const t = Math.max(0, Math.min(1, (x - PAD) / drawW));
    const targetDate = minDate + t * rangeDate;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < lineData.length; i += 1) {
      const diff = Math.abs(lineData[i].date.getTime() - targetDate);
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }
    const point = lineData[closestIdx];
    const pX = PAD + ((point.date.getTime() - minDate) / rangeDate) * drawW;
    return { price: point.value, label: moment(point.date).format('MMM D'), x: pX };
  }, [lineData, resolvedWidth]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showCrosshair) return;
    const info = getHoverInfoAtX(e.clientX);
    if (info) { setCrosshairX(info.x); setHoverInfo(info); }
  }, [showCrosshair, getHoverInfoAtX]);

  const handleMouseLeave = useCallback(() => {
    setCrosshairX(null);
    setHoverInfo(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!showCrosshair) return;
    if (!allowParentClick) e.preventDefault();
    const info = getHoverInfoAtX(e.touches[0].clientX);
    if (info) { setCrosshairX(info.x); setHoverInfo(info); }
  }, [showCrosshair, allowParentClick, getHoverInfoAtX]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!allowParentClick) e.preventDefault();
    setCrosshairX(null);
    setHoverInfo(null);
  }, [allowParentClick]);

  return (
    <div className={`chart-container flex flex-col h-full ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: chartHeight }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {(paths && resolvedWidth && lineData.length > 0) && (
          <svg
            width={resolvedWidth}
            height={chartHeight}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.19} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={paths.fillPath} fill={`url(#${gradientId})`} />
            <path
              d={paths.linePath}
              stroke={strokeColor}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {showCrosshair && crosshairX !== null && (
              <line
                x1={crosshairX}
                y1={0}
                x2={crosshairX}
                y2={chartHeight}
                stroke="rgba(52, 211, 153, 1)"
                strokeWidth={2}
              />
            )}
          </svg>
        )}
        {showCrosshair && hoverInfo && (
          <div className="absolute right-2 -top-8 text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-full pointer-events-none">
            $
            {formatNumber(hoverInfo.price, hoverInfo.price < 1 ? 6 : 2)}
          </div>
        )}
        {showCrosshair && hoverInfo && (
          <div
            className="absolute -top-6 text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-full pointer-events-none"
            style={{ left: hoverInfo.x, transform: 'translateX(-50%)' }}
          >
            {hoverInfo.label}
          </div>
        )}
      </div>
      {showDateLegend && legendRange && (
        <div className="mt-0.5 h-[12px] flex items-center justify-between text-[10px] text-white/60 pointer-events-none">
          <span>{moment(legendRange[0]).format('MMM D')}</span>
          <span>{moment(legendRange[1]).format('MMM D')}</span>
        </div>
      )}
    </div>
  );
};

export default TokenLineChart;
