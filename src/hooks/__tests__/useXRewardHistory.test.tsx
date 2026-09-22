import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  useXRewardHistory,
  X_REWARD_HISTORY_PENDING_POLL_MS,
  X_REWARD_HISTORY_RETRY_POLL_MS,
} from '../useXRewardHistory';

const mockGetHistory = vi.fn();

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    getXPostingRewardHistory: (...args: any[]) => mockGetHistory(...args),
  },
}));

// Imported for the query key only; keep its wallet dependencies out of this test.
vi.mock('../useAeSdk', () => ({ useAeSdk: () => ({}) }));
vi.mock('../useWalletConnect', () => ({ useWalletConnect: () => ({}) }));
vi.mock('../useWalletReconnect', () => ({ useWalletReconnect: () => vi.fn() }));
vi.mock('@/utils/signLinkMessage', () => ({ signAndVerifyLinkMessage: vi.fn() }));
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

const ADDRESS = 'ak_wallet';

const paid = { status: 'paid', tx_hash: 'th_1', explorer_url: 'https://aescan.io/transactions/th_1' };
const pending = { status: 'pending', tx_hash: null, explorer_url: null };
const failed = { status: 'failed', tx_hash: null, explorer_url: null };

function setup(address: string | null = ADDRESS) {
  // Retries on by default, as in the app, so the hook's own `retry: false` is
  // what the 404 case below exercises.
  const client = new QueryClient({ defaultOptions: { queries: { retry: 2 } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = renderHook(() => useXRewardHistory(address), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...view, invalidate };
}

describe('useXRewardHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the history for the wallet', async () => {
    mockGetHistory.mockResolvedValue({ items: [paid], truncated: false });
    const { result } = setup();

    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(mockGetHistory).toHaveBeenCalledWith(ADDRESS);
  });

  it('does not ask without a wallet', () => {
    setup(null);
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('keeps looking while a payout is on its way, and nudges the status that settles it', async () => {
    mockGetHistory.mockResolvedValue({ items: [pending, paid], truncated: false });
    const { result, invalidate } = setup();
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));

    await act(async () => {
      vi.advanceTimersByTime(X_REWARD_HISTORY_PENDING_POLL_MS);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['xPostingRewardStatus', ADDRESS] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['xPostingRewardStatus', 'history', ADDRESS],
    });
  });

  it('keeps looking, more slowly, while a failed payout waits for its retry', async () => {
    mockGetHistory.mockResolvedValue({ items: [failed, paid], truncated: false });
    const { result, invalidate } = setup();
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));

    // Not at the fast in-flight pace...
    await act(async () => {
      vi.advanceTimersByTime(X_REWARD_HISTORY_PENDING_POLL_MS);
    });
    expect(invalidate).not.toHaveBeenCalled();

    // ...but it does look again, so "Retrying" can turn into "Paid".
    await act(async () => {
      vi.advanceTimersByTime(X_REWARD_HISTORY_RETRY_POLL_MS - X_REWARD_HISTORY_PENDING_POLL_MS);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['xPostingRewardStatus', ADDRESS] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['xPostingRewardStatus', 'history', ADDRESS],
    });
  });

  it('stops looking once everything has arrived', async () => {
    mockGetHistory.mockResolvedValue({ items: [paid], truncated: false });
    const { result, invalidate } = setup();
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));

    await act(async () => {
      vi.advanceTimersByTime(X_REWARD_HISTORY_PENDING_POLL_MS * 3);
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('reports an API without the route as an error rather than retrying it', async () => {
    mockGetHistory.mockRejectedValue(new Error('Superhero API error (404): Not Found'));
    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockGetHistory).toHaveBeenCalledTimes(1);
  });
});
