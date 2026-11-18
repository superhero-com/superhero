import { describe, expect, it } from 'vitest';
import { VOTE_TYPE } from 'bctsl-sdk';
import {
  DAO_VOTE_RULES, encodeEventDescription, formatPercent, parseEventDescription, summarizeSubject,
  voterActions, voteStatus, voteTally,
} from '../voteRules';
import { draftToMetadata, validateDraft } from '../../components/VoteCreateForm';

const E18 = 10n ** 18n;
const AK = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';
const CT = 'ct_4yo5ZzPDUKCsoucyTX2GfktgoyjxM9cjFUWqkiQsUJrWLdLS7';

const state = (yes: bigint, no: bigint, close = 100) => ({
  vote_state: new Map([[true, yes], [false, no]]),
  close_height: BigInt(close),
});

describe('voteRules', () => {
  it('uses the thresholds the DAO contract checks in apply_vote_subject', () => {
    expect(DAO_VOTE_RULES.passYesPercent).toBe(55);
    expect(DAO_VOTE_RULES.passTurnoutPercent).toBe(10);
    expect(DAO_VOTE_RULES.durationBlocks).toBe(6720);
    expect(DAO_VOTE_RULES.createFeeAettos).toBe(555n * E18);
  });

  it('computes yes share over voted stake and turnout over supply', () => {
    const tally = voteTally(state(68n * E18, 32n * E18), 1000n * E18);
    expect(tally.yesPercent).toBe(68);
    expect(tally.turnoutPercent).toBe(10);
    expect(tally.meetsRules).toBe(true);
  });

  it('fails a vote below 55% yes or below 10% turnout, with integer maths like the contract', () => {
    // 54.9% yes -> 54 in integer division
    expect(voteTally(state(549n, 451n), 5000n).meetsRules).toBe(false);
    // 9.99% turnout
    expect(voteTally(state(999n, 0n), 10000n).meetsRules).toBe(false);
    expect(voteTally(state(1000n, 0n), 10000n).meetsRules).toBe(true);
    expect(voteTally(state(0n, 0n), 10000n).meetsRules).toBe(false);
  });

  it('shows a share just under a pass mark below it, never as the mark itself', () => {
    expect(formatPercent(voteTally(state(546n, 454n), 1000n).yesPercent, 'en')).toBe('54');
    expect(formatPercent(54.99, 'en')).toBe('54');
    expect(formatPercent(9.99, 'en')).toBe('9.9');
    expect(formatPercent(55, 'en')).toBe('55');
    expect(formatPercent(4, 'en')).toBe('4');
    expect(formatPercent(0, 'en')).toBe('0');
  });

  it('maps height, apply window and result to a status', () => {
    const passing = state(80n, 20n, 100);
    const args = { applied: false, voteTimeout: 960, tokenSupply: 500n };
    expect(voteStatus({ ...args, voteState: passing, height: 99 })).toBe('open');
    expect(voteStatus({ ...args, voteState: passing, height: 100 })).toBe('passed');
    expect(voteStatus({ ...args, voteState: passing, height: 1060 })).toBe('passed');
    expect(voteStatus({ ...args, voteState: passing, height: 1061 })).toBe('expired');
    expect(voteStatus({ ...args, voteState: state(40n, 60n), height: 200 })).toBe('failed');
    expect(voteStatus({
      ...args, applied: true, voteState: passing, height: 5000,
    })).toBe('applied');
  });

  it('allows only what the contracts allow', () => {
    const pos = { amount: 5n, agreed: true, withdrawn: false };
    expect(voterActions('open', undefined, true)).toMatchObject({
      canVote: true, canRevoke: false,
    });
    expect(voterActions('open', pos, true)).toMatchObject({
      canVote: false, canRevoke: true, canWithdraw: false,
    });
    expect(voterActions('failed', pos, true)).toMatchObject({
      canWithdraw: true, canApply: false,
    });
    expect(voterActions('passed', undefined, true).canApply).toBe(true);
    expect(voterActions('passed', { ...pos, withdrawn: true }, true).canWithdraw).toBe(false);
    expect(voterActions('open', undefined, false).canVote).toBe(false);
  });

  it('summarises every subject type in plain terms', () => {
    expect(summarizeSubject({ [VOTE_TYPE.VotePayoutAmount]: [AK, 15n * E18] } as any))
      .toEqual({ kind: 'payout', account: AK, amountAettos: 15n * E18 });
    expect(summarizeSubject({ [VOTE_TYPE.VotePayout]: [AK] } as any).kind).toBe('payoutAll');
    expect(summarizeSubject({ [VOTE_TYPE.DeleteModerator]: [AK] } as any).kind).toBe('removeModerator');
    expect(summarizeSubject({ [VOTE_TYPE.ChangeMinimumTokenThreshold]: [E18] } as any).tokenAmount).toBe(E18);
    expect(summarizeSubject(undefined).kind).toBe('unknown');
  });
});

