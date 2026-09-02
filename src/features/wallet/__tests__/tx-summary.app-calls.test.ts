// @vitest-environment node
//
// The unit suite next door proves the shape rules against forged ACIs; this one
// proves they still match production calldata, encoded with the same shipped ACI
// the app uses. Without it a dependency can bump a signature and put a whole
// screen back on the caution path with nothing failing.
import { describe, expect, it } from 'vitest';
import { Tag, buildTx, buildContractId } from '@aeternity/aepp-sdk';
import { Encoder } from '@aeternity/aepp-calldata';
import TIPPING from 'tipping-contract/generated/Tipping_v3.aci.json';
import SALE from 'bctsl-contracts/generated/AffiliationBondingCurveTokenSale.aci.json';
import FACTORY from 'bctsl-contracts/generated/CommunityFactory.aci.json';
import TREASURY from 'bctsl-contracts/generated/AffiliationTreasury.aci.json';
import DAO_VOTE from 'bctsl-contracts/generated/DAOVote.aci.json';
import ROUTER from 'dex-contracts-v2/deployment/aci/AedexV2Router.aci.json';
import WAE from 'dex-contracts-v2/deployment/aci/WAE.aci.json';
import AEX9 from 'dex-contracts-v2/deployment/aci/FungibleTokenFull.aci.json';
import REGISTRY from '../../../api/GovernanceRegistryACI.json';
import POLL from '../../../api/GovernancePollACI.json';
import { summarizeTransaction } from '../tx-summary';

const ME = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const THEM = 'ak_11111111111111111111111111111111273Yts';
const TOKEN = 'ct_11111111111111111111111111111111273Yts';
const CALLEE = buildContractId(ME, 1);
const ONE = 10n ** 18n;

const call = (
  aci: unknown,
  contract: string,
  fn: string,
  args: unknown[],
  amount = 0,
): string => buildTx({
  tag: Tag.ContractCallTx,
  callerId: ME,
  contractId: CALLEE,
  amount,
  gasLimit: 5000,
  nonce: 3,
  callData: new Encoder(aci as never).encode(contract, fn, args as never),
});

