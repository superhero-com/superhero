import React from 'react';
import { VOTE_TYPE, VoteState } from 'bctsl-sdk';
import { useTranslation } from 'react-i18next';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';

interface VoteSubjectProps {
  voteState: VoteState;
}

function voteTypeHeadlineKey(voteType: VOTE_TYPE): string {
  switch (voteType) {
    case VOTE_TYPE.VotePayout:
      return 'voteSubject.payoutTreasuryBalance';
    case VOTE_TYPE.VotePayoutAmount:
      return 'voteSubject.votePayoutAmount';
    case VOTE_TYPE.ChangeDAO:
      return 'voteSubject.changeDao';
    case VOTE_TYPE.ChangeMetaInfo:
      return 'voteSubject.changeMetaInfo';
    case VOTE_TYPE.ChangeMinimumTokenThreshold:
      return 'voteSubject.changeMinimumTokenThreshold';
    case VOTE_TYPE.AddModerator:
      return 'voteSubject.addModerator';
    case VOTE_TYPE.DeleteModerator:
      return 'voteSubject.deleteModerator';
    default:
      return 'voteSubject.unknownVoteType';
  }
}

const VoteSubject = ({ voteState }: VoteSubjectProps) => {
  const { t } = useTranslation('dao');
  const subjectEntries = Object.entries(voteState.metadata.subject);
  const [type, values] = subjectEntries[0] || [];
  const subjectText = t(voteTypeHeadlineKey(type as VOTE_TYPE));
  const beneficiary = values?.[0];

  return (
    <div className="text-white flex items-center gap-2 flex-wrap">
      <span className="font-medium">{subjectText}</span>
      <div className="flex items-center gap-4">
        <span className="text-white/80">
          {' '}
          {t('voteSubject.to')}
          {' '}
        </span>
        {typeof beneficiary === 'string' ? (
          <AddressAvatarWithChainName address={beneficiary} variant="feed" />
        ) : (
          <span>{beneficiary instanceof Map ? Array.from(beneficiary, ([key, value]) => `${key}: ${value}`).join(', ') : String(beneficiary ?? '')}</span>
        )}
      </div>

    </div>
  );
};

export default VoteSubject;
