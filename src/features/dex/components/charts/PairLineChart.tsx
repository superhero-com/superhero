import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import {
  ISeriesApi,
  AreaSeriesPartialOptions,
  UTCTimestamp,
  AreaSeries,
} from "lightweight-charts";

import { useChart } from "@/hooks";
import {
  performanceChartTimeframeAtom,
  PriceMovementTimeframe,
} from "@/features/trending/atoms";
import { useAtomValue } from "jotai";
import { DexPairService } from "@/api/generated";

interface PairLineChartProps {
  pairAddres: string;
  height?: number;
  hideTimeframe?: boolean;
  timeframe?: string;
}

interface ChartDataItem {
  end_time: string;
  last_price: number;
}

interface ChartResponse {
  result: ChartDataItem[];
  timeframe?: string;
}

export function PairLineChart({
  pairAddres,
  height = 200,
  hideTimeframe = false,
}: PairLineChartProps) {
  const [loading, setLoading] = useState(false);
  const areaSeries = useRef<ISeriesApi<"Area"> | undefined>();
  //
  const performanceChartTimeframe = useAtomValue(performanceChartTimeframeAtom);
  const { data } = useQuery({
    queryFn: () =>
      DexPairService.getPairPreview({
        address: pairAddres,
        interval: performanceChartTimeframe as PriceMovementTimeframe,
      }),
    enabled: !!pairAddres,
    queryKey: [
      "DexPairService.getPairPreview",
      pairAddres,
      performanceChartTimeframe,
    ],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { chartContainer, chart } = useChart({
    height,
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
        visible: false,
      },
      crosshair: {
        vertLine: {
          visible: false,
        },
        horzLine: {
          visible: false,
        },
      },
      handleScale: false,
    },
    onChartReady: (chartInstance) => {
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
      },
    });

    // Watch for data changes
  useEffect(() => {
    if (!areaSeries.current) {
      return;
    }
    
    // Clear existing data first
    areaSeries.current.setData([]);
    
    // If no data, leave chart empty
    if (!data?.result?.length) {
      return;
    }
    
    // Update with new data
    const chartData = data as ChartResponse;
    const now = moment().unix();
    
    // Calculate the minimum timestamp based on selected timeframe
    let minTime: number;
    switch (performanceChartTimeframe) {
      case '1d':
        minTime = now - (24 * 3600); // 24 hours ago
        break;
      case '7d':
        minTime = now - (7 * 24 * 3600); // 7 days ago
        break;
      case '30d':
        minTime = now - (30 * 24 * 3600); // 30 days ago
        break;
      default:
        minTime = 0; // Show all data
    }

    // Chart library constraints
    const MAX_CHART_VALUE = 90071992547409.91;
    const MIN_CHART_VALUE = -90071992547409.91;
    
    // Map all data with timestamps
    const allDataPoints = chartData.result
      .map((item) => {
        const itemTime = moment(item.end_time).unix();
        return {
          time: itemTime as UTCTimestamp,
          value: Number(item.last_price),
          originalTime: itemTime,
        };
      })
      .sort((a, b) => a.originalTime - b.originalTime);

    // Filter data to only include points within the selected timeframe
    const filteredData = allDataPoints
      .filter((item) => item.originalTime >= minTime)
      .map(({ time, value }) => ({ time, value }));

    // If no data in timeframe, show a flat line at the last known price
    if (filteredData.length === 0) {
      // Find the most recent data point before the timeframe
      const lastKnownPoint = allDataPoints
        .filter((item) => item.originalTime < minTime)
        .pop(); // Get the last item (most recent before timeframe)

      if (lastKnownPoint) {
        // Apply scaling to the last known value if needed
        const rawValue = lastKnownPoint.value;
        const maxPrice = rawValue;
        let scaleFactor = 1;
        if (maxPrice > MAX_CHART_VALUE) {
          scaleFactor = Math.pow(10, Math.ceil(Math.log10(maxPrice / MAX_CHART_VALUE)));
        }
        const scaledValue = rawValue / scaleFactor;
        const clampedValue = Math.max(MIN_CHART_VALUE, Math.min(MAX_CHART_VALUE, scaledValue));

        // Create a flat line spanning the entire timeframe
        const flatLineData = [
          { time: minTime as UTCTimestamp, value: clampedValue },
          { time: now as UTCTimestamp, value: clampedValue },
        ];
        areaSeries.current.setData(flatLineData);
        chart?.timeScale().fitContent();
        return;
      } else {
        // No data at all, clear chart
        areaSeries.current.setData([]);
        return;
      }
    }
    
    // Find max value to determine if scaling is needed
    const maxPrice = Math.max(...filteredData.map(item => item.value));
    
    // Calculate scale factor if values are too large
    let scaleFactor = 1;
    if (maxPrice > MAX_CHART_VALUE) {
      // Scale down by powers of 10 until it fits
      scaleFactor = Math.pow(10, Math.ceil(Math.log10(maxPrice / MAX_CHART_VALUE)));
    }
    
    let formattedData = filteredData
      .map((item) => {
        const rawValue = item.value;
        const scaledValue = rawValue / scaleFactor;
        
        // Ensure value is within bounds
        const clampedValue = Math.max(MIN_CHART_VALUE, Math.min(MAX_CHART_VALUE, scaledValue));
        
        return {
          time: item.time,
          value: clampedValue,
        };
      })
      .sort((a, b) => a.time - b.time);

    // Check if all values are the same (flat line scenario)
    const allValuesSame = formattedData.every(item => item.value === formattedData[0].value);
    const firstPoint = formattedData[0];
    const lastPoint = formattedData[formattedData.length - 1];

    // If we have only one point or all values are the same, ensure the line spans the full timeframe
    if (formattedData.length === 1 || allValuesSame) {
      // Ensure we have points at the start and end of the timeframe
      if (firstPoint.time > minTime) {
        formattedData.unshift({
          time: minTime as UTCTimestamp,
          value: firstPoint.value,
        });
      }
      if (lastPoint.time < now) {
        formattedData.push({
          time: now as UTCTimestamp,
          value: lastPoint.value,
        });
      }
    } else {
      // For multiple different values, ensure minimum data points for smooth rendering
      if (formattedData.length < 10 && formattedData.length > 0) {
        const lastItem = formattedData[formattedData.length - 1];
        for (let i = 0; i < 10 - formattedData.length; i++) {
          formattedData.push({
            time: (lastItem.time + (i + 1) * 3600) as UTCTimestamp,
            value: lastItem.value,
          });
        }
      }
    }
    
    areaSeries.current.setData(formattedData);
    chart?.timeScale().fitContent();
  }, [data, performanceChartTimeframe, chart]);

  if (loading) {
    return (
      <div className="d-flex justify-space-around">
        <div className="bg-gradient-to-r from-black/6 to-black/2 rounded-md animate-pulse" 
             style={{ width: 140, height: 80 }} />
      </div>
    );
  }
  return (
    <div className="chart-container relative mr-2">
      <div ref={chartContainer} className="lw-chart h-full" />
      {!hideTimeframe && (data as ChartResponse)?.timeframe && (
        <div className="timeframe-indicator absolute bottom-0 right-0 text-xs lowercase">
          {(data as ChartResponse).timeframe}
        </div>
      )}
    </div>
  );
}

export default PairLineChart;
