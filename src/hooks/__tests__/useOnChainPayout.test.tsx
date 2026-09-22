import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  ON_CHAIN_PAYOUT_MISS_MAX_READS,
  ON_CHAIN_PAYOUT_MISS_POLL_MS,
  ON_CHAIN_PAYOUT_UNMINED_POLL_MS,
  useOnChainPayout,
} from '../useOnChainPayout';

const mockFetch = vi.fn();

vi.mock('@/utils/onChainPayout', () => ({
  fetchOnChainPayout: (...args: any[]) => mockFetch(...args),
}));

const HASH = 'th_payout';
const USER = 'ak_user';
const verified = {
  mined: true, verified: true, amountAe: '10', time: '2026-07-02T12:00:00.000Z',
};
const unmined = {
  mined: false, verified: false, amountAe: null, time: null,
};

function setup(txHash: string | null = HASH) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useOnChainPayout(txHash, USER), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe('useOnChainPayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads a mined payout once and keeps it', async () => {
    mockFetch.mockResolvedValue(verified);
    const { result } = setup();

    await waitFor(() => expect(result.current.data).toEqual(verified));
    await advance(ON_CHAIN_PAYOUT_MISS_POLL_MS * 5);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(HASH, USER);
  });

  it('reads an unmined payout again until it lands', async () => {
    mockFetch.mockResolvedValueOnce(unmined).mockResolvedValue(verified);
    const { result } = setup();
    await waitFor(() => expect(result.current.data).toEqual(unmined));

    await advance(ON_CHAIN_PAYOUT_UNMINED_POLL_MS);
    await waitFor(() => expect(result.current.data).toEqual(verified));
  });

  it('looks again after a miss, so a payout too new to be indexed still turns verified', async () => {
    mockFetch.mockResolvedValueOnce(null).mockResolvedValue(verified);
    const { result } = setup();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(result.current.data).toBeNull();

    await advance(ON_CHAIN_PAYOUT_MISS_POLL_MS);
    await waitFor(() => expect(result.current.data).toEqual(verified));
  });

  it('gives up on a hash that never resolves, rather than poll all session', async () => {
    mockFetch.mockResolvedValue(null);
    setup();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    for (let i = 0; i < ON_CHAIN_PAYOUT_MISS_MAX_READS + 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await advance(ON_CHAIN_PAYOUT_MISS_POLL_MS);
    }
    expect(mockFetch).toHaveBeenCalledTimes(ON_CHAIN_PAYOUT_MISS_MAX_READS);
  });

  it('does not read anything without a real transaction hash', async () => {
    setup(null);
    setup('claimed:1726900000000');
    await advance(ON_CHAIN_PAYOUT_MISS_POLL_MS);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
