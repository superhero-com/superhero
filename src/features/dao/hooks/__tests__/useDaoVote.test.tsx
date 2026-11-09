import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useDaoVote } from '../useDaoVote';

const AK = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';
const VOTE = 'ct_vote' as any;
// One instance, as the app's context gives: a new SDK means a wallet switch and a reload.
const SDK = {};

let account: string | undefined;
let dao: Record<string, any>;
let voteFails: boolean;
let revokeError: Error | undefined;
let voteReads: number;
let daoInits: number;
let invalidated: unknown[];

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
  dao = {
    state: daoState(false),
    tokenSupply: 1000n,
    loaded: true,
    init: async () => { daoInits += 1; },
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
