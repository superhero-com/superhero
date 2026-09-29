import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Coins, Inbox, LoaderCircle,
  RotateCcw, TriangleAlert, Wallet, Waves, X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DexService, PairTransactionDto } from '../../../api/generated';
import type { DataTableResponse } from '../../shared/components/DataTable';
import { TransactionCard } from '../components/TransactionCard';
import DexTransactionExplorerToolbar from '../components/DexTransactionExplorerToolbar';
import './DexExploreTokens.scss';
import './DexExploreTransactions.scss';

const emptyAddresses = { pairAddress: '', accountAddress: '' };
type AddressField = keyof typeof emptyAddresses;
const addressFields: AddressField[] = ['pairAddress', 'accountAddress'];
const DexExploreTransactions = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenAddress = searchParams.get('tokenAddress');
  const [type, setType] = useState('all');
  const [ascending, setAscending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(emptyAddresses);
  const [addresses, setAddresses] = useState(emptyAddresses);
  const [pagination, setPagination] = useState({ tokenAddress, page: 1 });
  const page = pagination.tokenAddress === tokenAddress ? pagination.page : 1;
  const setPage = (value: number) => setPagination({ tokenAddress, page: value });
  useEffect(() => { setPagination({ tokenAddress, page: 1 }); }, [tokenAddress]);
  const panelId = useId(); const fieldId = useId();
  const {
    data, isPending, isError, isFetching, refetch,
  } = useQuery({
    queryKey: ['DexService.listAllPairTransactions', type, ascending, addresses, tokenAddress, page],
    queryFn: async () => {
      const response = await DexService.listAllPairTransactions({
        page,
        limit: 10,
        orderBy: 'created_at',
        orderDirection: ascending ? 'ASC' : 'DESC',
        txType: type === 'all' ? undefined : type,
        pairAddress: addresses.pairAddress || undefined,
        accountAddress: addresses.accountAddress || undefined,
        tokenAddress: tokenAddress || undefined,
      });
      return response as unknown as DataTableResponse<PairTransactionDto>;
    },
  });
  const token = data?.items.flatMap((item) => [item.pair.token0, item.pair.token1])
    .find((item) => item.address === tokenAddress);
  const tokenLabel = token?.symbol || token?.name || tokenAddress;
  const addressCount = Number(!!addresses.pairAddress) + Number(!!addresses.accountAddress);
  const hasFilter = type !== 'all' || addressCount > 0 || !!tokenAddress;
  const removeToken = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tokenAddress');
    setSearchParams(next);
    setPage(1);
  };
  const clearAll = () => {
    setType('all'); setDraft(emptyAddresses); setAddresses(emptyAddresses); removeToken();
  };
  const removeAddress = (field: AddressField) => {
    setAddresses((value) => ({ ...value, [field]: '' }));
    setDraft((value) => ({ ...value, [field]: '' }));
    setPage(1);
  };
  let resultMessage = t('dex.transactionExplorer.loading');
  if (isError) resultMessage = t('dex.transactionExplorer.unavailable');
  else if (data) resultMessage = t('dex.transactionExplorer.count', { count: data.meta.totalItems });

  return (
    <div className="dex-token-explorer dex-tx-explorer">
      <section aria-labelledby="dex-tx-title">
        <header className="dex-token-explorer__heading">
          <div>
            <h1 id="dex-tx-title">{t('dex.transactionExplorer.title')}</h1>
            <p>{t('dex.transactionExplorer.description')}</p>
          </div>
          <span className="dex-token-explorer__network">æternity</span>
        </header>
        <DexTransactionExplorerToolbar
          type={type}
          ascending={ascending}
          expanded={expanded}
          addressCount={addressCount}
          panelId={panelId}
          onType={(value) => { setType(value); setPage(1); }}
          onOrder={(value) => { setAscending(value); setPage(1); }}
          onToggle={() => setExpanded((value) => !value)}
        />
        <form
          id={panelId}
          className="dex-tx-addresses"
          hidden={!expanded}
          onSubmit={(event) => {
            event.preventDefault();
            setAddresses({
              pairAddress: draft.pairAddress.trim(),
              accountAddress: draft.accountAddress.trim(),
            });
            setPage(1);
          }}
        >
          <div className="dex-tx-addresses__fields">
            {addressFields.map((field) => (
              <label key={field} htmlFor={`${fieldId}-${field}`}>
                <span>
                  {field === 'pairAddress' ? <Waves aria-hidden="true" /> : <Wallet aria-hidden="true" />}
                  {t(`dex.transactionExplorer.${field}`)}
                </span>
                <input
                  id={`${fieldId}-${field}`}
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={field === 'pairAddress' ? 'ct_…' : 'ak_…'}
                  value={draft[field]}
                  onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
                />
              </label>
            ))}
          </div>
          <div className="dex-tx-addresses__footer">
            <p>{t('dex.transactionExplorer.addressHint')}</p>
            <button type="submit">
              {t('dex.transactionExplorer.apply')}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </form>
        {hasFilter && (
          <div className="dex-tx-filters" role="group" aria-label={t('dex.transactionExplorer.appliedFilters')}>
            {tokenAddress && (
            <span className="dex-tx-filters__chip">
              <Coins aria-hidden="true" />
              <span>
                {t('dex.transactionExplorer.token')}
                {' '}
                <bdi>{tokenLabel}</bdi>
              </span>
              <button type="button" aria-label={t('dex.transactionExplorer.removeToken')} onClick={removeToken}><X aria-hidden="true" /></button>
            </span>
            )}
            {addressFields.map((field) => addresses[field] && (
              <span className="dex-tx-filters__chip" key={field}>
                {field === 'pairAddress' ? <Waves aria-hidden="true" /> : <Wallet aria-hidden="true" />}
                <span>
                  {t(`dex.transactionExplorer.${field}`)}
                  {' '}
                  <bdi>{addresses[field]}</bdi>
                </span>
                <button type="button" aria-label={t(`dex.transactionExplorer.remove.${field}`)} onClick={() => removeAddress(field)}><X aria-hidden="true" /></button>
              </span>
            ))}
            <button className="dex-tx-filters__clear" type="button" onClick={clearAll}>{t('dex.transactionExplorer.clear')}</button>
          </div>
        )}
      </section>
      <div className="dex-token-explorer__meta" role="status" aria-live="polite">{resultMessage}</div>
      <div aria-busy={isFetching}>
        {isError && (
          <div className="dex-token-explorer__state" role="alert">
            <TriangleAlert aria-hidden="true" />
            <strong>{t('dex.transactionExplorer.error')}</strong>
            <p>{t('dex.transactionExplorer.retryHint')}</p>
            <button type="button" disabled={isFetching} onClick={() => refetch()}>
              <RotateCcw aria-hidden="true" />
              {t(isFetching ? 'dex.transactionExplorer.retrying' : 'dex.transactionExplorer.retry')}
            </button>
          </div>
        )}
        {!isError && isPending && (
        <div className="dex-token-explorer__state">
          <LoaderCircle aria-hidden="true" />
          <strong>{t('dex.transactionExplorer.loading')}</strong>
        </div>
        )}
        {!isError && data?.items.length === 0 && (
          <div className="dex-token-explorer__state">
            <Inbox aria-hidden="true" />
            <strong>{t('dex.transactionExplorer.noMatches')}</strong>
            <p>{t('dex.transactionExplorer.emptyHint')}</p>
            {hasFilter && <button type="button" onClick={clearAll}>{t('dex.transactionExplorer.clear')}</button>}
          </div>
        )}
        {!isError && data && data.items.length > 0 && (
          <>
            <div className="dex-tx-explorer__results">{data.items.map((item) => <TransactionCard key={item.tx_hash} transaction={item} />)}</div>
            {data.meta.totalPages > 1 && (
              <nav className="dex-tx-pagination" aria-label={t('dex.transactionExplorer.pagination')}>
                <button className="dex-tx-pagination__edge" type="button" aria-label={t('explore.firstPage')} disabled={page === 1 || isFetching} onClick={() => setPage(1)}><ChevronsLeft aria-hidden="true" /></button>
                <button type="button" aria-label={t('explore.previousPage')} disabled={page === 1 || isFetching} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></button>
                <span>{t('dex.transactionExplorer.pageOf', { page, pages: data.meta.totalPages })}</span>
                <button type="button" aria-label={t('explore.nextPage')} disabled={page >= data.meta.totalPages || isFetching} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></button>
                <button className="dex-tx-pagination__edge" type="button" aria-label={t('explore.lastPage')} disabled={page >= data.meta.totalPages || isFetching} onClick={() => setPage(data.meta.totalPages)}><ChevronsRight aria-hidden="true" /></button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default DexExploreTransactions;
