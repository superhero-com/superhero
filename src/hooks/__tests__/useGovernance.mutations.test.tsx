import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useGovernance } from '../useGovernance';

const mocks = vi.hoisted(() => ({
  account: 'ak_first',
  vote: vi.fn(),
  event: vi.fn(),
  overview: vi.fn(),
}));
vi.mock('../useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: mocks.account, sdk: { getContext: () => ({}) } }),
}));
vi.mock('@aeternity/aepp-sdk', async (original) => ({
  ...await original<object>(),
  Contract: { initialize: async () => ({ vote: mocks.vote }) },
}));
vi.mock('@/api/governance', () => ({
  GovernanceApi: { submitContractEvent: mocks.event, getPollOverview: mocks.overview },
}));
vi.mock('@/lib/journey', () => ({ track: vi.fn() }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  mocks.account = 'ak_first';
  mocks.vote.mockReset().mockResolvedValue({ decodedResult: undefined });
  mocks.event.mockReset().mockResolvedValue(undefined);
  mocks.overview.mockReset().mockResolvedValue({
    pollState: { vote_options: {}, votes: { ak_first: 2, ak_second: 7 } },
    stakesForOption: [],
    voteCount: 2,
  });
});

describe('governance transaction completion', () => {
  it('completes after successful mining even while the indexer is unavailable', async () => {
    const { client, wrapper } = setup();
    const key = ['governance', 'pollResults', 'ct_poll', 'ak_first'];
    client.setQueryData(key, { myVote: undefined, totalVotes: 10 });
    mocks.event.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useGovernance().useSubmitVote(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ pollAddress: 'ct_poll', option: 7 }); });
    expect(mocks.vote).toHaveBeenCalledWith(7, { waitMined: true, confirm: false });
    expect(client.getQueryData(key)).toEqual({ myVote: 7, totalVotes: 10 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('does not report success or change the ballot on a mined revert', async () => {
    const { client, wrapper } = setup();
    const key = ['governance', 'pollResults', 'ct_poll', 'ak_first'];
    client.setQueryData(key, { myVote: 2 });
    mocks.vote.mockRejectedValue(new Error('Contract reverted'));
    const { result } = renderHook(() => useGovernance().useSubmitVote(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ pollAddress: 'ct_poll', option: 7 })).rejects.toThrow('Contract reverted');
    });
    expect(client.getQueryData(key)).toEqual({ myVote: 2 });
    expect(mocks.event).not.toHaveBeenCalled();
  });

  it('updates the signing account when the wallet changes during mining', async () => {
    const { client, wrapper } = setup();
    let mined!: () => void;
    mocks.vote.mockImplementation(() => new Promise<void>((resolve) => { mined = resolve; }));
    mocks.event.mockImplementation(() => new Promise(() => {}));
    const firstKey = ['governance', 'pollResults', 'ct_poll', 'ak_first'];
    const secondKey = ['governance', 'pollResults', 'ct_poll', 'ak_second'];
    client.setQueryData(firstKey, { myVote: 2 });
    client.setQueryData(secondKey, { myVote: undefined });
    const { result, rerender } = renderHook(() => useGovernance().useSubmitVote(), { wrapper });
    act(() => result.current.mutate({ pollAddress: 'ct_poll', option: 7 }));
    await waitFor(() => expect(mocks.vote).toHaveBeenCalled());
    mocks.account = 'ak_second';
    rerender();
    await act(async () => { mined(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(firstKey)).toEqual({ myVote: 7 });
    expect(client.getQueryData(secondKey)).toEqual({ myVote: undefined });
  });

  it('keeps wallet-specific vote results separate after an account switch', async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useGovernance().usePollResults('ct_poll'), { wrapper });
    await waitFor(() => expect(result.current.data?.myVote).toBe(2));
    mocks.account = 'ak_second';
    rerender();
    await waitFor(() => expect(result.current.data?.myVote).toBe(7));
    expect(mocks.overview).toHaveBeenCalledTimes(2);
  });
});
