import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsService } from '@/api/generated';
import { Decimal } from '@/libs/decimal';
import { useCurrencies } from '@/hooks/useCurrencies';
import { COIN_SYMBOL } from '@/utils/constants';

export default function GlobalStatsAnalytics() {
  const { getFiat, currentCurrencyInfo } = useCurrencies();

  // Helper function to format dates as YYYY-MM-DD (equivalent to moment().format('YYYY-MM-DD'))
  const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

  // Fetch last 7 days trade volume data (matching Vue component date range)
  const { data: todayTradeVolume } = useQuery({
    queryFn: () => {
      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 3600 * 1000); // 7 days back
      return AnalyticsService.dailyTradeVolume({
        startDate: formatDate(start),
        endDate: formatDate(end),
      });
    },
    queryKey: ['AnalyticsService.getTodayTradeVolume'],
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch past 24 hours analytics data
  const { data: last24HoursData } = useQuery({
    queryFn: () => AnalyticsService.getPast24HoursAnalytics(),
    queryKey: ['AnalyticsService.getPast24HoursAnalytics'],
    staleTime: 1000 * 60, // 1 minute
  });

  // Computed values using Decimal for proper formatting (matching Vue component)
  const totalMarketCapValue = useMemo(() =>
    Decimal.from(last24HoursData?.total_market_cap_sum ?? 0),
    [last24HoursData]
  );

  const last7DaysTradeVolumeValue = useMemo(() =>
    Decimal.from(
      Array.isArray(todayTradeVolume)
        ? todayTradeVolume.reduce((sum, day) => sum + Number(day.volume_ae || 0), 0)
        : 0
    ),
    [todayTradeVolume]
  );

  // Helper function to format fiat values (matching Vue component)
  const formatFiat = (value: Decimal): string => {
    return `${currentCurrencyInfo.symbol} ${value.shorten()}`;
  };

  // Stats items with both AE amounts and fiat values (matching Vue component structure)
  const statsItems = useMemo((): { name: string; value: string | number; fiat?: string }[] => [
    {
      name: 'Total Market Cap',
      value:last24HoursData ? `${totalMarketCapValue.shorten()} ${COIN_SYMBOL}` : '-',
      fiat: formatFiat(getFiat(totalMarketCapValue)),
    },
    {
      name: 'Volume (7d)',
      value: todayTradeVolume ? `${last7DaysTradeVolumeValue?.shorten()} ${COIN_SYMBOL}` : '-',
      fiat: formatFiat(getFiat(last7DaysTradeVolumeValue)),
    },
    {
      name: 'Unique tokens',
      value: last24HoursData ? `${last24HoursData?.total_tokens ?? '-'}` : '-',
    },
    {
      name: 'Created tokens (24h)',
      value: last24HoursData?.total_created_tokens ?? '-',
    },
  ], [totalMarketCapValue, last7DaysTradeVolumeValue, last24HoursData, getFiat, formatFiat, currentCurrencyInfo]);

  // Check if data is loading
  // const isLoading = !todayTradeVolume || !last24HoursData;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statsItems.map((item) => (
        <div key={item.name} className="p-2">
          <div className="text-xs text-gray-500 mb-1">{item.name}</div>
          <div className="font-extrabold text-sm sm:text-base text-gray-900">
            {item.value}
            {item.fiat && (
              <div className="text-xs font-normal text-gray-500 mt-1">
                {item.fiat}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


