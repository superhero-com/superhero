import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useDaoVote } from '../useDaoVote';
import { daoErrorKey } from '../../utils/daoErrors';

const AK = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';
const VOTE = 'ct_vote' as any;
const TOKEN = { name: 'token contract' };
// One instance, as the app's context gives: a new SDK means a wallet switch and a reload.
const SDK = {};

let account: string | undefined;
let dao: Record<string, any>;
let voteFails: boolean;
let revokeError: Error | undefined;
let voteReads: number;
let daoInits: number;
let invalidated: unknown[];
// Calls that sign: vote, withdraw and apply.
let calls: unknown[][];
// The contract the DAO lists under the vote's id when read at the moment of voting or applying.
let listed: string;

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ sdk: SDK, currentBlockHeight: 150 }),
  useAccount: () => ({ activeAccount: account }),
}));
vi.mock('../useDao', () => ({ useDao: () => dao }));
vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  initDAOVote: async () => {
    if (voteFails) throw new Error('Contract not found');
    return {
      state: async () => {
        voteReads += 1;
        return {
          close_height: 200n,
          vote_state: new Map([[true, 0n], [false, 0n]]),
          vote_accounts: new Map([[AK, [5n, true, false]]]),
        };
      },
      revokeVote: async () => { if (revokeError) throw revokeError; },
      vote: async (...args: unknown[]) => { calls.push(['vote', ...args]); },
      withdraw: async () => { calls.push(['withdraw']); },
    };
  },
}));

const daoState = (applied: boolean) => ({
  vote_timeout: 960n, votes: new Map([[3n, [applied, VOTE]]]),
});

function renderVote() {
  const client = new QueryClient();
  client.invalidateQueries = (async (filters: { queryKey: unknown }) => {
    invalidated.push(filters.queryKey);
  }) as any;
  return renderHook(() => useDaoVote({ tokenSaleAddress: 'ct_sale' as any, voteAddress: VOTE, voteId: 3n }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  account = AK;
  voteFails = false;
  revokeError = undefined;
  voteReads = 0;
  daoInits = 0;
  invalidated = [];
  calls = [];
  listed = VOTE;
  dao = {
    state: daoState(false),
    tokenSupply: 1000n,
    loaded: true,
    init: async () => { daoInits += 1; },
    userTokenBalance: 7n,
    tokenInstanceRef: TOKEN,
    dao: { state: async () => ({ vote_timeout: 960n, votes: new Map([[3n, [false, listed]]]) }) },
    applyVoteSubject: async (id: bigint) => { calls.push(['apply', id]); },
  };
});

describe('useDaoVote', () => {
  it('gives the account its options from the vote and the DAO', async () => {
    const { result } = renderVote();
    await waitFor(() => expect(result.current.status).toBe('open'));

    expect(result.current.position).toEqual({ amount: 5n, agreed: true, withdrawn: false });
    expect(result.current.actions).toMatchObject({ canVote: false, canRevoke: true });
    expect(result.current.daoFailed).toBe(false);
  });

  it('takes the applied flag from the DAO state', async () => {
    dao.state = daoState(true);
    const { result } = renderVote();

    await waitFor(() => expect(result.current.status).toBe('applied'));
  });

  it('ignores the applied flag of another contract listed under the id', async () => {
    dao.state = { vote_timeout: 960n, votes: new Map([[3n, [true, 'ct_real']]]) };
    const { result } = renderVote();

    await waitFor(() => expect(result.current.status).toBe('open'));
  });

  it('keeps a failed wallet request for the page and still refreshes the vote', async () => {
    revokeError = new Error('Operation rejected by user');
    const { result } = renderVote();
    await waitFor(() => expect(result.current.actions?.canRevoke).toBe(true));

    await act(() => result.current.revokeVote());

    expect(result.current.actionError).toBe(revokeError);
    expect(result.current.actionLoading).toBe(false);
    expect(voteReads).toBe(2);
    expect(daoInits).toBe(1);
    expect(invalidated).toEqual([['dao-votes']]);
  });

  it('reports a vote that cannot be loaded instead of loading forever', async () => {
    voteFails = true;
    const { result } = renderVote();

    await waitFor(() => expect(result.current.loadError).toBe(true));
  });

  it('says when the DAO itself could not be loaded', async () => {
    dao = { ...dao, state: undefined };
    const { result } = renderVote();
    await waitFor(() => expect(result.current.voteState).toBeDefined());

    expect(result.current.status).toBeUndefined();
    expect(result.current.daoFailed).toBe(true);
  });
});

describe('useDaoVote acting on the vote in the link', () => {
  const renderLoaded = async () => {
    const rendered = renderVote();
    await waitFor(() => expect(rendered.result.current.vote).toBeDefined());
    return rendered.result;
  };

  it('votes with the whole token balance once the DAO lists the contract under the id', async () => {
    const result = await renderLoaded();

    await act(() => result.current.voteOption(true));

    expect(calls).toEqual([['vote', true, 7n, TOKEN]]);
    expect(result.current.actionError).toBeUndefined();
  });

  it('applies the DAO vote of that id', async () => {
    const result = await renderLoaded();

    await act(() => result.current.applyVote());

    expect(calls).toEqual([['apply', 3n]]);
  });

  it('neither votes nor applies when the DAO lists another contract under the id', async () => {
    listed = 'ct_real';
    const result = await renderLoaded();

    await act(() => result.current.voteOption(true));
    expect(daoErrorKey(result.current.actionError)).toBe('voting.errors.notListed');
    await act(() => result.current.applyVote());

    expect(daoErrorKey(result.current.actionError)).toBe('voting.errors.notListed');
    expect(calls).toEqual([]);
  });

  it('checks the DAO when voting, so a vote newer than the loaded DAO state goes through', async () => {
    dao.state = { vote_timeout: 960n, votes: new Map() };
    const result = await renderLoaded();

    await act(() => result.current.voteOption(false));

    expect(calls).toEqual([['vote', false, 7n, TOKEN]]);
  });

  it('still lets a voter withdraw from a vote the DAO does not list', async () => {
    listed = 'ct_real';
    const result = await renderLoaded();

    await act(() => result.current.withdraw());

    expect(calls).toEqual([['withdraw']]);
  });
});
