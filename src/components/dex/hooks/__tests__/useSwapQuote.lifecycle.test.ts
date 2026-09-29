import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { DexTokenDto } from '../../../../api/generated';
import { useSwapQuote } from '../useSwapQuote';

const { routerQuote } = vi.hoisted(() => ({ routerQuote: vi.fn() }));
vi.mock('../../../../hooks', () => ({ useAeSdk: () => ({ sdk: {} }) }));
vi.mock('../../../../libs/dexBackend', () => ({ getSwapRoutes: async () => [] }));
vi.mock('../../../../libs/dex', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../libs/dex')>(),
  initDexContracts: async () => ({ factory: {}, router: { get_amounts_out: routerQuote } }),
  fetchPairReserves: async () => ({}),
}));

const tokenIn = { address: 'ct_input', decimals: 6, symbol: 'IN' } as DexTokenDto;
const tokenOut = { address: 'ct_output', decimals: 6, symbol: 'OUT' } as DexTokenDto;
const params = (amountIn: string) => ({
  amountIn, amountOut: '', tokenIn, tokenOut, isExactIn: true,
});

describe('swap quote lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers(); routerQuote.mockReset(); });
  afterEach(() => { vi.useRealTimers(); });

  it('marks the debounce window as pending and clears the previous route', async () => {
    routerQuote.mockResolvedValue({ decodedResult: [1000000n, 2000000n] });
    const { result } = renderHook(() => useSwapQuote());
    await act(async () => { await result.current.refreshQuote(params('1')); });
    expect(result.current.routeInfo.path).toEqual(['ct_input', 'ct_output']);
    act(() => { result.current.debouncedQuote(params('2')); });
    expect(result.current.quoteLoading).toBe(true);
    expect(result.current.routeInfo.path).toEqual([]);
  });

  it('ignores a superseded request even before the new debounce finishes', async () => {
    let resolveOld!: (value: { decodedResult: bigint[] }) => void;
    routerQuote.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const oldCallback = vi.fn();
    const newCallback = vi.fn();
    const { result } = renderHook(() => useSwapQuote());
    let pending!: ReturnType<typeof result.current.refreshQuote>;
    await act(async () => { pending = result.current.refreshQuote(params('1'), oldCallback); });
    act(() => { result.current.debouncedQuote(params('2'), newCallback); });
    await act(async () => { resolveOld({ decodedResult: [1000000n, 2000000n] }); await pending; });
    expect(oldCallback).not.toHaveBeenCalled();
    expect(result.current.routeInfo.path).toEqual([]);
    expect(result.current.quoteLoading).toBe(true);
    routerQuote.mockResolvedValue({ decodedResult: [2000000n, 3000000n] });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(newCallback).toHaveBeenCalledWith(expect.objectContaining({ amountOut: '3' }));
    expect(result.current.quoteLoading).toBe(false);
  });

  it('clearing an amount prevents an in-flight quote from restoring an estimate', async () => {
    let resolveOld!: (value: { decodedResult: bigint[] }) => void;
    routerQuote.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const oldCallback = vi.fn();
    const { result } = renderHook(() => useSwapQuote());
    let pending!: ReturnType<typeof result.current.refreshQuote>;
    await act(async () => { pending = result.current.refreshQuote(params('1'), oldCallback); });
    act(() => { result.current.debouncedQuote(params('')); });
    await act(async () => { resolveOld({ decodedResult: [1000000n, 2000000n] }); await pending; });
    expect(oldCallback).not.toHaveBeenCalled();
    expect(result.current.routeInfo.path).toEqual([]);
    expect(result.current.quoteLoading).toBe(false);
  });

  it('cancels a scheduled request when the consumer unmounts', async () => {
    const { result, unmount } = renderHook(() => useSwapQuote());
    act(() => { result.current.debouncedQuote(params('1')); });
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(routerQuote).not.toHaveBeenCalled();
  });
});
