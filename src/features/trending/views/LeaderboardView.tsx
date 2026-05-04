import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Head } from '../../../seo/Head';
import {
  LeaderboardFilters,
  LeaderboardCard,
  LeaderboardSkeleton,
  type LeaderboardDateRangeInputs,
} from '../components';
import {
  fetchLeaderboard,
  type LeaderboardMetric,
  type LeaderboardTimeframe,
  type PaginatedResponse,
  type LeaderboardItem,
} from '../api/leaderboard';
import {
  LEADERBOARD_TIMEFRAME_OPTIONS,
} from '../constants/leaderboard';

const DEFAULT_LEADERBOARD_PAGE_SIZE = 15;
const DATE_TIME_INPUT_LENGTH = 16;
const DATE_TIME_INPUT_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;

const parseDateTimeInput = (value: string) => {
  if (!value) return null;

  const match = DATE_TIME_INPUT_PATTERN.exec(value);
  if (!match) return null;

  const [, dayValue, monthValue, yearValue, hourValue, minuteValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const date = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0,
  );

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
};

const LeaderboardView = () => {
  const { t } = useTranslation('trending');
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('7d');
  const [metric, setMetric] = useState<LeaderboardMetric>('pnl');
  const [dateRange, setDateRange] = useState<LeaderboardDateRangeInputs>({
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const leaderboardPageSize = DEFAULT_LEADERBOARD_PAGE_SIZE;
  const parsedStartDate = parseDateTimeInput(dateRange.startDate);
  const parsedEndDate = parseDateTimeInput(dateRange.endDate);
  const hasCustomDateInput = Boolean(dateRange.startDate || dateRange.endDate);
  const hasInvalidDateFormat = Boolean(
    (dateRange.startDate.length === DATE_TIME_INPUT_LENGTH && !parsedStartDate)
      || (dateRange.endDate.length === DATE_TIME_INPUT_LENGTH && !parsedEndDate),
  );
  const isCustomDateRangeComplete = Boolean(parsedStartDate && parsedEndDate);
  const isDateRangeInvalid = Boolean(
    hasInvalidDateFormat
      || (
        parsedStartDate
        && parsedEndDate
        && parsedStartDate.getTime() > parsedEndDate.getTime()
      ),
  );
  const customDateRange = isCustomDateRangeComplete && !isDateRangeInvalid
    ? {
      startDate: parsedStartDate!.toISOString(),
      endDate: parsedEndDate!.toISOString(),
    }
    : null;

  const timeframeOption = LEADERBOARD_TIMEFRAME_OPTIONS.find(
    (option) => option.value === timeframe,
  );
  const timeframeLabel = customDateRange ? 'Custom' : timeframeOption?.label ?? '7D';
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<PaginatedResponse<LeaderboardItem>>({
    queryKey: [
      'leaderboard',
      timeframe,
      metric,
      page,
      leaderboardPageSize,
      customDateRange?.startDate,
      customDateRange?.endDate,
    ],
    queryFn: () => fetchLeaderboard({
      timeframe,
      metric,
      page,
      limit: leaderboardPageSize,
      sortDir: metric === 'mdd' ? 'ASC' : 'DESC',
      startDate: customDateRange?.startDate,
      endDate: customDateRange?.endDate,
    }),
    enabled: !isDateRangeInvalid,
    staleTime: 60 * 1000, // cache results per window/metric for 1 minute
    gcTime: 5 * 60 * 1000, // keep cached windows around for 5 minutes
  });

  const items = data?.items ?? [];
  const currentPage = data?.meta.currentPage ?? page;
  const totalPages = data?.meta.totalPages ?? 1;

  const handleTimeframeChange = (value: LeaderboardTimeframe) => {
    setTimeframe(value);
    setDateRange({ startDate: '', endDate: '' });
    setPage(1);
  };

  const handleMetricChange = (value: LeaderboardMetric) => {
    setMetric(value);
    setPage(1);
  };

  const handleDateRangeChange = (value: LeaderboardDateRangeInputs) => {
    setDateRange(value);
    setPage(1);
  };

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4 py-4">
      <Head
        title={t('leaderboardPageTitle')}
        description={t('explore:leaderboardDescription')}
        canonicalPath="/trends/leaderboard"
      />

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Trading Leaderboard
            </h1>
            <p className="mt-2 text-sm md:text-base leading-relaxed text-white/70 max-w-2xl">
              Discover the most active Superhero traders ranked by on-chain performance.
              Increase your trading volume, consistency, and trend ownership to climb the
              board and turn your wallet into a public on-chain track record.
            </p>
          </div>

          {/* Filters */}
          <div className="w-full md:w-auto">
            <LeaderboardFilters
              timeframe={timeframe}
              metric={metric}
              dateRange={dateRange}
              onTimeframeChange={handleTimeframeChange}
              onMetricChange={handleMetricChange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>

        {isDateRangeInvalid && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-100 text-sm rounded-2xl px-4 py-3">
            {hasInvalidDateFormat
              ? 'Use valid dates and times in dd/mm/yyyy hh:mm format.'
              : 'Start date must be before end date.'}
          </div>
        )}

        {hasCustomDateInput && !isCustomDateRangeComplete && !isDateRangeInvalid && (
          <div className="bg-white/[0.03] border border-white/10 text-white/60 text-sm rounded-2xl px-4 py-3">
            Enter both start and end dates to apply a custom leaderboard range.
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-200 text-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <span>{t('unableToLoadLeaderboard')}</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-lg bg-red-500/70 text-xs font-semibold hover:bg-red-500/90"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {!isError && (
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-4 sm:p-6">
            {/* Loading */}
            {isLoading && (
              <>
                <div className="hidden md:block">
                  <LeaderboardSkeleton rows={8} variant="table" />
                </div>
                <div className="md:hidden">
                  <LeaderboardSkeleton rows={6} variant="card" />
                </div>
              </>
            )}

            {/* Empty state */}
            {!isLoading && !isFetching && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <h2 className="text-base font-semibold text-white">
                  {t('noTopTraders')}
                </h2>
                <p className="text-sm text-white/70 max-w-md">
                  {t('leaderboardHighlights')}
                </p>
                <ul className="text-xs text-white/50 space-y-1 max-w-md list-disc list-inside text-left sm:text-center sm:list-none sm:space-y-0 sm:space-x-3 sm:flex sm:justify-center sm:flex-wrap">
                  <li>{t('leaderboardTip1')}</li>
                  <li>{t('leaderboardTip2')}</li>
                  <li>{t('leaderboardTip3')}</li>
                </ul>
                <p className="text-xs text-white/40 mt-1">
                  {t('tryDifferentTimeframe')}
                </p>
              </div>
            )}

            {/* Data */}
            {items.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {items.map((item, index) => (
                    <LeaderboardCard
                      key={item.address}
                      rank={(currentPage - 1) * leaderboardPageSize + index + 1}
                      item={item}
                      timeframeLabel={timeframeLabel}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                  <div className="text-xs text-white/60">
                    Page
                    {' '}
                    <span className="font-semibold text-white">
                      {currentPage}
                    </span>
                    {' '}
                    of
                    {' '}
                    <span className="font-semibold text-white">
                      {totalPages}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border border-white/15 transition-colors ${
                        currentPage <= 1 || isFetching
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages || isFetching}
                      onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border border-white/15 transition-colors ${
                        currentPage >= totalPages || isFetching
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardView;
