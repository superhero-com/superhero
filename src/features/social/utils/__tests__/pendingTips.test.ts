import { QueryClient } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  PENDING_TRANSACTION_POLL_MS,
  clearPendingTransactions,
  listPendingTransactions,
} from '@/features/pending-transactions/store';
import { pendingTipFloor, trackPostTip, watchPendingTips } from '../pendingTips';

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

  it('keeps the total a tip made, even when it loads from the backend without it', async () => {
    trackPostTip({
      account: 'ak_sender', txHash: 'th_tip', postId: '7', amount: '3', expectedTotal: 5,
    });
    stop = watchPendingTips(queryClient);
    expect(pendingTipFloor('7_v3')).toBe(5);

    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '2' }) });
    expect(queryClient.getQueryData(SUMMARY)).toEqual({ totalTips: '5' });

    // Already higher (others tipped too): left as it is.
    await queryClient.fetchQuery({ queryKey: SUMMARY, queryFn: async () => ({ totalTips: '9' }), staleTime: 0 });
    expect(queryClient.getQueryData(SUMMARY)).toEqual({ totalTips: '9' });

    // Other posts are left alone.
    await queryClient.fetchQuery({ queryKey: ['post-tip-summary', '8_v3'], queryFn: async () => ({ totalTips: '1' }) });
    expect(queryClient.getQueryData(['post-tip-summary', '8_v3'])).toEqual({ totalTips: '1' });
  });

  it('counts every pending tip, even ones sent close together that saw the same total', () => {
    // Both saw 2 before them.
    trackPostTip({
      account: 'ak_sender', txHash: 'th_a', postId: '7', amount: '3', expectedTotal: 5,
    });
    trackPostTip({
      account: 'ak_sender', txHash: 'th_b', postId: '7', amount: '2', expectedTotal: 4,
    });
    expect(pendingTipFloor('7')).toBe(7);
  });

  it('does not count a tip twice when the next one already saw it', () => {
    trackPostTip({
      account: 'ak_sender', txHash: 'th_a', postId: '7', amount: '3', expectedTotal: 5,
    });
    // Sent after the first one showed: it saw 5.
    trackPostTip({
      account: 'ak_sender', txHash: 'th_b', postId: '7', amount: '2', expectedTotal: 7,
    });
    expect(pendingTipFloor('7')).toBe(7);
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
    expect(pendingTipFloor('7_v3')).toBeNull();
  });
});
