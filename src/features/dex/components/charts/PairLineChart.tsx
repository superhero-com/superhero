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
    if (!data?.result?.length || !areaSeries.current) {
      return;
    }
    // Clear existing data first
    areaSeries.current.setData([]);
    // Update with new data
    updateSeriesData(data as ChartResponse);
  }, [data]);

  function updateSeriesData(chartData: ChartResponse) {
    // Chart library constraints
    const MAX_CHART_VALUE = 90071992547409.91;
    const MIN_CHART_VALUE = -90071992547409.91;
    
    // Find max value to determine if scaling is needed
    const maxPrice = Math.max(...chartData.result.map(item => Number(item.last_price)));
    
    // Calculate scale factor if values are too large
    let scaleFactor = 1;
    if (maxPrice > MAX_CHART_VALUE) {
      // Scale down by powers of 10 until it fits
      scaleFactor = Math.pow(10, Math.ceil(Math.log10(maxPrice / MAX_CHART_VALUE)));
    }
    
    const formattedData = chartData.result
      .map((item) => {
        const rawValue = Number(item.last_price);
        const scaledValue = rawValue / scaleFactor;
        
        // Ensure value is within bounds
        const clampedValue = Math.max(MIN_CHART_VALUE, Math.min(MAX_CHART_VALUE, scaledValue));
        
        return {
          time: moment(item.end_time).unix() as UTCTimestamp,
          value: clampedValue,
        };
      })
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
    
    areaSeries.current?.setData(formattedData);
    chart?.timeScale().fitContent();
  }

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
