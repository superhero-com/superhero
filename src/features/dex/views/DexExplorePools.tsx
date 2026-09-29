import { PriceDataFormatter } from '@/features/shared/components';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox,
  LoaderCircle, RotateCcw, TriangleAlert, X,
} from 'lucide-react';
import { DexPairService, DexTokenSummaryDto, PairDto } from '../../../api/generated';
import { TokenChip } from '../../../components/TokenChip';
import { PairLineChart } from '../components/charts/PairLineChart';
import DexPoolExplorerToolbar, { PoolSort } from '../components/DexPoolExplorerToolbar';
import type { TokenPeriod } from '../components/DexTokenExplorerToolbar';
import './DexExploreTokens.scss';
import './DexExplorePools.scss';

// The explorer endpoint includes summaries that the generated PairDto omits.
type ExplorerPair = PairDto & { summary?: DexTokenSummaryDto | null };
interface PaginatedPairs {
  items: ExplorerPair[];
  meta: { totalItems: number; totalPages: number; currentPage: number };
}

const DexExplorePools = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pageSizeId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenAddress = searchParams.get('tokenAddress');
  const [sort, setSort] = useState<PoolSort>('transactions_count');
  const [ascending, setAscending] = useState(false);
  const [pagination, setPagination] = useState({ tokenAddress, page: 1 });
  // A URL filter change cannot issue a request using the previous filter's page.
  const page = pagination.tokenAddress === tokenAddress ? pagination.page : 1;
  const setPage = (value: number) => setPagination({ tokenAddress, page: value });
  useEffect(() => { setPagination({ tokenAddress, page: 1 }); }, [tokenAddress]);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [timeBase, setTimeBase] = useState<TokenPeriod>('30d');
  const updateSearch = (value: string) => { setSearch(value); setPage(1); };
  const updateSort = (value: PoolSort) => { setSort(value); setAscending(false); setPage(1); };
  const reverse = () => { setAscending((value) => !value); setPage(1); };
  const removeTokenFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tokenAddress');
    setPage(1);
    setSearchParams(next);
  };
  const {
    data, isPending, isError, isFetching, refetch,
  } = useQuery({
    queryFn: async () => {
      const result = await DexPairService.listAllPairs({
        page,
        limit,
        orderBy: sort,
        orderDirection: ascending ? 'ASC' : 'DESC',
        search,
        tokenAddress: tokenAddress || undefined,
      });
      return result as unknown as PaginatedPairs;
    },
    queryKey: ['DexPairService.listAllPairs', sort, ascending ? 'ASC' : 'DESC', search, page, limit, tokenAddress],
  });
  const token = data?.items.flatMap((pair) => [pair.token0, pair.token1])
    .find((item) => item.address === tokenAddress);
  const tokenLabel = token?.symbol || token?.name || tokenAddress;
  const total = data?.meta.totalItems ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  let resultMessage = t('dex.poolExplorer.loading');
  if (isError) resultMessage = t('dex.poolExplorer.unavailable');
  else if (data) resultMessage = t('dex.poolExplorer.count', { count: total });

  return (
    <div className="dex-token-explorer dex-pool-explorer">
      <section aria-labelledby="dex-pool-title">
        <header className="dex-token-explorer__heading">
          <div>
            <h1 id="dex-pool-title">{t('explore.explorePools')}</h1>
            <p>{t('dex.poolExplorer.description')}</p>
          </div>
          <span className="dex-token-explorer__network">æternity</span>
        </header>
        {tokenAddress && (
          <div className="dex-pool-filter">
            <span>
              {t('dex.poolExplorer.containing')}
              {' '}
              <bdi>{tokenLabel}</bdi>
            </span>
            <button type="button" aria-label={t('dex.poolExplorer.removeFilter')} onClick={removeTokenFilter}><X aria-hidden="true" /></button>
          </div>
        )}
        <DexPoolExplorerToolbar
          search={search}
          sort={sort}
          ascending={ascending}
          period={timeBase}
          onSearch={updateSearch}
          onSort={updateSort}
          onReverse={reverse}
          onPeriod={setTimeBase}
        />
      </section>
      <div className="dex-token-explorer__meta" role="status" aria-live="polite">{resultMessage}</div>
      <div aria-busy={isFetching}>
        {isError && (
          <div className="dex-token-explorer__state" role="alert">
            <TriangleAlert aria-hidden="true" />
            <strong>{t('dex.poolExplorer.error')}</strong>
            <p>{t('dex.poolExplorer.retryHint')}</p>
            <button type="button" disabled={isFetching} onClick={() => refetch()}>
              <RotateCcw aria-hidden="true" />
              {t(isFetching ? 'dex.poolExplorer.retrying' : 'dex.poolExplorer.retry')}
            </button>
          </div>
        )}
        {!isError && isPending && (
          <div className="dex-token-explorer__state">
            <LoaderCircle aria-hidden="true" />
            <strong>{t('dex.poolExplorer.loading')}</strong>
          </div>
        )}
        {!isError && data?.items.length === 0 && (
          <div className="dex-token-explorer__state">
            <Inbox aria-hidden="true" />
            <strong>{t(search || tokenAddress ? 'dex.poolExplorer.noMatches' : 'explore.noPoolsFound')}</strong>
            <p>{t('dex.poolExplorer.searchHint')}</p>
            {search && <button type="button" onClick={() => updateSearch('')}>{t('dex.poolExplorer.clear')}</button>}
          </div>
        )}
        {!isError && data && data.items.length > 0 && (
        <div className="mt-3">
          {/* Mobile Card Layout */}
          <div className="md:hidden flex flex-col gap-3">
            {data?.items.map((pair) => (
              <div
                key={pair.address}
                className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-4 backdrop-blur-[10px] cursor-pointer transition-all duration-300 active:scale-[0.98] active:bg-white/[0.05]"
                onClick={() => navigate(`/defi/explore/pools/${pair.address}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    navigate(`/defi/explore/pools/${pair.address}`);
                  }
                }}
              >
                {/* Pool Pair Header */}
                <div className="flex flex-col items-center justify-between mb-3 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/defi/explore/tokens/${pair.token0.address}`);
                      }}
                      className="bg-transparent border-0 cursor-pointer p-0"
                    >
                      <TokenChip token={pair.token0} />
                    </button>
                    <span className="text-[var(--light-font-color)] mx-1 text-sm font-medium">
                      /
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/defi/explore/tokens/${pair.token1.address}`);
                      }}
                      className="bg-transparent border-0 cursor-pointer p-0"
                    >
                      <TokenChip token={pair.token1} />
                    </button>
                  </div>

                  {/* Transaction Count Badge */}
                  <div className="bg-[var(--accent-color)]/10 px-2 py-1 rounded-xl border border-[var(--accent-color)]/20 mt-2">
                    <span className="text-xs text-[var(--accent-color)] font-semibold">
                      {pair.transactions_count || 0}
                      {' '}
                      {t('explore.txShort')}
                    </span>
                  </div>
                </div>

                {/* Pool Statistics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                    <div className="text-[11px] text-[var(--light-font-color)] font-medium mb-1 uppercase tracking-wider">
                      {t('explore.totalVolume')}
                    </div>
                    <div className="text-sm text-[var(--standard-font-color)] font-semibold">
                      <PriceDataFormatter priceData={pair.summary?.total_volume} bignumber />
                    </div>
                  </div>
                  <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                    <div className="text-[11px] text-[var(--light-font-color)] font-medium mb-1 uppercase tracking-wider">
                      {t('explore.volume')}
                      {' '}
                      <span className="text-xs font-normal">{timeBase}</span>
                    </div>
                    <div className="text-sm text-[var(--standard-font-color)] font-semibold">
                      <PriceDataFormatter
                        priceData={pair.summary?.change?.[timeBase]?.volume}
                        bignumber
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/defi/swap?from=${pair.token0.address}&to=${pair.token1.address}`,
                      );
                    }}
                    className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 outline-none active:scale-95 active:bg-[var(--button-gradient)] active:text-white"
                  >
                    🔄
                    {' '}
                    {t('explore.swap')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/defi/pool?from=${pair.token0.address}&to=${pair.token1.address}`,
                      );
                    }}
                    className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 outline-none active:scale-95 active:bg-[var(--button-gradient)] active:text-white"
                  >
                    ➕
                    {' '}
                    {t('dex.activity.addLiquidity')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl overflow-hidden backdrop-blur-[10px] overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white/5 border-b border-[var(--glass-border)]">
                  <th className="text-left py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">
                    {t('explore.pair')}
                  </th>
                  <th className="text-center py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">
                    {t('explore.txShort')}
                  </th>

                  <th className="text-right py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">
                    <div className="flex items-center gap-1.5">
                      {t('explore.volume')}
                      {' '}
                      <span className="text-xs font-normal">{timeBase}</span>
                    </div>
                  </th>
                  <th className="text-left py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">
                    {t('explore.totalVolume')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">
                    {t('explore.chart')}
                  </th>
                  <th className="text-center py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">
                    {t('explore.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((pair) => (
                  <tr
                    key={pair.address}
                    className="border-b border-white/5 transition-all duration-300 hover:bg-white/[0.03] cursor-pointer"
                    onClick={() => navigate(`/defi/explore/pools/${pair.address}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        navigate(`/defi/explore/pools/${pair.address}`);
                      }
                    }}
                  >
                    <td className="py-4 px-3 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/defi/explore/tokens/${pair.token0.address}`);
                        }}
                        className="text-[var(--accent-color)] bg-transparent border-0 cursor-pointer text-[15px] font-semibold transition-all duration-300 hover:underline hover:-translate-y-px"
                      >
                        <TokenChip token={pair.token0} />
                      </button>
                      <span className="text-[var(--light-font-color)] mx-1 text-sm">
                        /
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/defi/explore/tokens/${pair.token1.address}`);
                        }}
                        className="text-[var(--accent-color)] bg-transparent border-0 cursor-pointer text-[15px] font-semibold transition-all duration-300 hover:underline hover:-translate-y-px"
                      >
                        <TokenChip token={pair.token1} />
                      </button>
                    </td>
                    <td className="text-center py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium">
                      {pair.transactions_count || 0}
                    </td>
                    <td className="text-right py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium">
                      <PriceDataFormatter
                        priceData={pair.summary?.change?.[timeBase]?.volume}
                        bignumber
                      />
                    </td>
                    <td className="text-cnetr py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium">
                      <PriceDataFormatter priceData={pair.summary?.total_volume} bignumber />
                    </td>
                    <td className="text-cnetr py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium w-[150px]">
                      <PairLineChart
                        pairAddres={pair.address}
                        height={48}
                      />
                    </td>

                    <td className="text-center py-4 px-3">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/defi/swap?from=${pair.token0.address}&to=${pair.token1.address}`,
                            );
                          }}
                          className="py-1.5 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-xs font-medium backdrop-blur-[10px] transition-all duration-300 hover:bg-[var(--button-gradient)] hover:-translate-y-px hover:text-white"
                        >
                          {t('explore.swap')}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/defi/pool?from=${pair.token0.address}&to=${pair.token1.address}`,
                            );
                          }}
                          className="py-1.5 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-xs font-medium backdrop-blur-[10px] transition-all duration-300 hover:bg-[var(--button-gradient)] hover:-translate-y-px hover:text-white"
                        >
                          {t('explore.add')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        )}
      </div>
      <div className="dex-pool-pagination">
        <label htmlFor={pageSizeId}>
          <span>{t('dex.poolExplorer.perPage')}</span>
          <select id={pageSizeId} aria-label={t('dex.poolExplorer.perPageLabel')} value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}>
            {[10, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        {!isError && data && total > 0 && (
          <>
            <span className="dex-pool-pagination__range">{t('explore.showingPoolsRange', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}</span>
            <div className="dex-pool-pagination__pages">
              <button className="dex-pool-pagination__edge" type="button" aria-label={t('explore.firstPage')} disabled={page === 1 || isFetching} onClick={() => setPage(1)}><ChevronsLeft aria-hidden="true" /></button>
              <button type="button" aria-label={t('explore.previousPage')} disabled={page === 1 || isFetching} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></button>
              <span>{t('dex.poolExplorer.pageOf', { page, pages })}</span>
              <button type="button" aria-label={t('explore.nextPage')} disabled={page >= pages || isFetching} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></button>
              <button className="dex-pool-pagination__edge" type="button" aria-label={t('explore.lastPage')} disabled={page >= pages || isFetching} onClick={() => setPage(pages)}><ChevronsRight aria-hidden="true" /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DexExplorePools;
