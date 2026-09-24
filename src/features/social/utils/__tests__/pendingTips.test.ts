import { QueryClient } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  PENDING_TRANSACTION_POLL_MS,
  clearPendingTransactions,
  listPendingTransactions,
} from '@/features/pending-transactions/store';
import { pendingTipAmount, trackPostTip, watchPendingTips } from '../pendingTips';

const mockListTips = vi.fn();

vi.mock('@/api/generated', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TipsService: { ...actual.TipsService, listTips: (...args: any[]) => mockListTips(...args) },
  };
});

const SUMMARY = ['post-tip-summary', '7_v3'];

describe('pending tips', () => {
  let queryClient: QueryClient;
  let stop: () => void;

  beforeEach(() => {
    clearPendingTransactions();
    mockListTips.mockResolvedValue({ items: [] });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    stop?.();
    clearPendingTransactions();
    vi.useRealTimers();
  });

  it('adds a tip the backend does not count yet to the total it loads', async () => {
    trackPostTip({
      account: 'ak_sender', txHash: 'th_tip', postId: '7', amount: '3', expectedTotal: 5,
    });
    stop = watchPendingTips(queryClient);
    expect(pendingTipAmount('7_v3')).toBe(3);

    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '2' }) });
    expect(queryClient.getQueryData(SUMMARY)).toEqual({ totalTips: '5' });

    // Others tipped meanwhile: still counted on top.
    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '9' }), staleTime: 0 });
    expect(queryClient.getQueryData(SUMMARY)).toEqual({ totalTips: '12' });

    // Other posts are left alone.
    await queryClient.fetchQuery({ queryKey: ['post-tip-summary', '8_v3'], queryFn: async () => ({ totalTips: '1' }) });
    expect(queryClient.getQueryData(['post-tip-summary', '8_v3'])).toEqual({ totalTips: '1' });
  });

  it('counts every pending tip, including after one of them is counted', async () => {
    // Sent close together: both saw 2 before them.
    trackPostTip({
      account: 'ak_sender', txHash: 'th_a', postId: '7', amount: '3', expectedTotal: 5,
    });
    trackPostTip({
      account: 'ak_sender', txHash: 'th_b', postId: '7', amount: '2', expectedTotal: 4,
    });
    stop = watchPendingTips(queryClient);
    await vi.advanceTimersByTimeAsync(0);

    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '2' }) });
    expect(queryClient.getQueryData(SUMMARY)).toEqual({ totalTips: '7' });

    // The backend counts the first one.
    mockListTips.mockResolvedValue({ items: [{ tx_hash: 'th_a' }] });
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);
    expect(pendingTipAmount('7')).toBe(2);

    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '5' }), staleTime: 0 });
    expect(queryClient.getQueryData(SUMMARY)).toEqual({ totalTips: '7' });
  });

  it('asks again at once when a total loads, so a tip just counted is not added twice for long', async () => {
    trackPostTip({
      account: 'ak_sender', txHash: 'th_tip', postId: '7', amount: '3', expectedTotal: 5,
    });
    stop = watchPendingTips(queryClient);
    await vi.advanceTimersByTimeAsync(0);
    mockListTips.mockClear();

    // The backend has just counted it; the next poll is 10 s away.
    mockListTips.mockResolvedValue({ items: [{ tx_hash: 'th_tip' }] });
    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '5' }) });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockListTips).toHaveBeenCalledTimes(1);
    expect(pendingTipAmount('7')).toBeNull();
  });

  it('is done once the sender\'s tips include it', async () => {
    trackPostTip({
      account: 'ak_sender', txHash: 'th_tip', postId: '7_v3', amount: '3', expectedTotal: 5,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(listPendingTransactions({ kind: 'tip_post' })).toHaveLength(1);
    expect(mockListTips).toHaveBeenCalledWith({
      sender: 'ak_sender', orderBy: 'created_at', orderDirection: 'DESC', limit: 20,
    });

    mockListTips.mockResolvedValue({ items: [{ tx_hash: 'th_other' }, { tx_hash: 'th_tip' }] });
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);

    expect(listPendingTransactions({ kind: 'tip_post' })).toEqual([]);
    expect(pendingTipAmount('7_v3')).toBeNull();
  });
});
