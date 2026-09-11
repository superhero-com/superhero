import { Encoded, Encoding } from '@aeternity/aepp-sdk';
import { VOTE_TYPE, VoteMetadata } from 'bctsl-sdk';
import { ensureAddress } from '@/utils/common';

export const supportedVoteTypes = [
  VOTE_TYPE.VotePayout,
  VOTE_TYPE.ChangeDAO,
  VOTE_TYPE.ChangeMinimumTokenThreshold,
  VOTE_TYPE.AddModerator,
  VOTE_TYPE.DeleteModerator,
] as const;

export type SupportedVoteType = (typeof supportedVoteTypes)[number];

export function createVoteSubject(type: SupportedVoteType, raw: string): VoteMetadata['subject'] {
  const value = raw.trim();
  if (type === VOTE_TYPE.ChangeMinimumTokenThreshold) {
    if (!/^\d+$/.test(value)) throw new Error('Enter a non-negative whole number in token base units.');
    return { [type]: [BigInt(value)] };
  }

  if (type === VOTE_TYPE.ChangeDAO) {
    try {
      ensureAddress(value, Encoding.ContractAddress);
    } catch {
      throw new Error('Enter a valid DAO contract address (ct_).');
    }
    // Sophia address arguments use ak_ encoding, including contract accounts.
    return { [type]: [value.replace(/^ct_/, 'ak_') as Encoded.AccountAddress] };
  }

  try {
    ensureAddress(value, Encoding.AccountAddress);
  } catch {
    throw new Error('Enter a valid account address (ak_).');
  }
  switch (type) {
    case VOTE_TYPE.VotePayout: return { [type]: [value] };
    case VOTE_TYPE.AddModerator: return { [type]: [value] };
    case VOTE_TYPE.DeleteModerator: return { [type]: [value] };
    default: throw new Error('Unsupported vote type.');
  }
}
