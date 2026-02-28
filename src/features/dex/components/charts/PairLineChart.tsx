import { DexPairService } from '@/api/generated';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import {
  useEffect, useId, useMemo, useRef, useState
} from 'react';

const COLOR_UP = '#2EB88A';
const COLOR_DOWN = '#E14E4E';
const MIN_POINTS = 10;
const PAD = 2;

interface PairLineChartProps {
  pairAddres: string;
  height?: number;
  hideTimeframe?: boolean;
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

export const PairLineChart = ({
  pairAddres,
  height = 200,
}: PairLineChartProps) => {
  const uid = useId();
  const gradientId = `pair-chart-grad-${uid.replace(/:/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedWidth, setResolvedWidth] = useState<number | undefined>();

  const { data } = useQuery({
    queryFn: () => DexPairService.getPairPreview({
      address: pairAddres,
      interval: '30d' as any,
    }),
    enabled: !!pairAddres,
    queryKey: [
      'DexPairService.getPairPreview',
      pairAddres,
    ],
    staleTime: 1000 * 60 * 5,
  });

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

  const lineData = useMemo<ChartPoint[]>(() => {
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
  }, [data]);

  const trendIsUp = useMemo(() => {
    if (lineData.length < 2) return true;
    return lineData[lineData.length - 1].value >= lineData[0].value;
  }, [lineData]);

  const strokeColor = trendIsUp ? COLOR_UP : COLOR_DOWN;

  const paths = useMemo(() => {
    if (!lineData.length || !resolvedWidth) return null;
    return buildSvgPaths(lineData, resolvedWidth, height);
  }, [lineData, resolvedWidth, height]);

  return (
    <div
      ref={containerRef}
      className="chart-container relative mr-2"
      style={{ height }}
    >
      {(paths && resolvedWidth && lineData.length > 0) && (
        <svg
          width={resolvedWidth}
          height={height}
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
  );
};

export default PairLineChart;
