import { describe, expect, it } from 'vitest';
import { daoErrorKey, VOTE_NOT_LISTED } from '../daoErrors';

describe('daoErrorKey', () => {
  it('recognises a request the user cancelled in the wallet', () => {
    expect(daoErrorKey(new Error('Operation rejected by user'))).toBe('voting.errors.rejected');
    expect(daoErrorKey('User rejected the request')).toBe('voting.errors.rejected');
  });

  it.each([
    ['ADD_VOTE_TOKEN_HOLDER_MISSMATCH', 'notEnoughTokensToCreate'],
    ['ADD_VOTE_DAO_DONATION_MISSMATCH', 'feeMismatch'],
    ['VOTE_ALREADY_CLOSED', 'voteClosed'],
    ['VOTER_ALREADY_VOTED', 'alreadyVoted'],
    ['VOTE_RESULT_TIMEOUTED', 'applyWindowOver'],
    ['GREATER_55_PERCENT_AGREEMENT_REQUIRED', 'notPassed'],
    ['GREATER_10_PERCENT_STAKE_REQUIRED', 'notPassed'],
    ['VOTE_NOT_YET_FINAL', 'voteNotClosed'],
  ])('maps the contract abort %s to a plain message', (code, key) => {
    expect(daoErrorKey(new Error(`Invocation failed: "${code}"`))).toBe(`voting.errors.${key}`);
  });

  it('explains a vote the DAO does not list', () => {
    expect(daoErrorKey(new Error(VOTE_NOT_LISTED))).toBe('voting.errors.notListed');
  });

  it('tells an account short of AE apart from anything else', () => {
    expect(daoErrorKey(new Error('Insufficient balance for the transaction'))).toBe('voting.errors.notEnoughAe');
    expect(daoErrorKey(new Error('Network request failed'))).toBe('voting.errors.generic');
    // An SDK error that says "rejected" without the user having cancelled anything.
    expect(daoErrorKey(new Error('Contract call has been rejected'))).toBe('voting.errors.generic');
    expect(daoErrorKey(undefined)).toBe('voting.errors.generic');
  });
});
