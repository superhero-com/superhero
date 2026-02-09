import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import moment from 'moment';
import {
  IChartApi, ISeriesApi, AreaSeriesPartialOptions, UTCTimestamp, AreaSeries,
} from 'lightweight-charts';

import { useAtomValue } from 'jotai';
import { formatNumber } from '@/utils/number';
import { useChart } from '../../../hooks/useChart';
import { TransactionHistoricalService } from '../../../api/generated';
import { performanceChartTimeframeAtom, PriceMovementTimeframe } from '../atoms';

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

interface ChartDataItem {
  end_time: string;
  last_price: number;
}

interface ChartResponse {
  result: ChartDataItem[];
  timeframe?: string;
}

export const TokenLineChart = ({
  saleAddress,
  height = 200,
  hideTimeframe = false,
  showCrosshair = false,
  showTimeScale = false,
  allTime = false,
  showDateLegend = false,
  allowParentClick = false,
  className,
  timeframe,
}: TokenLineChartProps) => {
  const [loading, setLoading] = useState(false);
  const areaSeries = useRef<ISeriesApi<'Area'> | undefined>();
  const chartApiRef = useRef<IChartApi | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [hoverDate, setHoverDate] = useState<{ label: string; x: number } | null>(null);
  const [legendRange, setLegendRange] = useState<[number, number] | null>(null);
  const legendHeight = showDateLegend ? 12 : 0;
  const chartHeight = Math.max(0, height - legendHeight);
  const performanceChartTimeframe = useAtomValue(performanceChartTimeframeAtom);
  const chartTimeframe = timeframe || performanceChartTimeframe;

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ['TransactionHistoricalService.getPaginatedHistory', saleAddress],
    queryFn: ({ pageParam = 1 }) => TransactionHistoricalService.getPaginatedHistory({
      address: saleAddress,
      interval: 24 * 60 * 60, // daily buckets for all-time preview
      page: pageParam,
      limit: 200,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length === 0) {
        return undefined;
      }
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: !!saleAddress && allTime,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!allTime) return;
    if (historyQuery.hasNextPage && !historyQuery.isFetching) {
      historyQuery.fetchNextPage();
    }
  }, [allTime, historyQuery.hasNextPage, historyQuery.isFetching, historyQuery.fetchNextPage]);

  const { chartContainer, chart } = useChart({
    height: chartHeight,
    chartOptions: {
      grid: {
        horzLines: {
          visible: false,
        },
        vertLines: {
          visible: false,
        },
      },
      timeScale: {
        visible: showTimeScale,
        borderVisible: false,
        ticksVisible: showTimeScale,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: showTimeScale
          ? (time: any) => {
            if (typeof time === 'number') {
              return moment.unix(time).format('D');
            }
            if (time?.year && time?.month && time?.day) {
              return moment({ year: time.year, month: time.month - 1, day: time.day }).format('D');
            }
            return '';
          }
          : undefined,
      },
      crosshair: {
        vertLine: {
          visible: showCrosshair,
          color: 'rgba(52, 211, 153, 1)',
          width: 2,
        },
        horzLine: {
          visible: false,
        },
      },
      handleScale: false,
    },
    onChartReady: (chartInstance) => {
      chartApiRef.current = chartInstance;
      const seriesOptions: AreaSeriesPartialOptions = {
        priceLineVisible: false,
        lineColor: 'rgb(245, 158, 11)',
        topColor: 'rgba(245, 158, 11, 0.2)',
        bottomColor: 'rgba(245, 158, 11, 0.01)',
        lineWidth: 2,
        crosshairMarkerVisible: false,
        baseLineVisible: true,
      };

      areaSeries.current = chartInstance.addSeries(AreaSeries, seriesOptions);
      areaSeries.current.priceScale().applyOptions({
        visible: false, // disables auto scaling based on visible content
        ticksVisible: false,
      });

      chartInstance.timeScale().fitContent();
      setLoading(false);
      setChartReady(true);
    },
  });

  useEffect(() => {
    if (!showCrosshair || !chartReady || !chartApiRef.current || !areaSeries.current) {
      return;
    }

    const chartInstance = chartApiRef.current;
    const handleMove = (param: any) => {
      if (!param || !param.time || !param.seriesData || !areaSeries.current) {
        setHoverPrice(null);
        setHoverDate(null);
        return;
      }
      const seriesData = param.seriesData.get(areaSeries.current as any);
      const nextPrice = (seriesData && typeof seriesData.value === 'number')
        ? seriesData.value
        : null;
      setHoverPrice(nextPrice);

      const { time } = param;
      const label = typeof time === 'number'
        ? moment.unix(time).format('MMM D')
        : moment({ year: time.year, month: time.month - 1, day: time.day }).format('MMM D');
      const container = chartContainer.current;
      const width = container?.getBoundingClientRect().width ?? 0;
      const rawX = typeof param.point?.x === 'number' ? param.point.x : null;
      if (rawX === null || !width) {
        setHoverDate(null);
        return;
      }
      const clampedX = Math.max(0, Math.min(rawX, width));
      setHoverDate({ label, x: clampedX });
    };

    chartInstance.subscribeCrosshairMove(handleMove);
    return () => {
      chartInstance.unsubscribeCrosshairMove(handleMove);
    };
  }, [showCrosshair, chartReady, saleAddress, chartTimeframe, allTime]);

  useEffect(() => {
    if (!showCrosshair || !chartReady || !chartApiRef.current || !chartContainer.current) {
      return;
    }

    const chartInstance = chartApiRef.current;
    const container = chartContainer.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (!allowParentClick) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!chartInstance || !container) return;

      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;

      try {
        const time = chartInstance.timeScale().coordinateToTime(x);
        if (time !== null) {
          chartInstance.setCrosshairPosition(x, 0, { time: time as any });
        }
      } catch (error) {
        console.warn('[TokenLineChart] Error setting crosshair on touchstart:', error);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!allowParentClick) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!chartInstance || !container) return;

      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const clampedX = Math.max(0, Math.min(x, rect.width));

      try {
        const time = chartInstance.timeScale().coordinateToTime(clampedX);
        if (time !== null) {
          chartInstance.setCrosshairPosition(clampedX, 0, { time: time as any });
        }
      } catch (error) {
        console.warn('[TokenLineChart] Error setting crosshair on touchmove:', error);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!allowParentClick) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!chartInstance) return;

      try {
        chartInstance.setCrosshairPosition(-1, -1, {});
      } catch (error) {
        console.warn('[TokenLineChart] Error clearing crosshair on touchend:', error);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [showCrosshair, chartReady, allTime, allowParentClick]);

  // Watch for data changes (preview)
  useEffect(() => {
    if (allTime || !data?.result?.length || !areaSeries.current) {
      return;
    }
    // Clear existing data first
    areaSeries.current.setData([]);
    // Update with new data
    updateSeriesData(data as ChartResponse);
  }, [data, allTime]);

  // Watch for all-time data changes
  useEffect(() => {
    if (!allTime || !areaSeries.current || !historyQuery.data?.pages?.length) {
      return;
    }
    areaSeries.current.setData([]);
    updateSeriesDataFromHistory(historyQuery.data.pages);
  }, [allTime, historyQuery.data?.pages]);

  function updateSeriesData(chartData: ChartResponse) {
    const formattedData = chartData.result
      .map((item) => ({
        time: moment(item.end_time).unix() as UTCTimestamp,
        value: Number(item.last_price),
      }))
      .sort((a, b) => a.time - b.time);

    // if formattedData less than 10 generate more data with same value but with time - 1 hour
    if (formattedData.length < 10) {
      for (let i = 0; i < 10 - formattedData.length; i++) {
        const lastItem = formattedData[0];
        formattedData.unshift({
          time: (lastItem.time - 3600) as UTCTimestamp,
          value: lastItem.value,
        });
      }
    }

    if (formattedData.length) {
      setLegendRange([formattedData[0].time, formattedData[formattedData.length - 1].time]);
    }
    areaSeries.current?.setData(formattedData);
    chart?.timeScale().fitContent();
  }

  function updateSeriesDataFromHistory(pages: any[]) {
    const merged = pages.reduce((acc, page) => [...acc, ...page], [] as any[]);
    if (!merged.length) return;

    const formattedData = merged
      .map((item: any) => {
        const time = item?.timeClose || item?.time || item?.end_time;
        const price = item?.quote?.close ?? item?.close ?? item?.last_price ?? item?.price;
        if (!time || !Number.isFinite(Number(price))) return null;
        return {
          time: moment(time).unix() as UTCTimestamp,
          value: Number(price),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.time - b.time);

    if (formattedData.length) {
      setLegendRange([formattedData[0].time, formattedData[formattedData.length - 1].time]);
    }
    areaSeries.current?.setData(formattedData);
    chart?.timeScale().fitContent();
  }

  if (loading) {
    return (
      <div className="d-flex justify-space-around">
        <div
          className="bg-gradient-to-r from-black/6 to-black/2 rounded-md animate-pulse"
          style={{ width: 140, height: 80 }}
        />
      </div>
    );
  }

  return (
    <div className={`chart-container flex flex-col h-full ${className ?? ''}`}>
      <div className="relative w-full" style={{ height: chartHeight }}>
        <div ref={chartContainer} className="lw-chart h-full w-full" />
        {showCrosshair && hoverPrice !== null && (
        <div className="absolute right-2 -top-8 text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-full pointer-events-none">
          $
          {formatNumber(hoverPrice, hoverPrice < 1 ? 6 : 2)}
        </div>
        )}
        {showCrosshair && hoverDate && (
        <div
          className="absolute -top-6 text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-full pointer-events-none"
          style={{ left: hoverDate.x, transform: 'translateX(-50%)' }}
        >
          {hoverDate.label}
        </div>
        )}
        {!hideTimeframe && (data as ChartResponse)?.timeframe && (
        <div className="timeframe-indicator absolute bottom-0 right-0 text-xs lowercase">
          {(data as ChartResponse).timeframe}
        </div>
        )}
      </div>
      {showDateLegend && legendRange && (
        <div className="mt-0.5 h-[12px] flex items-center justify-between text-[10px] text-white/60 pointer-events-none">
          <span>{moment.unix(legendRange[0]).format('MMM D')}</span>
          <span>{moment.unix(legendRange[1]).format('MMM D')}</span>
        </div>
      )}
    </div>
  );
};

export default TokenLineChart;
