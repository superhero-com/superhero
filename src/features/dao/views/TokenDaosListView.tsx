import { useMemo, useState } from 'react';
import { Encoded, toAe } from '@aeternity/aepp-sdk';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { VoteMetadata } from 'bctsl-sdk';
import { ChevronLeft, ExternalLink, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Link, useNavigate, useParams, useSearchParams,
} from 'react-router-dom';
import { TokensService } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { LivePriceFormatter } from '@/features/shared/components';
import { useAccount } from '@/hooks';
import { Decimal } from '@/libs/decimal';
import TokenVoteCard, { voteDetailsPath } from '../components/TokenVoteCard';
import VoteCreateForm from '../components/VoteCreateForm';
import VoteRulesCard from '../components/VoteRulesCard';
import { useDao } from '../hooks/useDao';
import { daoVotesQueryKey, useDaoVotes } from '../hooks/useDaoVotes';
import '../components/daoVoting.css';

type Filter = 'all' | 'open' | 'closed';

const toBigInt = (value?: string | number | null) => {
  if (value == null || value === '') return undefined;
  const n = new BigNumber(value);
  return n.isFinite() ? BigInt(n.integerValue(BigNumber.ROUND_DOWN).toFixed()) : undefined;
};

const TokenDaosListView = () => {
  const { t } = useTranslation('dao');
  const { saleAddress } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const creating = searchParams.get('create') === '1';

  const { data: token, isLoading, error } = useQuery({
    queryFn: () => TokensService.findByAddress({ address: saleAddress }),
    queryKey: ['TokensService.findByAddress', saleAddress],
    retry: 3,
    retryDelay: 1000 * 5,
  });

  const { addVote, tokenMetaInfo } = useDao({
    tokenSaleAddress: saleAddress as Encoded.ContractAddress,
  });
  const { activeAccount, balance } = useAccount();

  const {
    votes, openCount, data: votesData, isLoading: votesLoading, isError: votesError, refetch, currentBlockHeight,
  } = useDaoVotes(token?.dao_address);

  const tokenName = token?.name || token?.symbol || '';
  const tokenLabel = tokenName ? `#${tokenName}` : '';
  const tokenSymbol = tokenMetaInfo?.symbol || token?.symbol || '';
  const treasuryAettos = toBigInt(token?.dao_balance);

  const shown = useMemo(() => votes.filter((v) => {
    if (filter === 'open') return v.status === 'open';
    if (filter === 'closed') return v.status !== 'open';
    return true;
  }), [votes, filter]);

  const setCreating = (value: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('create', '1'); else next.delete('create');
    setSearchParams(next);
    try { window.scrollTo({ top: 0 }); } catch { /* jsdom */ }
  };

  const onCreate = async (metadata: VoteMetadata) => {
    const vote = await addVote(metadata);
    await queryClient.invalidateQueries({ queryKey: daoVotesQueryKey(token?.dao_address) });
    if (vote && saleAddress) navigate(voteDetailsPath(saleAddress, { id: vote.voteId, address: vote.address }));
    else setCreating(false);
  };

  const filters: { id: Filter; count: number }[] = [
    { id: 'all', count: votes.length },
    { id: 'open', count: openCount },
    { id: 'closed', count: votes.length - openCount },
  ];

  let list;
  if (votesLoading || (!votesData && !votesError) || (votesData && currentBlockHeight == null)) {
    list = <div className="dao-v-empty dao-v-muted" role="status">{t('loading')}</div>;
  } else if (votesError) {
    list = (
      <div className="dao-v-empty" role="alert">
        <p>{t('voting.list.loadError')}</p>
        <Button type="button" variant="outline" className="dao-v-btn ui-secondary" onClick={() => refetch()}>
          {t('voting.list.retry')}
        </Button>
      </div>
    );
  } else if (votes.length === 0) {
    list = (
      <div className="dao-v-empty">
        <p><strong>{t('voting.list.emptyTitle')}</strong></p>
        <p className="dao-v-muted">{t('voting.list.emptyText')}</p>
        <Button type="button" className="dao-v-btn ui-primary" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          {t('voting.list.createFirst')}
        </Button>
      </div>
    );
  } else if (shown.length === 0) {
    list = <div className="dao-v-empty dao-v-muted">{t(`voting.list.noneInFilter.${filter}`)}</div>;
  } else {
    list = (
      <ul className="dao-v-items">
        {shown.map((vote) => (
          <TokenVoteCard
            key={vote.address}
            vote={vote}
            saleAddress={saleAddress as string}
            height={currentBlockHeight as number}
            tokenSupply={votesData?.tokenSupply}
            voteTimeout={votesData?.voteTimeout}
            tokenSymbol={tokenSymbol}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-page dao-page dao-v max-w-[min(1200px,100%)] mx-auto min-h-screen px-4">
      <div className="dao-v-topline">
        <Link to={`/trends/tokens/${encodeURIComponent(token?.name || '')}`}>
          <ChevronLeft size={16} aria-hidden="true" />
          {tokenLabel ? t('voting.page.backTo', { token: tokenLabel }) : t('backToTokenSale')}
        </Link>
        <a
          href={`https://aescan.io/contracts/${encodeURIComponent(token?.dao_address || saleAddress || '')}?type=call-transactions`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('voting.page.viewOnAescan')}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>

      {error && (
        <div className="dao-v-note dao-v-note--error" role="alert"><p>{error.message}</p></div>
      )}
      {isLoading && <div className="dao-v-empty dao-v-muted" role="status">{t('loading')}</div>}

      {token && (
        <>
          <header className="dao-v-head">
            <div>
              <p className="dao-v-eyebrow">{t('voting.page.eyebrow')}</p>
              <h1 className="ui-page-title break-words">
                {tokenLabel}
                {' '}
                <span>{t('badge')}</span>
              </h1>
              <p className="dao-v-muted">{t('voting.page.intro')}</p>
            </div>
            <div className="dao-v-treasury">
              <span>{t('treasury')}</span>
              <strong>
                {token.dao_balance ? (
                  <LivePriceFormatter
                    aePrice={Decimal.from(toAe(token.dao_balance))}
                    watchKey={token.sale_address}
                    hideFiatPrice
                  />
                ) : '—'}
              </strong>
            </div>
          </header>

          <dl className="dao-v-stats">
            <div>
              <dt>{t('voting.page.openVotes')}</dt>
              <dd data-testid="dao-open-votes">{votesData ? openCount : '—'}</dd>
            </div>
            <div>
              <dt>{t('voting.page.allVotes')}</dt>
              <dd>{votesData ? votes.length : '—'}</dd>
            </div>
            {token.holders_count != null && (
              <div>
                <dt>{t('voting.page.holders')}</dt>
                <dd>{Number(token.holders_count).toLocaleString()}</dd>
              </div>
            )}
          </dl>

          <div className="dao-v-grid">
            <div className="min-w-0">
              {creating ? (
                <VoteCreateForm
                  tokenLabel={tokenLabel}
                  tokenSymbol={tokenSymbol}
                  treasuryAettos={treasuryAettos}
                  aeBalanceAettos={activeAccount ? toBigInt(balance as any) : undefined}
                  connected={!!activeAccount}
                  onCancel={() => setCreating(false)}
                  onCreate={onCreate}
                />
              ) : (
                <section className="dao-v-card" aria-labelledby="dao-v-list-title">
                  <div className="dao-v-list-head">
                    <div>
                      <h2 id="dao-v-list-title">{t('voting.list.title')}</h2>
                      <p className="dao-v-muted">{t('voting.list.subtitle')}</p>
                    </div>
                    <Button type="button" className="dao-v-btn ui-primary" onClick={() => setCreating(true)}>
                      <Plus aria-hidden="true" />
                      {t('voting.list.create')}
                    </Button>
                  </div>
                  {votes.length > 0 && (
                    <div className="dao-v-filters" role="group" aria-label={t('voting.list.filterLabel')}>
                      {filters.map(({ id, count }) => (
                        <button
                          key={id}
                          type="button"
                          className="dao-v-chip"
                          aria-pressed={filter === id}
                          onClick={() => setFilter(id)}
                        >
                          {t(`voting.list.filters.${id}`)}
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {list}
                </section>
              )}
            </div>
            <aside className="dao-v-side">
              <VoteRulesCard voteTimeout={votesData?.voteTimeout} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default TokenDaosListView;
