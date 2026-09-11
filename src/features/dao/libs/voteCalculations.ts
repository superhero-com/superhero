import { VOTE_STATE_LABEL, VoteState } from 'bctsl-sdk';
import type { DAOState } from '../hooks/useDao';

/** UI consumers expect a fraction in [0, 1], including partial agreement. */
export function voteYesFraction(state: VoteState): number {
  const yes = state.vote_state.get(true) || 0n;
  const total = yes + (state.vote_state.get(false) || 0n);
  return total > 0n ? Number((yes * 1_000_000n) / total) / 1_000_000 : 0;
}

export function voteStakeYesFraction(state: VoteState, supply: bigint): number {
  const yes = state.vote_state.get(true) || 0n;
  return supply > 0n ? Number((yes * 1_000_000n) / supply) / 1_000_000 : 0;
}

/** Match the pinned DAO.aes apply_vote_subject rules using integer arithmetic. */
export function getVoteStateLabel(
  vote: VoteState,
  dao: DAOState,
  tokenSupply: bigint,
  voteId: bigint,
  height: number,
): VOTE_STATE_LABEL {
  if (dao.votes.get(voteId)?.[0]) return VOTE_STATE_LABEL.APPLIED;
  if (BigInt(height) < vote.close_height) return VOTE_STATE_LABEL.OPEN;
  if (BigInt(height) > vote.close_height + dao.vote_timeout) return VOTE_STATE_LABEL.TIMEOUT;

  const yes = vote.vote_state.get(true) || 0n;
  const total = yes + (vote.vote_state.get(false) || 0n);
  const canApply = total > 0n && tokenSupply > 0n
    && (yes * 100n) / total >= 55n && (total * 100n) / tokenSupply >= 10n;
  return canApply ? VOTE_STATE_LABEL.APPLIABLE : VOTE_STATE_LABEL.NOT_SUCCESSFUL;
}
