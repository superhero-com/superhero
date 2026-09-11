import { describe, expect, it } from 'vitest';
import { VOTE_STATE_LABEL, VoteState } from 'bctsl-sdk';
import type { DAOState } from '../../hooks/useDao';
import { getVoteStateLabel, voteYesFraction } from '../voteCalculations';

function vote(yes: bigint, no: bigint): VoteState {
  return { vote_state: new Map([[true, yes], [false, no]]), close_height: 100n } as VoteState;
}
const dao: DAOState = {
  factory: 'ct_factory',
  token_sale: 'ct_sale',
  votes: new Map([[1n, [false, 'ct_vote']]]),
  vote_timeout: 20n,
};

describe('DAO vote calculations', () => {
  it.each([
    [0n, 0n, 0], [3n, 1n, 0.75], [1n, 3n, 0.25], [5n, 0n, 1],
    [3n * 10n ** 30n, 10n ** 30n, 0.75],
  ])('shows the correct fraction for %s yes and %s no votes', (yes, no, expected) => {
    expect(voteYesFraction(vote(yes, no))).toBe(expected);
  });

  it('uses the contract 55 percent approval and 10 percent participation thresholds', () => {
    expect(getVoteStateLabel(vote(55n, 45n), dao, 1000n, 1n, 100)).toBe(VOTE_STATE_LABEL.APPLIABLE);
    expect(getVoteStateLabel(vote(54n, 46n), dao, 1000n, 1n, 100))
      .toBe(VOTE_STATE_LABEL.NOT_SUCCESSFUL);
    expect(getVoteStateLabel(vote(55n, 44n), dao, 1000n, 1n, 100))
      .toBe(VOTE_STATE_LABEL.NOT_SUCCESSFUL);
    expect(getVoteStateLabel(vote(0n, 0n), dao, 0n, 1n, 100)).toBe(VOTE_STATE_LABEL.NOT_SUCCESSFUL);
  });

  it('preserves the inclusive contract timeout and already applied state', () => {
    const state = vote(55n, 45n);
    expect(getVoteStateLabel(state, dao, 1000n, 1n, 99)).toBe(VOTE_STATE_LABEL.OPEN);
    expect(getVoteStateLabel(state, dao, 1000n, 1n, 120)).toBe(VOTE_STATE_LABEL.APPLIABLE);
    expect(getVoteStateLabel(state, dao, 1000n, 1n, 121)).toBe(VOTE_STATE_LABEL.TIMEOUT);
    expect(getVoteStateLabel(state, { ...dao, votes: new Map([[1n, [true, 'ct_vote']]]) } as DAOState, 1000n, 1n, 121)).toBe(VOTE_STATE_LABEL.APPLIED);
  });
});
