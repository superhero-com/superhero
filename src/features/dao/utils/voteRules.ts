import BigNumber from 'bignumber.js';
import type { VoteState, VoteSubject } from 'bctsl-sdk';
import { VOTE_TYPE } from 'bctsl-sdk';

/**
 * The rules a token DAO vote runs by. None of these are exposed as an entrypoint or an SDK
 * constant, so they are copied from the contracts the app talks to:
 *
 * - `passYesPercent` / `passTurnoutPercent`: bctsl-contracts `DAO.aes`, `apply_vote_subject`
 *   (`in_favor_percentage >= 55`, `stake_percentage >= 10`, both integer percentages).
 * - `createFeeAettos`: bctsl-sdk `DAO.addVote` sends `555n * 10n ** 18n`, which `DAO.aes`
 *   `add_vote` requires exactly (`ADD_VOTE_DAO_DONATION_MISSMATCH`).
 * - `durationBlocks`: bctsl-contracts `DAOVote.aes` `init`, `(60 / 3) * 24 * 7 * 2` key blocks.
 * - `descriptionMaxLength`: `DAOVote.aes` `init` (`DESCRIPTION_STRING_TOO_LONG`).
 *
 * The apply window is not here: it is the DAO's `vote_timeout`, read from its state.
 *
 * bctsl-sdk's own `voteStateLabel` / `voteYesPercentage` are not used for this: the label checks
 * `> 50` against the yes stake over the whole supply, and the percentage divides bigints before
 * scaling, so it only ever returns 0 or 100.
 */
export const DAO_VOTE_RULES = {
  passYesPercent: 55,
  passTurnoutPercent: 10,
  createFeeAettos: 555n * 10n ** 18n,
  createFeeAe: 555,
  durationBlocks: (60 / 3) * 24 * 7 * 2,
  descriptionMaxLength: 300,
} as const;

/** æternity key block time. Heights are converted to wall-clock time with it, so it is approximate. */
export const KEY_BLOCK_MINUTES = 3;

export type DaoVoteStatus = 'open' | 'passed' | 'failed' | 'applied' | 'expired';

export interface DaoVoteTally {
  yes: bigint;
  no: bigint;
  total: bigint;
  /** Share of the voted stake that said yes, 0–100 with two decimals. */
  yesPercent: number;
  /** Share of the token supply that voted, 0–100 with two decimals. */
  turnoutPercent: number;
  /** Both pass rules met, computed the way `apply_vote_subject` does. */
  meetsRules: boolean;
}

const percent = (part: bigint, whole: bigint) => (whole > 0n ? Number((part * 10000n) / whole) / 100 : 0);

export function voteTally(
  voteState: Pick<VoteState, 'vote_state'>,
  tokenSupply: bigint | undefined,
): DaoVoteTally {
  const yes = voteState.vote_state?.get(true) ?? 0n;
  const no = voteState.vote_state?.get(false) ?? 0n;
  const total = yes + no;
  const supply = tokenSupply ?? 0n;
  const meetsRules = total > 0n
    && supply > 0n
    && (yes * 100n) / total >= BigInt(DAO_VOTE_RULES.passYesPercent)
    && (total * 100n) / supply >= BigInt(DAO_VOTE_RULES.passTurnoutPercent);

  return {
    yes,
    no,
    total,
    yesPercent: percent(yes, total),
    turnoutPercent: percent(total, supply),
    meetsRules,
  };
}

export function voteStatus({
  voteState,
  applied,
  height,
  voteTimeout,
  tokenSupply,
}: {
  voteState: Pick<VoteState, 'vote_state' | 'close_height'>;
  applied: boolean;
  height: number;
  voteTimeout: number;
  tokenSupply: bigint | undefined;
}): DaoVoteStatus {
  if (applied) return 'applied';
  const close = Number(voteState.close_height);
  if (height < close) return 'open';
  if (!voteTally(voteState, tokenSupply).meetsRules) return 'failed';
  // `apply_vote_subject` requires `close_height + vote_timeout >= Chain.block_height`.
  if (height > close + voteTimeout) return 'expired';
  return 'passed';
}

export const isVoteClosed = (status: DaoVoteStatus) => status !== 'open';

export interface VoterPosition {
  amount: bigint;
  agreed: boolean;
  withdrawn: boolean;
}

