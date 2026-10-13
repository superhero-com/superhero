import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { PropsWithChildren } from 'react';
import { CONFIG } from '@/config';
import { useReferenceRatio } from '../useReferenceRatio';

const mocks = vi.hoisted(() => ({ reserves: vi.fn() }));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: {} }) }));
vi.mock('@/libs/dex', () => ({ initDexContracts: async () => ({ factory: {} }), fetchPairReserves: (...args: unknown[]) => mocks.reserves(...args) }));
// AE pools by token, with reserveA on the token side: 1 A = 2 AE and 1 B = 0.5 AE, so 1 B = 0.25 A.
const aePools: Record<string, { reserveA: bigint; reserveB: bigint }> = {
  ct_a: { reserveA: 50n * 10n ** 18n, reserveB: 100n * 10n ** 18n },
  ct_b: { reserveA: 200n * 10n ** 6n, reserveB: 100n * 10n ** 18n },
};
let client: QueryClient;
const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => {
  client = new QueryClient();
  mocks.reserves.mockImplementation(async (_sdk: unknown, _factory: unknown, token: string) => aePools[token] ?? null);
});
afterEach(() => { client.clear(); });

describe('new pool reference ratio', () => {
  it('prices a pair without a pool through each token\'s AE pool', async () => {
    const { result } = renderHook(() => useReferenceRatio('ct_a', 'ct_b', 18, 6, true), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toBe('0.25'));
    expect(mocks.reserves.mock.calls.map((call) => call.slice(2))).toEqual([
      ['ct_a', CONFIG.DEX_WAE], ['ct_b', CONFIG.DEX_WAE],
    ]);
  });

  it.each([
    ['while disabled', 'ct_a', 'ct_b', false],
    ['when AE is one side', 'AE', 'ct_b', true],
    ['when WAE is one side', 'ct_a', CONFIG.DEX_WAE, true],
    ['for the same token twice', 'ct_a', 'ct_a', true],
  ])('suggests nothing and reads no pools %s', async (_, tokenA, tokenB, enabled) => {
    const { result } = renderHook(() => useReferenceRatio(tokenA, tokenB, 18, 6, enabled), { wrapper: Wrapper });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(result.current).toBeUndefined();
    expect(mocks.reserves).not.toHaveBeenCalled();
  });
});
