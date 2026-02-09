import React from 'react';
import { VOTE_TYPE, VoteState } from 'bctsl-sdk';
import AddressChip from '@/components/AddressChip';
import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';

interface VoteSubjectProps {
  voteState: VoteState;
}

function voteTypeHeadline(voteType: VOTE_TYPE): string {
  switch (voteType) {
    case VOTE_TYPE.VotePayout:
      return 'Payout Treasury Balance';
    case VOTE_TYPE.VotePayoutAmount:
      return 'Vote Payout Amount';
    case VOTE_TYPE.ChangeDAO:
      return 'Change DAO';
    case VOTE_TYPE.ChangeMetaInfo:
      return 'Change Meta Info';
    case VOTE_TYPE.ChangeMinimumTokenThreshold:
      return 'Change Minimum Token Threshold';
    case VOTE_TYPE.AddModerator:
      return 'Add Moderator';
    case VOTE_TYPE.DeleteModerator:
      return 'Delete Moderator';
    default:
      return 'Unknown Vote Type';
  }
}

export default function VoteSubject({ voteState }: VoteSubjectProps) {
  const subjectEntries = Object.entries(voteState.metadata.subject);
  const subjectText = voteTypeHeadline(subjectEntries[0][0] as VOTE_TYPE);
  const beneficiary = subjectEntries[0][1][0];

  return (
    <div className="text-white flex items-center gap-2 flex-wrap">
      <span className="font-medium">{subjectText}</span>
      <div className="flex items-center gap-4">
        <span className="text-white/80"> to </span>
        <AddressAvatarWithChainName address={beneficiary} variant="feed" />
      </div>

    </div>
  );
}
