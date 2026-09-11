import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { VOTE_STATE_LABEL } from 'bctsl-sdk';
import { useDaoVote } from '../useDaoVote';

const mocks = vi.hoisted(() => ({
  sdk: {},
  account: 'ak_wallet',
  initVote: vi.fn(),
  apply: vi.fn(),
  refreshDao: vi.fn(),
  state: { votes: new Map([[1n, [false, 'ct_vote']], [2n, [false, 'ct_second']]]), vote_timeout: 20n },
  tokenContract: {},
}));
vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ sdk: mocks.sdk, currentBlockHeight: 100 }),
  useAccount: () => ({ activeAccount: mocks.account }),
}));
vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...await importOriginal<typeof import('bctsl-sdk')>(),
  initDAOVote: (...args: any[]) => mocks.initVote(...args),
}));
vi.mock('../useDao', () => ({
  useDao: () => ({
    state: mocks.state,
    tokenSupply: 1000n,
    userTokenBalance: 10n,
    tokenInstanceRef: mocks.tokenContract,
    dao: { applyVoteSubject: mocks.apply },
    init: mocks.refreshDao,
  }),
}));

const firstProps = { tokenSaleAddress: 'ct_sale', voteAddress: 'ct_vote', voteId: 1n } as any;
const firstState = {
  close_height: 100n,
  vote_state: new Map([[true, 55n], [false, 45n]]),
  vote_accounts: new Map(),
};

function contract(state = firstState) {
  return {
    state: vi.fn().mockResolvedValue(state),
    canVote: () => false,
    canRevokeVote: () => false,
    canWithdraw: () => false,
    canApply: (label: string) => label === VOTE_STATE_LABEL.APPLIABLE,
    revokeVote: vi.fn().mockResolvedValue(undefined),
    withdraw: vi.fn().mockResolvedValue(undefined),
    vote: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useDaoVote actions and route changes', () => {
  beforeEach(() => {
    mocks.account = 'ak_wallet';
    mocks.initVote.mockResolvedValue(contract());
    mocks.apply.mockResolvedValue(undefined);
    mocks.refreshDao.mockResolvedValue(undefined);
  });

  it('applies the selected eligible proposal and suppresses duplicate clicks', async () => {
    let finish!: () => void;
    mocks.apply.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useDaoVote(firstProps));
    await waitFor(() => expect(result.current.canApply).toBe(true));
    expect(result.current.voteYesPercentage).toBe(0.55);
    expect(result.current.voteStakeYesPercentage).toBe(0.055);
    let request!: Promise<void>;
    act(() => {
      request = result.current.applyVote();
      result.current.applyVote();
    });
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(1n);
    expect(result.current.actionLoading).toBe(true);
    await act(async () => { finish(); await request; });
    expect(mocks.refreshDao).toHaveBeenCalledTimes(1);
    expect(result.current.actionLoading).toBe(false);
  });

  it('surfaces wallet rejection, releases loading, and clears error on retry', async () => {
    mocks.apply.mockRejectedValueOnce(new Error('User rejected'));
    const { result } = renderHook(() => useDaoVote(firstProps));
    await waitFor(() => expect(result.current.canApply).toBe(true));
    await act(async () => { await result.current.applyVote(); });
    expect(result.current.actionError).toBeTruthy();
    expect(result.current.actionLoading).toBe(false);
    await act(async () => { await result.current.applyVote(); });
    expect(result.current.actionError).toBeNull();
    expect(result.current.actionLoading).toBe(false);
  });

  it('releases loading even if refresh fails after a successful transaction', async () => {
    mocks.refreshDao.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useDaoVote(firstProps));
    await waitFor(() => expect(result.current.canApply).toBe(true));
    await act(async () => { await result.current.applyVote(); });
    expect(result.current.actionLoading).toBe(false);
    expect(result.current.actionError).toBeTruthy();
  });

  it('clears state on navigation and ignores a late response for the previous proposal', async () => {
    let finishFirst!: (value: any) => void;
    mocks.initVote.mockReturnValueOnce(new Promise((resolve) => { finishFirst = resolve; }));
    const secondState = { ...firstState, close_height: 200n };
    const secondContract = contract(secondState);
    mocks.initVote.mockResolvedValueOnce(secondContract);
    const { result, rerender } = renderHook((props) => useDaoVote(props), {
      initialProps: firstProps,
    });
    rerender({ ...firstProps, voteAddress: 'ct_second', voteId: 2n });
    await waitFor(() => expect(result.current.voteState).toBe(secondState));
    await act(async () => { finishFirst(contract()); });
    expect(result.current.vote).toBe(secondContract);
    expect(result.current.voteStateLabel).toBe(VOTE_STATE_LABEL.OPEN);
  });

  it('does not refresh the old DAO when an action settles after navigation', async () => {
    let finish!: () => void;
    mocks.apply.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook((props) => useDaoVote(props), {
      initialProps: firstProps,
    });
    await waitFor(() => expect(result.current.canApply).toBe(true));
    let request!: Promise<void>;
    act(() => { request = result.current.applyVote(); });
    rerender({ ...firstProps, tokenSaleAddress: 'ct_second_sale', voteAddress: 'ct_second' });
    await act(async () => { finish(); await request; });
    expect(mocks.refreshDao).not.toHaveBeenCalled();
    expect(result.current.actionLoading).toBe(false);
  });

  it('blocks applying a proposal address that does not belong to the route vote ID', async () => {
    const { result } = renderHook(() => useDaoVote({ ...firstProps, voteAddress: 'ct_another' }));
    await waitFor(() => expect(result.current.voteState).toBeDefined());
    expect(result.current.canApply).toBeFalsy();
    expect(result.current.actionError).toContain('does not match');
    await act(async () => { await result.current.applyVote(); });
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('rejects stale action callbacks after changing accounts on the same SDK', async () => {
    const { result, rerender } = renderHook(() => useDaoVote(firstProps));
    await waitFor(() => expect(result.current.canApply).toBe(true));
    const oldApply = result.current.applyVote;
    mocks.account = 'ak_second_wallet';
    rerender();
    await waitFor(() => expect(result.current.canApply).toBe(true));
    await act(async () => { await oldApply(); });
    expect(mocks.apply).not.toHaveBeenCalled();
    await act(async () => { await result.current.applyVote(); });
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(1n);
  });
});
