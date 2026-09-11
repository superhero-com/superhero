import { describe, expect, it } from 'vitest';
import { VOTE_TYPE } from 'bctsl-sdk';
import { createVoteSubject } from '../voteSubject';

const account = 'ak_1PnNLieJHnXKX3MShkSAMX9gcNgYEhxzqYqpQcqgFp75sWNWX';
const contract = 'ct_1PnNLieJHnXKX3MShkSAMX9gcNgYEhxzqYqpQcqgFp75sWNWX';

describe('DAO proposal subject serialization', () => {
  it.each([VOTE_TYPE.VotePayout, VOTE_TYPE.AddModerator, VOTE_TYPE.DeleteModerator] as const)('preserves selected %s type and accepts account addresses', (type) => {
    expect(createVoteSubject(type, ` ${account} `)).toEqual({ [type]: [account] });
    expect(() => createVoteSubject(type, contract)).toThrow('account address');
  });

  it('converts a validated replacement DAO contract into a Sophia address argument', () => {
    expect(createVoteSubject(VOTE_TYPE.ChangeDAO, contract)).toEqual({ ChangeDAO: [contract.replace('ct_', 'ak_')] });
    expect(() => createVoteSubject(VOTE_TYPE.ChangeDAO, account)).toThrow('DAO contract');
  });

  it('keeps arbitrary precision for a numeric minimum threshold', () => {
    expect(createVoteSubject(VOTE_TYPE.ChangeMinimumTokenThreshold, '10000000000000000001')).toEqual({ ChangeMinimumTokenThreshold: [10000000000000000001n] });
    expect(createVoteSubject(VOTE_TYPE.ChangeMinimumTokenThreshold, '0')).toEqual({ ChangeMinimumTokenThreshold: [0n] });
    ['-1', '0.1', '1e18', account].forEach((value) => {
      expect(() => createVoteSubject(VOTE_TYPE.ChangeMinimumTokenThreshold, value)).toThrow('whole number');
    });
  });
});
