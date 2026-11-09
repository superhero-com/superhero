import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import type { DaoVoteWithStatus } from '../hooks/useDaoVotes';
import { voteTally } from '../utils/voteRules';
import VoteSubject from './VoteSubject';
import { VoteMeters, VoteStatusBadge, VoteTime } from './VoteStatus';

interface TokenVoteCardProps {
  vote: DaoVoteWithStatus;
  saleAddress: string;
  height: number;
  tokenSupply?: bigint;
  voteTimeout?: number;
  tokenSymbol?: string;
}

export const voteDetailsPath = (saleAddress: string, vote: Pick<DaoVoteWithStatus, 'id' | 'address'>) => (
  `/trends/dao/${saleAddress}/vote/${vote.id.toString()}/${vote.address}`
);

const TokenVoteCard = ({
  vote, saleAddress, height, tokenSupply, voteTimeout, tokenSymbol,
}: TokenVoteCardProps) => {
  const { t } = useTranslation('dao');
  const { state, status } = vote;
  const tally = voteTally(state, tokenSupply);

  return (
    <li className="dao-v-item">
      <div className="dao-v-item-top">
        <VoteStatusBadge status={status} />
        <VoteTime
          status={status}
          closeHeight={Number(state.close_height)}
          height={height}
          voteTimeout={voteTimeout}
        />
      </div>
      <h3>
        <VoteSubject voteState={state} tokenSymbol={tokenSymbol} />
      </h3>
      {state.metadata?.description && <p className="dao-v-muted" dir="auto">{state.metadata.description}</p>}
      <VoteMeters tally={tally} status={status} />
      <div className="dao-v-item-foot">
        <span className="dao-v-by dao-v-muted">
          {t('voting.list.by')}
          <AddressAvatarWithChainName address={state.author} variant="feed" />
        </span>
        <Link
          to={voteDetailsPath(saleAddress, vote)}
          className="dao-v-link"
          aria-label={t('voting.list.openVoteAria', { id: vote.id.toString() })}
        >
          {status === 'open' ? t('voting.list.openVote') : t('voting.list.viewResult')}
        </Link>
      </div>
    </li>
  );
};

export default TokenVoteCard;
