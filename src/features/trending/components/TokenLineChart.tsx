import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import moment from 'moment';
import {
  useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { TransactionHistoricalService } from '../../../api/generated';
import { performanceChartTimeframeAtom, PriceMovementTimeframe } from '../atoms';

const COLOR_UP = '#2EB88A';
const COLOR_DOWN = '#E14E4E';
const MIN_POINTS = 10;
const PAD = 2;

interface TokenLineChartProps {
  saleAddress: string;
  height?: number;
  allTime?: boolean;
  showDateLegend?: boolean;
  timeframe?: PriceMovementTimeframe;
  className?: string;
}

interface ChartPoint {
  date: Date;
  value: number;
}

function gaussianSmooth(points: ChartPoint[]): ChartPoint[] {
  if (points.length <= 10) return points;
  const n = points.length;
  const sigma = Math.max(4, Math.round(n * 0.14));
  const radius = sigma * 3;

  const pass = (pts: ChartPoint[]) => pts.map((pt, i) => {
    let sum = 0;
    let wSum = 0;
    const lo = Math.max(0, i - radius);
    const hi = Math.min(n - 1, i + radius);
    for (let j = lo; j <= hi; j += 1) {
      const d = (i - j) / sigma;
      const w = Math.exp(-0.5 * d * d);
      sum += pts[j].value * w;
      wSum += w;
    }
    return { date: pt.date, value: sum / wSum };
  });

  return pass(pass(points));
}

function downsample(points: ChartPoint[], maxPts: number): ChartPoint[] {
  if (points.length <= maxPts) return points;
  const result: ChartPoint[] = [points[0]];
  const step = (points.length - 1) / (maxPts - 1);
  for (let i = 1; i < maxPts - 1; i += 1) {
    result.push(points[Math.round(i * step)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

function buildSvgPaths(
  rawPoints: ChartPoint[],
  canvasWidth: number,
  canvasHeight: number,
): { linePath: string; fillPath: string; visualTrendUp: boolean } {
  const smoothed = gaussianSmooth(rawPoints);
  const points = downsample(smoothed, 80);
  const visualTrendUp = points.length < 2
    || points[points.length - 1].value >= points[0].value;

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
  const toY = (v: number) => (maxVal === minVal ? PAD + drawH / 2 : PAD + drawH - ((v - minVal) / rangeVal) * drawH);

  const pts = points.map((p) => ({ x: toX(p.date.getTime()), y: toY(p.value) }));

  if (pts.length < 2) return { linePath: '', fillPath: '', visualTrendUp };

  let linePath = `M ${pts[0].x} ${pts[0].y}`;

  if (pts.length === 2) {
    linePath += ` L ${pts[1].x} ${pts[1].y}`;
  } else {
    const T = 6;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / T;
      const cp1y = p1.y + (p2.y - p0.y) / T;
      const cp2x = p2.x - (p3.x - p1.x) / T;
      const cp2y = p2.y - (p3.y - p1.y) / T;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }

  const last = pts[pts.length - 1];
  const fillPath = `${linePath} L ${last.x} ${canvasHeight} L ${pts[0].x} ${canvasHeight} Z`;

  return { linePath, fillPath, visualTrendUp };
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
  allTime = false,
  showDateLegend = false,
  className,
  timeframe,
}: TokenLineChartProps) => {
  const uid = useId();
  const gradientId = `chart-grad-${uid.replace(/:/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedWidth, setResolvedWidth] = useState<number | undefined>();
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
    if (points.length === 1) {
      const [{ date, value }] = points;
      return [{ date: new Date(date.getTime() - 3_600_000), value }, { date, value }];
    }
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

  const paths = useMemo(() => {
    if (!lineData.length || !resolvedWidth) return null;
    return buildSvgPaths(lineData, resolvedWidth, chartHeight);
  }, [lineData, resolvedWidth, chartHeight]);

  const strokeColor = (paths?.visualTrendUp ?? true) ? COLOR_UP : COLOR_DOWN;

  return (
    <div className={`chart-container flex flex-col h-full ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="relative w-full pointer-events-none"
        style={{ height: chartHeight }}
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
          </svg>
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
