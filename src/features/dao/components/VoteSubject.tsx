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
  const subjectText = t(voteTypeHeadlineKey(subjectEntries[0][0] as VOTE_TYPE));
  const beneficiary = subjectEntries[0][1][0];

  return (
    <div className="text-white flex items-center gap-2 flex-wrap">
      <span className="font-medium">{subjectText}</span>
      <div className="flex items-center gap-4">
        <span className="text-white/80"> {t('voteSubject.to')} </span>
        <AddressAvatarWithChainName address={beneficiary} variant="feed" />
      </div>

    </div>
  );
};

export default VoteSubject;