/** [what the user did, tx, expected title] */
const APP_CALLS: [string, string, string][] = [
  ['post', call(TIPPING, 'Tipping', 'post_without_tip', ['gm #superhero', []]), 'Publish a post'],
  ['comment', call(TIPPING, 'Tipping', 'post_without_tip', ['nice', ['comment:1_v3']]), 'Publish a post'],

  ['buy a token', call(SALE, 'AffiliationBondingCurveTokenSale', 'buy', [ONE], 42), 'Buy tokens'],
  ['sell a token', call(SALE, 'AffiliationBondingCurveTokenSale', 'sell', [ONE, ONE]), 'Sell tokens'],
  ['create a token', call(FACTORY, 'CommunityFactory', 'create_community', [
    'collection', 'MYTOKEN', ONE, false, new Map([['description', 'hi']]),
  ], 10), 'Create a token'],

  ['approve a token spend', call(AEX9, 'FungibleTokenFull', 'create_allowance', [THEM, ONE]), 'Approve token spending'],
  ['change an approval', call(AEX9, 'FungibleTokenFull', 'change_allowance', [THEM, ONE]), 'Change token spending approval'],
  ['send tokens', call(AEX9, 'FungibleTokenFull', 'transfer', [THEM, ONE]), 'Send tokens'],

  ['add liquidity', call(ROUTER, 'AedexV2Router', 'add_liquidity', [
    TOKEN, TOKEN, ONE, ONE, 1n, 2n, ME, undefined, 999n,
  ]), 'Add liquidity'],
  ['add AE liquidity', call(ROUTER, 'AedexV2Router', 'add_liquidity_ae', [
    TOKEN, ONE, 1n, 2n, ME, 5n, 999n,
  ], 7), 'Add liquidity'],
  ['remove liquidity', call(ROUTER, 'AedexV2Router', 'remove_liquidity', [
    TOKEN, TOKEN, ONE, 1n, 2n, ME, 999n,
  ]), 'Remove liquidity'],
  ['remove AE liquidity', call(ROUTER, 'AedexV2Router', 'remove_liquidity_ae', [
    TOKEN, ONE, 1n, 2n, ME, 999n,
  ]), 'Remove liquidity'],
  ['swap tokens', call(ROUTER, 'AedexV2Router', 'swap_exact_tokens_for_tokens', [
    ONE, 1n, [TOKEN, TOKEN], ME, 999n, undefined,
  ]), 'Swap tokens'],

  ['wrap AE', call(WAE, 'WAE', 'deposit', [], 3), 'Wrap AE'],
  ['unwrap AE', call(WAE, 'WAE', 'withdraw', [ONE]), 'Unwrap AE'],

  ['register a poll', call(REGISTRY, 'Registry', 'add_poll', [TOKEN, true]), 'Register a poll'],
  ['delegate a vote', call(REGISTRY, 'Registry', 'delegate', [THEM]), 'Delegate your vote'],
  ['revoke a delegation', call(REGISTRY, 'Registry', 'revoke_delegation', []), 'Revoke your delegation'],
  ['vote on a poll', call(POLL, 'Poll', 'vote', [1n]), 'Vote'],
  ['revoke a poll vote', call(POLL, 'Poll', 'revoke_vote', []), 'Revoke your vote'],

  ['vote in a DAO', call(DAO_VOTE, 'DAOVote', 'vote', [true, ONE]), 'Vote'],
  ['revoke a DAO vote', call(DAO_VOTE, 'DAOVote', 'revoke_vote', []), 'Revoke your vote'],
  ['withdraw from a DAO vote', call(DAO_VOTE, 'DAOVote', 'withdraw', []), 'Withdraw your balance'],

  ['create invitations', call(TREASURY, 'AffiliationTreasury', 'register_invitation_code', [
    [THEM, ME], ONE / 100n, ONE,
  ], 2), 'Create invitation links'],
  ['revoke an invitation', call(TREASURY, 'AffiliationTreasury', 'revoke_invitation_code', [THEM]), 'Revoke an invitation'],
  ['redeem an invitation', call(TREASURY, 'AffiliationTreasury', 'redeem_invitation_code', [THEM]), 'Redeem an invitation'],
  ['withdraw from the treasury', call(TREASURY, 'AffiliationTreasury', 'withdraw', []), 'Withdraw your balance'],
];

describe('summarizeTransaction — every app call is named, none cautioned', () => {
  it.each(APP_CALLS)('names the transaction for: %s', (_what, tx, title) => {
    const summary = summarizeTransaction(tx);
    expect(summary).not.toBeNull();
    expect(summary!.title).toBe(title);
    expect(summary!.effect).toBeTruthy();
    expect(summary!.caution).toBeUndefined();
  });

  it('renders the two numbers a DAO vote actually commits', () => {
    const summary = summarizeTransaction(call(DAO_VOTE, 'DAOVote', 'vote', [false, 5n * ONE]));
    const rows = Object.fromEntries(summary!.rows.map((r) => [r.label, r.value]));
    expect(rows.Vote).toBe('against');
    expect(rows['Tokens locked']).toBe('5000000000000000000 (raw token units)');
  });

  it('reads a create_community meta_info map instead of printing an empty object', () => {
    const summary = summarizeTransaction(call(FACTORY, 'CommunityFactory', 'create_community', [
      'word', 'TOKEN', ONE, true, new Map([['description', 'a token'], ['url', 'https://x']]),
    ]));
    const rows = Object.fromEntries(summary!.rows.map((r) => [r.label, r.value]));
    // FATE serialises map entries in its own canonical key order, not insertion order.
    expect(rows.Details.split(', ').sort()).toEqual(['description: a token', 'url: https://x']);
    expect(rows.Visibility).toBe('private');
  });

  it('shows an absent option as absent, not as an empty object', () => {
    const summary = summarizeTransaction(call(ROUTER, 'AedexV2Router', 'add_liquidity_ae', [
      TOKEN, ONE, 1n, 2n, ME, undefined, 999n,
    ]));
    const rows = Object.fromEntries(summary!.rows.map((r) => [r.label, r.value]));
    expect(rows['Least pool shares accepted']).toBe('none');
  });
});