describe('create vote draft', () => {
  const base = {
    kind: 'payout' as const,
    account: AK,
    amount: '12.5',
    description: 'Fund the meetup',
    link: '',
    eventName: '',
    eventCity: '',
    eventDate: '',
  };
  const event = {
    ...base, kind: 'event' as const, eventName: 'Superhero Meetup', eventCity: 'Sofia', eventDate: '2099-03-14',
  };

  it('sends an event as a payout with the event line first in the description', () => {
    const md = draftToMetadata({ ...event, eventName: ' Superhero Meetup ', description: ' Venue and snacks ' });
    expect(md.subject).toEqual({ VotePayoutAmount: [AK, 12_500_000_000_000_000_000n] });
    expect(md.description).toBe('Event: Superhero Meetup | Sofia | 2099-03-14\nVenue and snacks');
    expect(md.description.length).toBeLessThanOrEqual(DAO_VOTE_RULES.descriptionMaxLength);
    expect(parseEventDescription(md.description)).toEqual({
      event: { name: 'Superhero Meetup', city: 'Sofia', date: '2099-03-14' },
      text: 'Venue and snacks',
    });
  });

  it('validates the event fields and keeps the whole description inside the contract limit', () => {
    expect(validateDraft(event)).toEqual({});
    expect(validateDraft({ ...event, eventName: ' ' }).eventName).toBe('voting.create.errors.eventNameRequired');
    expect(validateDraft({ ...event, eventName: 'A | B' }).eventName).toBe('voting.create.errors.eventNameInvalid');
    expect(validateDraft({ ...event, eventCity: '' }).eventCity).toBe('voting.create.errors.eventCityRequired');
    expect(validateDraft({ ...event, eventDate: '' }).eventDate).toBe('voting.create.errors.eventDateRequired');
    expect(validateDraft({ ...event, eventDate: '2000-01-01' }).eventDate).toBe('voting.create.errors.eventDatePast');
    expect(validateDraft({ ...event, amount: '20' }, 10n * E18).amount).toBe('voting.create.errors.amountOverTreasury');
    const line = 'Event: Superhero Meetup | Sofia | 2099-03-14\n'.length;
    const room = DAO_VOTE_RULES.descriptionMaxLength - line;
    expect(validateDraft({ ...event, description: 'x'.repeat(room) })).toEqual({});
    expect(validateDraft({ ...event, description: 'x'.repeat(room + 1) }).description)
      .toBe('voting.create.errors.descriptionTooLong');
  });

  it('reads only well-formed event lines, so plain payouts stay plain', () => {
    expect(parseEventDescription('Fund the meetup')).toEqual({ text: 'Fund the meetup' });
    expect(parseEventDescription(undefined)).toEqual({ text: '' });
    expect(parseEventDescription('Event: Meetup | Sofia | soon\nWhy')).toEqual({ text: 'Event: Meetup | Sofia | soon\nWhy' });
    expect(parseEventDescription(encodeEventDescription({ name: 'Hack', city: 'Dubai', date: '2099-01-02' }, '')))
      .toEqual({ event: { name: 'Hack', city: 'Dubai', date: '2099-01-02' }, text: '' });
  });

  it('builds the VotePayoutAmount subject with the amount in aettos', () => {
    expect(draftToMetadata(base)).toEqual({
      subject: { VotePayoutAmount: [AK, 12_500_000_000_000_000_000n] },
      description: 'Fund the meetup',
      link: '',
    });
  });

  it('sends ChangeDAO with the address form of the contract key', () => {
    const md = draftToMetadata({ ...base, kind: 'changeDao', account: CT });
    expect(md.subject).toEqual({ ChangeDAO: ['ak_4yo5ZzPDUKCsoucyTX2GfktgoyjxM9cjFUWqkiQsUJrWLdLS7'] });
    expect(validateDraft({ ...base, kind: 'changeDao', account: CT })).toEqual({});
  });

  it('validates per type', () => {
    expect(validateDraft(base)).toEqual({});
    expect(validateDraft({ ...base, account: CT }).account)
      .toBe('voting.create.errors.accountInvalid');
    expect(validateDraft({ ...base, amount: '0' }).amount).toBe('voting.create.errors.amountInvalid');
    expect(validateDraft({ ...base, amount: '20' }, 10n * E18).amount).toBe('voting.create.errors.amountOverTreasury');
    expect(validateDraft({ ...base, description: 'x'.repeat(301) }).description)
      .toBe('voting.create.errors.descriptionTooLong');
    // eslint-disable-next-line no-script-url -- the scheme a link must not get through with
    expect(validateDraft({ ...base, link: 'javascript:alert(1)' }).link)
      .toBe('voting.create.errors.linkInvalid');
    expect(validateDraft({
      ...base, kind: 'minimumTokens', account: '', amount: '100',
    })).toEqual({});
  });
});
