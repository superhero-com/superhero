import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import { TransactionHistoricalService } from '@/api/generated';
import { performanceChartTimeframeAtom, PriceMovementTimeframe } from '@/features/trending/atoms';
import { useAtomValue } from 'jotai';

interface TokenPriceChartProps {
  saleAddress: string;
  height?: number;
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

export function TokenPriceChart({
  saleAddress,
  height = 24,
  className = '',
}: TokenPriceChartProps) {
  const performanceChartTimeframe = useAtomValue(performanceChartTimeframeAtom);

  const { data } = useQuery({
    queryFn: () =>
      TransactionHistoricalService.getForPreview({
        address: saleAddress,
        interval: performanceChartTimeframe as PriceMovementTimeframe,
      }),
    enabled: !!saleAddress,
    queryKey: [
      'TransactionHistoricalService.getForPreview',
      saleAddress,
      performanceChartTimeframe,
    ],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const chartData = useMemo(() => {
    if (!data?.result?.length) return [];

    const formattedData = data.result
      .map((item) => ({
        time: moment(item.end_time).unix(),
        value: Number(item.last_price),
      }))
      .sort((a, b) => a.time - b.time);

    // If formattedData less than 10, generate more data with same value but with time - 1 hour
    if (formattedData.length < 10) {
      for (let i = 0; i < 10 - formattedData.length; i++) {
        const lastItem = formattedData[0];
        formattedData.unshift({
          time: lastItem.time - 3600,
          value: lastItem.value,
        });
      }
    }

    return formattedData;
  }, [data]);

  if (!chartData.length) {
    return (
      <div 
        className={`bg-gradient-to-r from-black/6 to-black/2 rounded-md animate-pulse ${className}`}
        style={{ width: 100, height }}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: 100, height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`colorValue-${saleAddress}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" stopOpacity={1} />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0.01)" stopOpacity={1} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill={`url(#colorValue-${saleAddress})`}
            dot={false}
            activeDot={false}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TokenPriceChart;

