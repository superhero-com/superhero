import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import type { PropsWithChildren } from 'react';
import { useLiquidityPreview } from '../useLiquidityPreview';
import type { AddLiquidityState } from '../../types/pool';

const mocks = vi.hoisted(() => ({ getPair: vi.fn(), sdk: {} }));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: mocks.sdk }) }));
vi.mock('@/libs/dex', () => ({ initDexContracts: async () => ({ factory: {} }), getPairInfo: (...args: unknown[]) => mocks.getPair(...args) }));
const input = {
  tokenA: 'AE', tokenB: 'ct_one', decA: 18, decB: 6, amountA: '1', amountB: '2',
} as AddLiquidityState;
const pool = { reserveA: 10n ** 18n, reserveB: 2n * 10n ** 6n, totalSupply: 10n ** 18n };
let client: QueryClient;
const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
afterEach(() => { client?.clear(); });

describe('pool preview reads', () => {
  it('does not refetch reserves for keystrokes or reuse a previous pair while loading', async () => {
    client = new QueryClient();
    mocks.getPair.mockResolvedValueOnce(pool);
    const { result, rerender } = renderHook((state) => useLiquidityPreview(state), { initialProps: input, wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ ...input, amountA: '2', amountB: '4' });
    expect(result.current.preview?.lpMintEstimate).toBe('2');
    expect(mocks.getPair).toHaveBeenCalledTimes(1);
    let resolve: (value: null) => void = () => {};
    mocks.getPair.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    rerender({ ...input, tokenB: 'ct_two' });
    expect(result.current.status).toBe('loading');
    expect(result.current.preview).toBeNull();
    await waitFor(() => expect(mocks.getPair).toHaveBeenCalledTimes(2));
    await act(async () => resolve(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.pairExists).toBe(false);
  });
  it('keeps failed lookups distinct from a new pool and supports retry', async () => {
    client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    mocks.getPair.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useLiquidityPreview(input), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.preview).toBeNull();
    expect(mocks.getPair.mock.calls[0][4]).toBe(true);
    mocks.getPair.mockResolvedValue(pool);
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.pairExists).toBe(true);
  });
});
