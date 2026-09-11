import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { checkRouteLiquidity, useSwapQuote } from '../useSwapQuote';

describe('checkRouteLiquidity', () => {
  it('derives max output from reserve ratios for the first path hop', () => {
    const params = {
      isExactIn: true,
      amountIn: '60',
      tokenIn: { address: 'token-a', decimals: 6, is_ae: false },
      tokenOut: { address: 'token-b', decimals: 18, is_ae: false },
    } as any;

    const route = [
      {
        address: 'pair-ab',
        token0: 'token-a',
        token1: 'token-b',
        liquidityInfo: {
          reserve0: '5000000',
          reserve1: '1000000000000000000',
        },
      },
    ];

    expect(checkRouteLiquidity(params, route, ['token-a', 'token-b'])).toEqual({
      maxOut: '1',
      liquidityStatus: {
        exceedsLiquidity: true,
        maxAvailable: '5',
        pairAddress: 'pair-ab',
      },
    });
  });

  it('uses the reverse reserve ratio when the swap direction is reversed', () => {
    const params = {
      isExactIn: true,
      amountIn: '2',
      tokenIn: { address: 'token-b', decimals: 18, is_ae: false },
      tokenOut: { address: 'token-a', decimals: 6, is_ae: false },
    } as any;

    const route = [
      {
        address: 'pair-ab',
        token0: 'token-a',
        token1: 'token-b',
        liquidityInfo: {
          reserve0: '5000000',
          reserve1: '1000000000000000000',
        },
      },
    ];

    expect(checkRouteLiquidity(params, route, ['token-b', 'token-a'])).toEqual({
      maxOut: '5',
      liquidityStatus: {
        exceedsLiquidity: true,
        maxAvailable: '1',
        pairAddress: 'pair-ab',
      },
    });
  });

  it('checks the input reserve from the first path hop instead of raw route order', () => {
    const params = {
      isExactIn: true,
      amountIn: '50',
      tokenIn: { address: 'token-a', decimals: 0, is_ae: false },
      tokenOut: { address: 'token-c', decimals: 0, is_ae: false },
    } as any;

    const route = [
      {
        address: 'pair-bc',
        token0: 'token-b',
        token1: 'token-c',
        liquidityInfo: {
          reserve0: '200',
          reserve1: '1000',
        },
      },
      {
        address: 'pair-ab',
        token0: 'token-a',
        token1: 'token-b',
        liquidityInfo: {
          reserve0: '10',
          reserve1: '200',
        },
      },
    ];

    expect(checkRouteLiquidity(params, route, ['token-a', 'token-b', 'token-c'])).toEqual({
      maxOut: '1000',
      liquidityStatus: {
        exceedsLiquidity: true,
        maxAvailable: '10',
        pairAddress: 'pair-ab',
      },
    });
  });
});

const quoteMocks = vi.hoisted(() => ({
  getAmountsOut: vi.fn(),
  getAmountsIn: vi.fn(),
  sdk: {},
}));

vi.mock('../../../../hooks', () => ({ useAeSdk: () => ({ sdk: quoteMocks.sdk }) }));
vi.mock('../../../../libs/dex', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../libs/dex')>(),
  initDexContracts: async () => ({
    router: { get_amounts_out: quoteMocks.getAmountsOut, get_amounts_in: quoteMocks.getAmountsIn },
  }),
}));
vi.mock('../../../../libs/dexBackend', () => ({
  getSwapRoutes: async () => [[{
    address: 'pair-ab',
    token0: 'token-a',
    token1: 'token-b',
    synchronized: true,
    liquidityInfo: { reserve0: '1000000', reserve1: '2000000' },
  }]],
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const validParams = {
  amountIn: '10',
  amountOut: '',
  isExactIn: true,
  tokenIn: { address: 'token-a', decimals: 0, is_ae: false },
  tokenOut: { address: 'token-b', decimals: 0, is_ae: false },
} as any;

describe('useSwapQuote request lifecycle', () => {
  beforeEach(() => {
    quoteMocks.getAmountsOut.mockResolvedValue({ decodedResult: [10n, 19n] });
  });

  afterEach(() => { vi.useRealTimers(); });

  it.each(['', '0', '-1', 'invalid', 'Infinity'])('invalidates a pending quote when the new amount is %j', async (amountIn) => {
    const pending = deferred<{ decodedResult: bigint[] }>();
    quoteMocks.getAmountsOut.mockReturnValueOnce(pending.promise);
    const callback = vi.fn();
    const { result } = renderHook(() => useSwapQuote());
    let request!: ReturnType<typeof result.current.refreshQuote>;
    await act(async () => { request = result.current.refreshQuote(validParams, callback); });
    expect(result.current.quoteLoading).toBe(true);

    await act(async () => {
      await result.current.refreshQuote({ ...validParams, amountIn }, callback);
    });
    expect(result.current.quoteLoading).toBe(false);
    expect(result.current.routeInfo.path).toEqual([]);
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ amountOut: '', path: [] }));
    callback.mockClear();

    await act(async () => {
      pending.resolve({ decodedResult: [10n, 19n] });
      await request;
    });
    expect(callback).not.toHaveBeenCalled();
    expect(result.current.routeInfo.path).toEqual([]);
  });

  it('invalidates previous requests during the debounce interval and when cancelled', async () => {
    vi.useFakeTimers();
    const pending = deferred<{ decodedResult: bigint[] }>();
    quoteMocks.getAmountsOut.mockReturnValueOnce(pending.promise);
    const callback = vi.fn();
    const { result } = renderHook(() => useSwapQuote());
    let request!: ReturnType<typeof result.current.refreshQuote>;
    await act(async () => { request = result.current.refreshQuote(validParams, callback); });
    act(() => result.current.debouncedQuote({ ...validParams, amountIn: '20' }, callback));
    callback.mockClear();
    await act(async () => {
      pending.resolve({ decodedResult: [10n, 19n] });
      await request;
    });
    expect(callback).not.toHaveBeenCalled();
    expect(result.current.routeInfo.path).toEqual([]);
    expect(result.current.quoteLoading).toBe(true);
    act(() => result.current.cancelDebouncedQuote());
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(quoteMocks.getAmountsOut).toHaveBeenCalledTimes(1);
    expect(result.current.quoteLoading).toBe(false);
  });

  it('clears the previous successful quote when the router rejects instead of presenting a spot ratio as executable', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useSwapQuote());
    await act(async () => { await result.current.refreshQuote(validParams, callback); });
    expect(result.current.routeInfo.routerAmountOut).toBe('19');
    quoteMocks.getAmountsOut.mockRejectedValueOnce(new Error('Router unavailable'));
    await act(async () => { await result.current.refreshQuote({ ...validParams, amountIn: '20' }, callback); });
    expect(result.current.error).toBeTruthy();
    expect(result.current.routeInfo).toEqual({ path: [] });
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ amountOut: '', path: [] }));
  });
});
