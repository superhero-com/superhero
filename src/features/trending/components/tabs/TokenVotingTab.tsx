import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenVoteCard from '@/features/dao/components/TokenVoteCard';
import { useDaoVotes } from '@/features/dao/hooks/useDaoVotes';
import '@/features/dao/components/daoVoting.css';

/** Open votes of the token's DAO on the token page, with links to the full DAO page. */
export const TokenVotingTab = ({ token }: { token: TokenDto }) => {
  const { t } = useTranslation('dao');
  const {
    votes, openCount, data, isLoading, isError, currentBlockHeight,
  } = useDaoVotes(token.dao_address);
  const daoPath = `/trends/dao/${token.sale_address}`;
  const label = `#${token.name || token.symbol}`;

  // Open votes first, then the latest closed ones, so the tab stays short.
  const shown = useMemo(() => {
    const open = votes.filter((v) => v.status === 'open');
    const closed = votes.filter((v) => v.status !== 'open');
    return [...open, ...closed].slice(0, Math.max(3, open.length));
  }, [votes]);

  let body;
  if (isLoading || (!data && !isError) || (data && currentBlockHeight == null)) {
    body = <div className="dao-v-empty dao-v-muted" role="status">{t('loading')}</div>;
  } else if (isError) {
    body = <div className="dao-v-empty dao-v-muted" role="alert">{t('voting.list.loadError')}</div>;
  } else if (votes.length === 0) {
    body = (
      <div className="dao-v-empty">
        <p><strong>{t('voting.list.emptyTitle')}</strong></p>
        <p className="dao-v-muted">{t('voting.tab.emptyText', { token: label })}</p>
      </div>
    );
  } else {
    body = (
      <ul className="dao-v-items">
        {shown.map((vote) => (
          <TokenVoteCard
            key={vote.address}
            vote={vote}
            saleAddress={token.sale_address}
            height={currentBlockHeight as number}
            tokenSupply={data?.tokenSupply}
            voteTimeout={data?.voteTimeout}
            tokenSymbol={token.symbol}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="dao-v dao-v-card" aria-labelledby="token-voting-title">
      <div className="dao-v-tab-head">
        <div>
          <h2 id="token-voting-title">{t('voting.tab.title', { token: label })}</h2>
          <p className="dao-v-muted">
            {data ? t('voting.tab.subtitle', { count: openCount }) : t('voting.page.intro')}
          </p>
        </div>
        <div className="dao-v-tab-actions">
          <Link to={`${daoPath}?create=1`} className="dao-v-chip">
            <Plus size={16} aria-hidden="true" />
            {t('voting.list.create')}
          </Link>
          <Link to={daoPath} className="dao-v-chip">
            {t('voting.tab.openDao')}
          </Link>
        </div>
      </div>
      {body}
    </section>
  );
};
