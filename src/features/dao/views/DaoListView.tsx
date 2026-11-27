import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Search, Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import '@/components/governance/governance.css';
import { AddressChip } from '@/components/AddressChip';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import { LivePriceFormatter } from '@/features/shared/components';
import { useAccount } from '@/hooks';
import { Decimal } from '@/libs/decimal';
import { toAe } from '@/utils/bondingCurve';
import { CONFIG } from '@/config';

type CommunityPage = { items: TokenDto[]; meta: { currentPage: number; totalPages: number } };

type OrderBy = 'market_cap' | 'treasury' | 'created_at' | 'holders_count';
const Daos = () => {
  const { t, i18n } = useTranslation('governance');
  const { t: daoT } = useTranslation('dao');
  const { activeAccount } = useAccount();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [orderBy, setOrderBy] = useState<OrderBy>('treasury');
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const {
    data, isPending, isFetching, fetchNextPage, hasNextPage, error, refetch,
  } = useInfiniteQuery({
    initialPageParam: 1,
    queryKey: ['governance-communities', orderBy, query],
    queryFn: async ({ pageParam }) => await TokensService.listAll({
      orderBy, orderDirection: 'DESC', search: query || undefined, limit: 12, page: pageParam,
    }) as CommunityPage,
    getNextPageParam: (lastPage, _pages, page) => {
      const meta = lastPage.meta as { currentPage?: number; totalPages?: number } | undefined;
      return Number(meta?.currentPage) < Number(meta?.totalPages) ? page + 1 : undefined;
    },
    staleTime: 60_000,
  });
  const communities = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items ?? []) as TokenDto[] | undefined;
    const unique = new Map((items ?? []).map((token) => [token.sale_address || token.address, token]));
    return [...unique.values()];
  }, [data]);
  const sorts: { value: OrderBy; label: string }[] = [
    { value: 'treasury', label: daoT('treasury') },
    { value: 'holders_count', label: t('experience.membership') },
    { value: 'market_cap', label: daoT('explore:marketCapLabel') },
    { value: 'created_at', label: daoT('explore:newest') },
  ];
  const renderCommunities = () => {
    if (isPending) return <div className="gov-empty" role="status"><p>{daoT('loading')}</p></div>;
    if (error && !data) {
      return (
        <div className="gov-empty" role="alert">
          <p>{t('experience.refreshError')}</p>
          <button type="button" className="gov-button ui-secondary" onClick={() => refetch()}>{t('experience.retry')}</button>
        </div>
      );
    }
    return (
      <div className="gov-community-list">
        {communities.map((token) => (
          <article className="gov-community" key={token.sale_address || token.address}>
            <div className="gov-community-head">
              <div>
                <h2>
                  <Link to={`/trends/dao/${token.sale_address}`}>
                    <bdi>
                      #
                      {token.symbol || token.name}
                    </bdi>
                  </Link>
                </h2>
                {activeAccount === token.owner_address && <span className="gov-status gov-community-owned">{daoT('owned')}</span>}
              </div>
              <Link to={`/trends/dao/${token.sale_address}`} className="gov-button ui-secondary">
                {daoT('openDao')}
              </Link>
            </div>
            <div className="gov-community-chart">
              <TokenLineChart
                saleAddress={token.sale_address || token.address}
                width={320}
                height={56}
              />
            </div>
            <dl>
              <div>
                <dt>{daoT('treasury')}</dt>
                <dd>
                  {token.dao_balance != null ? (
                    <LivePriceFormatter
                      aePrice={Decimal.from(toAe(token.dao_balance))}
                      watchKey={token.sale_address}
                      hideFiatPrice
                    />
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt>{daoT('voting.page.holders')}</dt>
                <dd>{token.holders_count != null ? Number(token.holders_count).toLocaleString(i18n.language) : '—'}</dd>
              </div>
              <div>
                <dt>{daoT('explore:marketCapLabel')}</dt>
                <dd>
                  {token.market_cap != null ? (
                    <LivePriceFormatter
                      aePrice={Decimal.from(toAe(token.market_cap))}
                      watchKey={token.sale_address}
                      hideFiatPrice
                    />
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt>{daoT('created')}</dt>
                <dd>{token.created_at ? new Date(token.created_at).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</dd>
              </div>
            </dl>
            <div className="gov-community-contract">
              <span>{daoT('sale')}</span>
              <AddressChip address={token.sale_address || token.address} hideAvatar />
            </div>
            <div className="gov-community-foot">
              <Link to={`/trends/tokens/${encodeURIComponent(token.name)}`}>
                {daoT('viewToken')}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              {CONFIG.EXPLORER_URL && (
                <a href={`${CONFIG.EXPLORER_URL}/contracts/${encodeURIComponent(token.sale_address || token.address)}?type=call-transactions`} target="_blank" rel="noopener noreferrer">
                  {daoT('aescanLink')}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <main className="ui-page gov-page">
      <div className="gov-directory">
        <section className="gov-main" aria-labelledby="gov-communities-title">
          <h1 id="gov-communities-title" className="sr-only">{t('experience.communitiesTitle')}</h1>
          <div className="gov-toolbar">
            <label className="gov-search" htmlFor="community-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">{t('experience.searchCommunities')}</span>
              <input id="community-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('experience.searchCommunities')} />
            </label>
            <label className="gov-sort" htmlFor="community-sort">
              <span>{t('experience.sortLabel')}</span>
              <select id="community-sort" value={orderBy} onChange={(event) => setOrderBy(event.target.value as OrderBy)}>{sorts.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
          </div>
          {renderCommunities()}
          {!isPending && !error && !communities.length && (
          <div className="gov-empty">
            <Users aria-hidden="true" />
            <h2>{daoT('noDaosFound')}</h2>
            <button type="button" className="gov-button ui-secondary" onClick={() => setSearch('')}>{t('experience.clearFilters')}</button>
          </div>
          )}
          {hasNextPage && <div className="gov-load-more"><button type="button" className="gov-button ui-secondary" disabled={isFetching} onClick={() => fetchNextPage()}>{isFetching ? daoT('loading') : daoT('trending:tokenList.loadMore')}</button></div>}
        </section>

      </div>
    </main>
  );
};
export default Daos;
