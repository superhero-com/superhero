/** Contract abort codes from `DAO.aes` / `DAOVote.aes` that a voter can run into, mapped to `dao.voting.errors.*`. */
const CONTRACT_ERRORS: Record<string, string> = {
  ADD_VOTE_TOKEN_HOLDER_MISSMATCH: 'notEnoughTokensToCreate',
  ADD_VOTE_DAO_DONATION_MISSMATCH: 'feeMismatch',
  DESCRIPTION_STRING_TOO_LONG: 'descriptionTooLong',
  VOTE_ALREADY_CLOSED: 'voteClosed',
  VOTER_ALREADY_VOTED: 'alreadyVoted',
  VOTER_NOT_VOTED: 'notVoted',
  VOTE_NOT_CLOSED: 'voteNotClosed',
  AMOUNT_ALREADY_WITHDRAWN: 'alreadyWithdrawn',
  VOTE_ALREADY_APPLIED: 'alreadyApplied',
  VOTE_RESULT_TIMEOUTED: 'applyWindowOver',
  GREATER_55_PERCENT_AGREEMENT_REQUIRED: 'notPassed',
  GREATER_10_PERCENT_STAKE_REQUIRED: 'notPassed',
  NO_VOTE_STAKE: 'notPassed',
  VOTE_NOT_YET_FINAL: 'voteNotClosed',
};

/** Returns an i18n key under the `dao` namespace for a failed DAO call. */
export function daoErrorKey(error: unknown): string {
  const raw = String((error as any)?.message ?? error ?? '');
  const lc = raw.toLowerCase();
  if (lc.includes('rejected by user') || lc.includes('user rejected') || lc.includes('rejected')) {
    return 'voting.errors.rejected';
  }
  const code = Object.keys(CONTRACT_ERRORS).find((c) => raw.includes(c));
  if (code) return `voting.errors.${CONTRACT_ERRORS[code]}`;
  if (lc.includes('insufficient') && lc.includes('balance')) return 'voting.errors.notEnoughAe';
  return 'voting.errors.generic';
}
