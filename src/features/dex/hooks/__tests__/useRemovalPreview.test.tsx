import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import type { PropsWithChildren } from 'react';
import { useRemovalPreview } from '../useRemovalPreview';
import type { LiquidityPosition } from '../../types/pool';

const mocks = vi.hoisted(() => ({ getPair: vi.fn() }));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: {} }) }));
vi.mock('@/libs/dex', () => ({ initDexContracts: async () => ({ factory: {} }), getPairInfo: (...args: unknown[]) => mocks.getPair(...args) }));
const position = { token0: 'ct_a', token1: 'ct_b', pair: { address: 'ct_pair' } } as LiquidityPosition;
const pool = {
  pairAddress: 'ct_pair', reserveA: 100n, reserveB: 200n, totalSupply: 10n,
};
let client: QueryClient;
const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
afterEach(() => { client?.clear(); mocks.getPair.mockReset(); });

describe('removal reserve reads', () => {
  it('requires a connected account and does not reuse the previous pair during a change', async () => {
    client = new QueryClient();
    mocks.getPair.mockResolvedValueOnce(pool);
    const { result, rerender } = renderHook((props) => useRemovalPreview(props.position, props.connected), { initialProps: { position, connected: false }, wrapper: Wrapper });
    expect(result.current.status).toBe('idle');
    expect(mocks.getPair).not.toHaveBeenCalled();
    rerender({ position, connected: true });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.getPair.mock.calls[0].slice(2)).toEqual(['ct_a', 'ct_b', true]);
    mocks.getPair.mockImplementationOnce(() => new Promise(() => {}));
    rerender({ position: { ...position, token1: 'ct_c', pair: { ...position.pair, address: 'ct_other' } }, connected: true });
    expect(result.current.status).toBe('loading');
    expect(result.current.pool).toBeUndefined();
  });
  it('blocks failed reads and a mismatched pair, with explicit retry', async () => {
    client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    mocks.getPair.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useRemovalPreview(position, true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('error'));
    mocks.getPair.mockResolvedValue({ ...pool, pairAddress: 'ct_wrong' });
    await act(async () => { await result.current.refetch(); });
    expect(result.current.status).toBe('error');
    expect(result.current.pool).toBeUndefined();
    mocks.getPair.mockResolvedValue(pool);
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
