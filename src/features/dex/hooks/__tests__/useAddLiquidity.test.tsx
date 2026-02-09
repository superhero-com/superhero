import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { Provider } from 'jotai';
import { vi } from 'vitest';

import { useAddLiquidity } from '../useAddLiquidity';

// Mocks for external hooks used by useAddLiquidity
vi.mock('../../../../hooks', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAeSdk: () => ({ sdk: {} }),
    useAccount: () => ({ activeAccount: 'ak_test_account' }),
    useDex: () => ({ slippagePct: 100, deadlineMins: 10 }),
    useRecentActivities: () => ({ addActivity: vi.fn() }),
  } as typeof actual;
});

// Mock toast provider
vi.mock('../../../../components/ToastProvider', () => ({
  useToast: () => ({ push: vi.fn() }),
}));

// Router and factory doubles (hoisted so vi.mock factories can reference them safely)
const { mockRouter, mockFactory } = vi.hoisted(() => ({
  mockRouter: {
    add_liquidity: vi.fn().mockResolvedValue({ hash: 'th_add_tt' }),
    add_liquidity_ae: vi.fn().mockResolvedValue({ hash: 'th_add_ae' }),
    remove_liquidity: vi.fn().mockResolvedValue({ hash: 'th_rem_tt' }),
    remove_liquidity_ae: vi.fn().mockResolvedValue({ hash: 'th_rem_ae' }),
  },
  mockFactory: {},
}));

// Mock dex helpers used inside the hook
vi.mock('../../../../libs/dex', async () => {
  const real = await vi.importActual<any>('../../../../libs/dex');
  return {
    ...real,
    DEX_ADDRESSES: { ...real.DEX_ADDRESSES, wae: 'ct_WAE' },
    initDexContracts: vi.fn().mockResolvedValue({ router: mockRouter, factory: mockFactory }),
    ensureAllowanceForRouter: vi.fn().mockResolvedValue(undefined),
    ensurePairAllowanceForRouter: vi.fn().mockResolvedValue(undefined),
    getPairInfo: vi.fn().mockImplementation(async (_sdk: any, _factory: any, tokenA: string, tokenB: string) => {
      // For AE pairs we expect (token, WAE), return tiny reserves and huge supply to force 0 expected amounts
      const isAePair = tokenB === 'ct_WAE';
      return {
        pairAddress: 'ct_PAIR',
        totalSupply: BigInt('1000000000000000000000000000000'), // 1e30
        reserveA: BigInt(isAePair ? 1 : 1),
        reserveB: BigInt(isAePair ? 2 : 1),
      };
    }),
  };
});

const HookHost = ({ onReady }: { onReady: (api: ReturnType<typeof useAddLiquidity>) => void }) => {
  const api = useAddLiquidity();
  useEffect(() => { onReady(api); }, [api, onReady]);
  return <div data-testid="host" />;
};

describe('useAddLiquidity add/remove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds AE pair and clamps min amounts to at least 1', async () => {
    let api!: ReturnType<typeof useAddLiquidity>;
    render(<Provider><HookHost onReady={(a) => { api = a; }} /></Provider>);

    await act(async () => {
      await api.executeAddLiquidity({
        tokenA: 'AE',
        tokenB: 'ct_TKN',
        amountA: '0.000000000000000001', // -> 1 aettos
        amountB: '0.000000000000000001', // -> 1 aettos
        slippagePct: 1,
        deadlineMins: 10,
        isAePair: true,
      }, { suppressToast: true });
    });

    expect(mockRouter.add_liquidity_ae).toHaveBeenCalledTimes(1);
    const args = (mockRouter.add_liquidity_ae as any).mock.calls[0];
    // args: token, amountTokenDesired, minToken, minAe, to, minLiquidity, deadline, { amount }
    expect(args[2]).toBe(1n);
    expect(args[3]).toBe(1n);
  });

  it('removes AE pair and clamps min amounts to at least 1 with correct reserves mapping', async () => {
    let api!: ReturnType<typeof useAddLiquidity>;
    render(<Provider><HookHost onReady={(a) => { api = a; }} /></Provider>);

    await act(async () => {
      await api.executeRemoveLiquidity({
        tokenA: 'AE',
        tokenB: 'ct_TKN',
        liquidity: '1', // -> 1e18 aettos
        slippagePct: 1,
        deadlineMins: 10,
        isAePair: true,
      });
    });

    expect(mockRouter.remove_liquidity_ae).toHaveBeenCalledTimes(1);
    const args = (mockRouter.remove_liquidity_ae as any).mock.calls[0];
    // args: token, liquidity, minToken, minAe, to, deadline
    expect(args[2]).toBe(1n);
    expect(args[3]).toBe(1n);
  });

  it('adds token-token pair and clamps min amounts to at least 1', async () => {
    let api!: ReturnType<typeof useAddLiquidity>;
    render(<Provider><HookHost onReady={(a) => { api = a; }} /></Provider>);

    await act(async () => {
      await api.executeAddLiquidity({
        tokenA: 'ct_TKNA',
        tokenB: 'ct_TKNB',
        amountA: '0.000000000000000001',
        amountB: '0.000000000000000001',
        slippagePct: 1,
        deadlineMins: 10,
        isAePair: false,
      }, { suppressToast: true });
    });

    expect(mockRouter.add_liquidity).toHaveBeenCalledTimes(1);
    const args = (mockRouter.add_liquidity as any).mock.calls[0];
    // args: tokenA, tokenB, amountA, amountB, minA, minB, to, minL, deadline
    expect(args[4]).toBe(1n);
    expect(args[5]).toBe(1n);
  });

  it('removes token-token pair and clamps min amounts to at least 1', async () => {
    let api!: ReturnType<typeof useAddLiquidity>;
    render(<Provider><HookHost onReady={(a) => { api = a; }} /></Provider>);

    await act(async () => {
      await api.executeRemoveLiquidity({
        tokenA: 'ct_TKNA',
        tokenB: 'ct_TKNB',
        liquidity: '1', // -> 1e18 aettos
        slippagePct: 1,
        deadlineMins: 10,
        isAePair: false,
      });
    });

    expect(mockRouter.remove_liquidity).toHaveBeenCalledTimes(1);
    const args = (mockRouter.remove_liquidity as any).mock.calls[0];
    expect(args[3]).toBe(1n);
    expect(args[4]).toBe(1n);
  });
});
