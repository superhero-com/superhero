import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import type { DaoVoteWithStatus } from '../hooks/useDaoVotes';
import { parseEventDescription, voteTally } from '../utils/voteRules';
import VoteEvent from './VoteEvent';
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
  const { event, text } = parseEventDescription(state.metadata?.description);
  // The accessible name starts with the visible text, so voice control can find the link.
  const linkText = status === 'open' ? t('voting.list.openVote') : t('voting.list.viewResult');

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
      {event && <VoteEvent event={event} />}
      {text && <p className="dao-v-muted" dir="auto">{text}</p>}
      <VoteMeters tally={tally} status={status} />
      <div className="dao-v-item-foot">
        <span className="dao-v-by dao-v-muted">
          {t('voting.list.by')}
          <AddressAvatarWithChainName address={state.author} variant="feed" />
        </span>
        <Link
          to={voteDetailsPath(saleAddress, vote)}
          className="dao-v-link"
          aria-label={`${linkText} #${vote.id.toString()}`}
        >
          {linkText}
        </Link>
      </div>
    </li>
  );
};

export default TokenVoteCard;