export function voterPosition(
  voteState: Pick<VoteState, 'vote_accounts'> | undefined,
  account: string | undefined,
): VoterPosition | undefined {
  const entry = account ? voteState?.vote_accounts?.get(account as any) : undefined;
  if (!entry) return undefined;
  return { amount: entry[0], agreed: entry[1], withdrawn: entry[2] };
}

export interface VoterActions {
  canVote: boolean;
  canRevoke: boolean;
  canWithdraw: boolean;
  canApply: boolean;
}

/** What the contracts allow this account to do now (`DAOVote.aes` vote/revoke/withdraw, `DAO.aes` apply). */
export function voterActions(
  status: DaoVoteStatus,
  position: VoterPosition | undefined,
  hasAccount: boolean,
): VoterActions {
  const open = status === 'open';
  return {
    canVote: hasAccount && open && !position,
    canRevoke: hasAccount && open && !!position,
    canWithdraw: hasAccount && !open && !!position && !position.withdrawn,
    // Anyone can apply a passed vote, not only voters.
    canApply: hasAccount && status === 'passed',
  };
}

/** Base units (18 decimals for AE and every bonding-curve token) to a short display number. */
export function formatUnits(value: bigint | string | number | undefined, decimals = 18, locale?: string) {
  const n = new BigNumber((value ?? 0).toString()).shiftedBy(-decimals);
  return n.toNumber().toLocaleString(locale, { maximumFractionDigits: n.abs().lt(1) ? 4 : 2 });
}

export function formatPercent(value: number, locale?: string) {
  return value.toLocaleString(locale, { maximumFractionDigits: value > 0 && value < 10 ? 1 : 0 });
}

/** Milliseconds between two heights, using the nominal key block time. */
export const blocksToMs = (blocks: number) => blocks * KEY_BLOCK_MINUTES * 60 * 1000;

/** "14 days" / "40 hours" for a number of blocks, pluralised by the browser for the reader's language. */
export function formatBlockDuration(blocks: number, locale?: string) {
  const hours = Math.round((blocks * KEY_BLOCK_MINUTES) / 60);
  const [value, unit] = hours >= 48 ? [Math.round(hours / 24), 'day'] : [Math.max(1, hours), 'hour'];
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);
}

/** "in 12 days" / "3 hours ago" for a block distance, in the reader's language. */
export function relativeBlocks(blocks: number, locale?: string) {
  const minutes = blocks * KEY_BLOCK_MINUTES;
  const abs = Math.abs(minutes);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs >= 60 * 24) return format.format(Math.round(minutes / (60 * 24)), 'day');
  if (abs >= 60) return format.format(Math.round(minutes / 60), 'hour');
  return format.format(Math.max(1, Math.round(abs)) * Math.sign(minutes || 1), 'minute');
}

export type SubjectKind = 'payout' | 'payoutAll' | 'changeDao' | 'changeMetaInfo'
  | 'minimumTokens' | 'addModerator' | 'removeModerator' | 'unknown';

export interface SubjectSummary {
  kind: SubjectKind;
  /** Account the vote is about (recipient, moderator, new DAO), if any. */
  account?: string;
  /** Payout amount in aettos for `VotePayoutAmount`. */
  amountAettos?: bigint;
  /** New minimum token balance (base units) for `ChangeMinimumTokenThreshold`. */
  tokenAmount?: bigint;
}

export function summarizeSubject(subject: VoteSubject | undefined): SubjectSummary {
  const [type, args] = (Object.entries(subject ?? {})[0] ?? []) as [string | undefined, any[] | undefined];
  const values = Array.isArray(args) ? args : [];
  switch (type) {
    case VOTE_TYPE.VotePayoutAmount:
      return { kind: 'payout', account: values[0], amountAettos: BigInt(values[1] ?? 0) };
    case VOTE_TYPE.VotePayout:
      return { kind: 'payoutAll', account: values[0] };
    case VOTE_TYPE.ChangeDAO:
      return { kind: 'changeDao', account: values[0] };
    case VOTE_TYPE.ChangeMetaInfo:
      return { kind: 'changeMetaInfo' };
    case VOTE_TYPE.ChangeMinimumTokenThreshold:
      return { kind: 'minimumTokens', tokenAmount: BigInt(values[0] ?? 0) };
    case VOTE_TYPE.AddModerator:
      return { kind: 'addModerator', account: values[0] };
    case VOTE_TYPE.DeleteModerator:
      return { kind: 'removeModerator', account: values[0] };
    default:
      return { kind: 'unknown' };
  }
}
