import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Inbox, LoaderCircle, RotateCcw, TriangleAlert,
} from 'lucide-react';
import { DexService, DexTokenDto } from '../../../api/generated';
import { TokenListCards } from '../../../components/explore/components/TokenListCards';
import { TokenListTable } from '../../../components/explore/components/TokenListTable';
import DexTokenExplorerToolbar, {
  tokenOrder, TokenOrder, TokenPeriod, TokenSort,
} from '../components/DexTokenExplorerToolbar';
import './DexExploreTokens.scss';

interface PaginatedTokens {
  items: DexTokenDto[];
  meta: { totalItems: number; totalPages: number; currentPage: number };
}
const LIMIT = 10;

const DexExploreTokens = () => {
  const { t } = useTranslation();
  const [sort, setSort] = useState<TokenSort>('volume');
  const [period, setPeriod] = useState<TokenPeriod>('30d');
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = LIMIT;
  const order = tokenOrder(sort, period);
  const updateSearch = (value: string) => { setSearch(value); setPage(1); };
  const updateSort = (value: TokenSort) => {
    setSort(value);
    setAscending(value === 'name' || value === 'symbol');
    setPage(1);
  };
  const updatePeriod = (value: TokenPeriod) => { setPeriod(value); setPage(1); };
  const reverse = () => { setAscending((value) => !value); setPage(1); };
  // Existing result components accept API sort keys; keep their callbacks compatible.
  const handleSortChange = (key: TokenOrder) => {
    if (key === order) { reverse(); return; }
    if (key.endsWith('volume') || key.endsWith('change')) {
      const metric = key.endsWith('volume') ? 'volume' : 'change';
      setPeriod(key.slice(0, -metric.length) as TokenPeriod);
      updateSort(metric);
    } else updateSort(key as TokenSort);
  };
  const {
    data, isPending, isError, isFetching, refetch,
  } = useQuery({
    queryKey: ['DexService.listAllDexTokens', order, ascending ? 'ASC' : 'DESC', page, limit, search],
    queryFn: async () => {
      const result = await DexService.listAllDexTokens({
        page, limit, orderBy: order, orderDirection: ascending ? 'ASC' : 'DESC', search,
      });
      return result as unknown as PaginatedTokens;
    },
  });
  const resultProps = {
    tokens: data?.items ?? [],
    sort: { key: order, asc: ascending },
    onSortChange: handleSortChange,
    search,
    onSearchChange: updateSearch,
    loading: isPending,
    hideControls: true,
    timeframe: period,
  };
  let resultMessage = t('dex.tokenExplorer.loading');
  if (isError) resultMessage = t('dex.tokenExplorer.unavailable');
  else if (data) resultMessage = t('dex.tokenExplorer.count', { count: data.meta.totalItems });

  return (
    <div className="dex-token-explorer">
      <section aria-labelledby="dex-token-title">
        <header className="dex-token-explorer__heading">
          <div>
            <h1 id="dex-token-title">{t('dex.exploreTokens.title')}</h1>
            <p>{t('dex.tokenExplorer.description')}</p>
          </div>
          <span className="dex-token-explorer__network">æternity</span>
        </header>
        <DexTokenExplorerToolbar
          search={search}
          sort={sort}
          period={period}
          ascending={ascending}
          onSearch={updateSearch}
          onSort={updateSort}
          onPeriod={updatePeriod}
          onReverse={reverse}
        />
      </section>
      <div className="dex-token-explorer__meta" role="status" aria-live="polite">{resultMessage}</div>
      <div aria-busy={isFetching}>
        {isError && (
          <div className="dex-token-explorer__state" role="alert">
            <TriangleAlert aria-hidden="true" />
            <strong>{t('dex.tokenExplorer.error')}</strong>
            <p>{t('dex.tokenExplorer.retryHint')}</p>
            <button type="button" disabled={isFetching} onClick={() => refetch()}>
              <RotateCcw aria-hidden="true" />
              {t(isFetching ? 'dex.tokenExplorer.retrying' : 'dex.tokenExplorer.retry')}
            </button>
          </div>
        )}
        {!isError && isPending && (
          <div className="dex-token-explorer__state">
            <LoaderCircle aria-hidden="true" />
            <strong>{t('dex.tokenExplorer.loading')}</strong>
          </div>
        )}
        {!isError && !isPending && data?.items.length === 0 && (
          <div className="dex-token-explorer__state">
            <Inbox aria-hidden="true" />
            <strong>{t(search ? 'dex.tokenExplorer.noMatches' : 'dex.noTokensFound')}</strong>
            {search && (
            <>
              <p>{t('dex.tokenExplorer.searchHint')}</p>
              <button type="button" onClick={() => updateSearch('')}>{t('dex.tokenExplorer.clear')}</button>
            </>
            )}
          </div>
        )}
        {!isError && data && data.items.length > 0 && (
          <>
            <div className="md:hidden"><TokenListCards {...resultProps} /></div>
            <div className="hidden md:block"><TokenListTable {...resultProps} /></div>
          </>
        )}
      </div>
      {/* Responsive Pagination Controls */}
      {!isError && data && data.meta.totalItems > 0 && (
      <div className="flex flex-col md:flex-row justify-between items-center mt-5 p-3 md:py-4 md:px-5 bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl backdrop-blur-[10px] gap-3 md:gap-0">

        {/* Pagination Info */}
        <div className="flex items-center gap-2 order-2 md:order-1">
          <span className="text-xs md:text-sm text-[var(--light-font-color)] font-medium text-center md:text-left">
            {t('dex.exploreTokens.showingRange', {
              from: (page - 1) * limit + 1,
              to: Math.min(page * limit, data.meta.totalItems),
              total: data.meta.totalItems,
            })}
          </span>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-1.5 md:gap-2 order-1 md:order-2 flex-wrap justify-center md:justify-start">
          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className={`py-2 px-2 md:px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-sm md:text-[13px] font-medium transition-all duration-300 outline-none min-w-[80px] md:min-w-auto ${page === 1
              ? 'bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50'
              : 'bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px'
            }`}
            title={t('dex.exploreTokens.previousPage')}
          >
            {t('dex.exploreTokens.prev')}
          </button>

          {/* Page Number Display */}
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm text-[var(--standard-font-color)] font-semibold bg-[var(--accent-color)]/10 py-1 px-2 rounded-md border border-[var(--accent-color)]/20">
              {page}
            </span>
            <span className="text-sm text-[var(--light-font-color)]">
              {t('dex.exploreTokens.ofPages', { pages: Math.ceil(data.meta.totalItems / limit) })}
            </span>
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(data.meta.totalItems / limit)}
            className={`py-2 px-2 md:px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-sm md:text-[13px] font-medium transition-all duration-300 outline-none min-w-[60px] md:min-w-auto ${page >= Math.ceil(data.meta.totalItems / limit)
              ? 'bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50'
              : 'bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px'
            }`}
            title={t('dex.exploreTokens.nextPage')}
          >
            {t('dex.exploreTokens.next')}
          </button>
        </div>
      </div>
      )}

    </div>
  );
};

export default DexExploreTokens;
