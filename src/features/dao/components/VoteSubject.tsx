import { VoteState } from 'bctsl-sdk';
import { useTranslation } from 'react-i18next';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { formatUnits, summarizeSubject } from '../utils/voteRules';

interface VoteSubjectProps {
  voteState: Pick<VoteState, 'metadata'>;
  tokenSymbol?: string;
}

/** One plain line saying what happens if the vote passes, e.g. "Send 1,500 AE to organiser.chain". */
const VoteSubject = ({ voteState, tokenSymbol }: VoteSubjectProps) => {
  const { t, i18n } = useTranslation('dao');
  const summary = summarizeSubject(voteState.metadata?.subject);
  const amount = summary.amountAettos != null
    ? formatUnits(summary.amountAettos, 18, i18n.language)
    : undefined;
  const tokens = summary.tokenAmount != null
    ? formatUnits(summary.tokenAmount, 18, i18n.language)
    : undefined;

  return (
    <span className="dao-v-subject">
      <span>{t(`voting.subject.${summary.kind}`, { amount, tokens, symbol: tokenSymbol ?? '' })}</span>
      {summary.account && <AddressAvatarWithChainName address={summary.account} variant="feed" />}
    </span>
  );
};

export default VoteSubject;
