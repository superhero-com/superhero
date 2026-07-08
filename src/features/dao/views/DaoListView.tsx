import {
  useEffect, useMemo, useRef, useState,
} from 'react';

import { useTranslation } from 'react-i18next';
import { TokensService } from '@/api/generated';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAeSdk } from '@/hooks';
import { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '@/libs/decimal';
import { toAe } from '@/utils/bondingCurve';
import { LivePriceFormatter } from '@/features/shared/components';
import { AddressChip } from '@/components/AddressChip';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import Spinner from '@/components/Spinner';

type TokensListOrderBy = NonNullable<
  Parameters<typeof TokensService.listAll>[0]['orderBy']
>;

type SelectOptions<T> = Array<{
  title: string;
  disabled?: boolean;
  value: T;
}>;

const SORT = {
  marketCap: 'market_cap',
  treasury: 'treasury',
  newest: 'newest',
  holdersCount: 'holders_count',
} as const;
type OrderByOption = (typeof SORT)[keyof typeof SORT];

const Daos = () => {
  const { t: translate } = useTranslation('dao');
  const { activeAccount } = useAeSdk();
  const [search, setSearch] = useState('');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');

  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.marketCap);
  const [searchThrottled, setSearchThrottled] = useState('');
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  const orderByOptions: SelectOptions<OrderByOption> = [
    {
      title: translate('explore.marketCapLabel'),
      value: SORT.marketCap,
    },
    {
      title: translate('treasury'),
      value: SORT.treasury,
    },
    {
      title: translate('explore.newest'),
      value: SORT.newest,
    },
    {
      title: translate('explore.holdersCount'),
      value: SORT.holdersCount,
    },
  ];

  const orderByMapped = useMemo((): TokensListOrderBy => {
    if (orderBy === SORT.newest || orderBy === SORT.holdersCount) {
      return 'created_at';
    }
    return orderBy;
  }, [orderBy]);

  const finalOrderDirection = useMemo((): 'ASC' | 'DESC' => {
    // For date-based sorting, override the direction
    if (orderBy === SORT.holdersCount) return 'ASC';
    if (orderBy === SORT.newest) return 'DESC';
    // For other fields, use the state
    return orderDirection;
  }, [orderBy, orderDirection]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchThrottled(search);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const {
    data, isFetching, fetchNextPage, hasNextPage, error,
  } = useInfiniteQuery({
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => TokensService.listAll({
      orderBy: orderByMapped,
      orderDirection: finalOrderDirection,
      search: searchThrottled || undefined,
      limit: 20,
      page: pageParam,
    }) as unknown as TokenDto[],
    getNextPageParam: (lastPage: any, allPages, lastPageParam) => (
      lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
        ? undefined
        : lastPageParam + 1
    ),
    queryKey: [
      'TokensService.listAll',
      orderBy,
      orderByMapped,
      finalOrderDirection,
      searchThrottled,
    ],
    staleTime: 1000 * 60, // 1 minute
  });

  function updateOrderBy(val: OrderByOption) {
    setOrderBy(val);
    setOrderDirection('DESC'); // Reset to default direction when using dropdown
  }

  // handleSort removed (unused)

  const allItems = useMemo(
    () => (data?.pages?.length ? data.pages.map((page) => page.items).flat() : []),
    [data?.pages],
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-white">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="text-3xl font-extrabold text-white">{translate('daosTitle')}</div>
        <div className="flex items-center gap-2">
          <input
            placeholder={translate('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 min-h-10 box-border px-4 text-sm rounded-2xl border border-white/20 bg-gradient-to-b from-white/8 to-white/4 text-white backdrop-blur-lg shadow-lg placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
          <AppSelect
            value={orderBy}
            onValueChange={(v) => updateOrderBy(v as OrderByOption)}
            triggerClassName="h-10 min-h-10 w-auto min-w-[10rem] shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-0 text-sm text-white backdrop-blur-[10px] transition-all duration-300 hover:bg-white/[0.05] focus:outline-none data-[placeholder]:text-white/60"
            contentClassName="bg-gray-900 border-white/10"
          >
            {orderByOptions.map((option) => (
              <AppSelectItem key={option.value} value={option.value}>
                {option.title}
              </AppSelectItem>
            ))}
          </AppSelect>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-8 text-white/80">{translate('loading')}</div>
      )}
      {error && (
        <div className="text-center py-8 text-red-400">{error.message}</div>
      )}

      <div className="text-sm opacity-80 mt-2 mb-4 text-white/85">
        {translate('listIntro')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        {allItems.map((t) => (
          <div
            className={`liquid-glass liquid-glass--hover rounded-xl p-4 text-white ${
              activeAccount === t.owner_address
                ? 'liquid-glass--strong relative'
                : ''
            }`}
            key={t.address}
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex flex-col gap-1.5">
                <div className="font-black text-white text-lg tracking-wide">
                  {`#${t.symbol}`}
                </div>
                {activeAccount === t.owner_address && (
                <div className="text-xs px-2 py-1 rounded-btn-sm bg-purple-500/25 border border-purple-500/50 text-white w-fit">
                  {translate('owned')}
                </div>
                )}
              </div>
              <a
                className="px-4 py-2.5 rounded-xl text-white no-underline border-0 bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg shadow-purple-600/35 transition-all duration-120 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-600/45"
                href={`/trends/dao/${encodeURIComponent(
                  t.sale_address || '',
                )}`}
              >
                {translate('openDao')}
              </a>
            </div>

            <div className="pb-2 border-b border-white/10">
              <TokenLineChart
                saleAddress={t.sale_address || t.address}
                height={48}
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs opacity-80 text-white/80">
                  {translate('treasury')}
                </div>
                <div className="font-bold text-white">
                  {t.sale_address && t.dao_balance != null ? (
                    <LivePriceFormatter
                      aePrice={Decimal.from(toAe(t.dao_balance))}
                      watchKey={t.sale_address}
                      className="text-xs sm:text-base"
                      hideFiatPrice
                    />
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-80 text-white/80">
                  {translate('explore.holders')}
                </div>
                <div className="font-bold text-white">
                  {t.holders_count ?? 0}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-80 text-white/80">
                  {translate('created')}
                </div>
                <div className="font-bold text-white">
                  {t.created_at
                    ? new Date(t.created_at).toLocaleDateString()
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-80 text-white/80">
                  {translate('explore.marketCapLabel')}
                </div>
                <div className="font-bold text-white">
                  {t.market_cap != null ? (
                    <LivePriceFormatter
                      aePrice={Decimal.from(toAe(t.market_cap))}
                      watchKey={t.sale_address}
                      className="text-xs sm:text-base"
                      hideFiatPrice
                    />
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-80 text-white/80">
                  {translate('trending')}
                </div>
                <div className="font-bold text-white">
                  {(t as any).trending_score != null
                    ? Math.round(
                      Number((t as any).trending_score),
                    ).toLocaleString()
                    : '—'}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 mt-2">
              <div className="text-xs opacity-80 text-white/80">{translate('sale')}</div>
              <AddressChip address={t.sale_address} />
            </div>

            <div className="flex justify-between items-center gap-2 mt-2">
              <a
                className="text-xs opacity-95 text-white no-underline px-3 py-2 rounded-xl border-0 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-150"
                href={`/trends/tokens/${encodeURIComponent(
                  t.name,
                )}`}
              >
                {translate('viewToken')}
              </a>
              <a
                className="text-xs opacity-95 text-white no-underline px-3 py-2 rounded-xl border-0 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-150"
                href={`https://aescan.io/contracts/${encodeURIComponent(
                  t.sale_address || t.address,
                )}?type=call-transactions`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {translate('aescanLink')}
              </a>
            </div>
          </div>
        ))}
        {!isFetching && !allItems.length && (
          <div className="col-span-full text-center py-8 opacity-80 text-white/85">
            {translate('noDaosFound')}
          </div>
        )}
      </div>

      {hasNextPage && (
        <div className="text-center pt-2 pb-4">
          <button
            type="button"
            ref={loadMoreBtn}
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            className={`px-6 py-3 rounded-btn border-none text-white cursor-pointer text-base font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isFetching
                ? 'bg-white/10 cursor-not-allowed opacity-60'
                : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isFetching ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="w-4 h-4" />
                {translate('trending.tokenList.loadingEllipsis')}
              </div>
            ) : (
              translate('trending.tokenList.loadMore')
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Daos;
