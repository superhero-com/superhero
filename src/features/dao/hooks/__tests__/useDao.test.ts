import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useDao } from '../useDao';

const mocks = vi.hoisted(() => ({ sdk: {} as object, account: 'ak_wallet' as string | undefined, init: vi.fn() }));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: mocks.sdk }) }));
vi.mock('jotai', async (importOriginal) => ({
  ...await importOriginal<typeof import('jotai')>(),
  useAtom: () => [mocks.account],
}));
vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...await importOriginal<typeof import('bctsl-sdk')>(),
  initFallBack: (...args: any[]) => mocks.init(...args),
}));

function makeDao(address: string) {
  const state = { address, votes: new Map(), vote_timeout: 20n };
  const token = {
    total_supply: async () => ({ decodedResult: 1000n }),
    meta_info: async () => ({ decodedResult: { symbol: address, decimals: 18n } }),
    balance: async () => ({ decodedResult: 10n }),
  };
  const dao = {
    state: async () => state,
    balanceAettos: async () => '1000000000000000000',
    addVote: vi.fn().mockRejectedValue(new Error('User rejected')),
  };
  const factory = {
    tokenContractInstance: async () => token,
    checkAndGetDAO: async () => dao,
  };
  return {
    factory, dao, token, state,
  };
}

describe('useDao contract isolation', () => {
  beforeEach(() => {
    mocks.sdk = {};
    mocks.account = 'ak_wallet';
  });

  it('clears the previous DAO while a new route loads and ignores late initialization', async () => {
    const first = makeDao('first');
    const second = makeDao('second');
    let finishFirst!: (value: any) => void;
    mocks.init.mockReturnValueOnce(new Promise((resolve) => { finishFirst = resolve; }));
    mocks.init.mockResolvedValueOnce(second.factory);
    const { result, rerender } = renderHook((props) => useDao(props), {
      initialProps: { tokenSaleAddress: 'ct_first' as any },
    });
    rerender({ tokenSaleAddress: 'ct_second' });
    await waitFor(() => expect(result.current.dao).toBe(second.dao));
    await act(async () => { finishFirst(first.factory); });
    expect(result.current.dao).toBe(second.dao);
    expect(result.current.tokenInstanceRef).toBe(second.token);
    expect(result.current.state).toBe(second.state);
  });

  it('reinitializes contracts when switching SDK and exposes no old contract while loading', async () => {
    const first = makeDao('first');
    const second = makeDao('second');
    mocks.init.mockResolvedValueOnce(first.factory);
    let finishSecond!: (value: any) => void;
    mocks.init.mockReturnValueOnce(new Promise((resolve) => { finishSecond = resolve; }));
    const { result, rerender } = renderHook(() => useDao({ tokenSaleAddress: 'ct_sale' as any }));
    await waitFor(() => expect(result.current.dao).toBe(first.dao));
    mocks.sdk = { network: 'new-network' };
    rerender();
    expect(result.current.dao).toBeUndefined();
    expect(result.current.state).toBeUndefined();
    expect(result.current.userTokenBalance).toBeUndefined();
    await act(async () => { finishSecond(second.factory); });
    await waitFor(() => expect(result.current.dao).toBe(second.dao));
    expect(mocks.init).toHaveBeenLastCalledWith(mocks.sdk, 'ct_sale');
  });

  it('returns proposal submission failures to the create form', async () => {
    const instance = makeDao('first');
    mocks.init.mockResolvedValue(instance.factory);
    const { result } = renderHook(() => useDao({ tokenSaleAddress: 'ct_sale' as any }));
    await waitFor(() => expect(result.current.dao).toBe(instance.dao));
    await expect(result.current.addVote({} as any)).rejects.toThrow('User rejected');
  });

  it('does not let an old init callback initialize a newly selected route', async () => {
    const first = makeDao('first');
    const second = makeDao('second');
    mocks.init.mockResolvedValueOnce(first.factory);
    let finishSecond!: (value: any) => void;
    mocks.init.mockReturnValueOnce(new Promise((resolve) => { finishSecond = resolve; }));
    const { result, rerender } = renderHook((props) => useDao(props), {
      initialProps: { tokenSaleAddress: 'ct_first' as any },
    });
    await waitFor(() => expect(result.current.dao).toBe(first.dao));
    const oldInit = result.current.init;
    const oldAddVote = result.current.addVote;
    rerender({ tokenSaleAddress: 'ct_second' });
    await act(async () => { await oldInit(); });
    await expect(oldAddVote({} as any)).rejects.toThrow('DAO is not available');
    expect(mocks.init).toHaveBeenCalledTimes(2);
    expect(result.current.dao).toBeUndefined();
    await act(async () => { finishSecond(second.factory); });
    await waitFor(() => expect(result.current.dao).toBe(second.dao));
  });
});
