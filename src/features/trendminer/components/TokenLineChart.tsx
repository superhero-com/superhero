import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { ISeriesApi, AreaSeriesPartialOptions, UTCTimestamp, AreaSeries } from 'lightweight-charts';

import { useChart } from '../../../hooks/useChart';
import { TransactionHistoricalService } from '../../../api/generated';

interface TokenLineChartProps {
  saleAddress: string;
  height?: number;
  hideTimeframe?: boolean;
}

type PerformanceChartTimeframe = '1d' | '7d' | '30d';

interface ChartDataItem {
  end_time: string;
  last_price: number;
}

interface ChartResponse {
  result: ChartDataItem[];
  timeframe?: string;
}

export function TokenLineChart({
  saleAddress,
  height = 200,
  hideTimeframe = false,
}: TokenLineChartProps) {
  const [loading, setLoading] = useState(false);
  const areaSeries = useRef<ISeriesApi<'Area'> | undefined>();
  const [performanceChartTimeframe] = useState<PerformanceChartTimeframe>('30d');

  const { data } = useQuery({
    queryFn: () =>
      TransactionHistoricalService.getForPreview({
        address: saleAddress,
        interval: performanceChartTimeframe,
      }),
    enabled: !!saleAddress,
    queryKey: [
      'TransactionHistoricalService.getForPreview',
      saleAddress,
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
        lineColor: 'rgb(17, 97, 254)',
        topColor: 'rgba(17, 97, 254, 0.2)',
        bottomColor: 'rgba(17, 97, 254, 0.01)',
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

      if ((data as ChartResponse)?.result?.length) {
        updateSeriesData(data as ChartResponse);
      }
      setLoading(false);
    },
  });

  // Watch for data changes
  useEffect(() => {
    if (!data?.result?.length) {
      return;
    }
    areaSeries.current?.setData([]);
    updateSeriesData(data as ChartResponse);
  }, [data]);

  function updateSeriesData(chartData: ChartResponse) {
    const formattedData = chartData.result
      .map((item) => {
        return {
          time: moment(item.end_time).unix() as UTCTimestamp,
          value: Number(item.last_price),
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


export default TokenLineChart;