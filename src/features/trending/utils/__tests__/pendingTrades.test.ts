import { QueryClient } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  PENDING_TRANSACTION_POLL_MS,
  clearPendingTransactions,
  listPendingTransactions,
} from '@/features/pending-transactions/store';
import { OWNED_TOKENS_QUERY_KEY } from '@/hooks/useOwnedTokens';
import { refreshAfterTradeSettled, trackTokenTrade } from '../pendingTrades';

const mockListTransactions = vi.fn();

vi.mock('@/api/generated', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TransactionsService: {
      ...actual.TransactionsService,
      listTransactions: (...args: any[]) => mockListTransactions(...args),
    },
  };
});

describe('pending trades', () => {
  beforeEach(() => {
    clearPendingTransactions();
    mockListTransactions.mockResolvedValue({ items: [] });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    clearPendingTransactions();
    vi.useRealTimers();
  });

  it('is kept until the wallet\'s trades of the token include it', async () => {
    trackTokenTrade({
      account: 'ak_wallet', txHash: 'th_buy', saleAddress: 'ct_sale', side: 'buy',
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(listPendingTransactions({ kind: 'trade' })).toEqual([expect.objectContaining({
      step: 'confirmed', meta: { saleAddress: 'ct_sale', side: 'buy' },
    })]);
    expect(mockListTransactions).toHaveBeenCalledWith({
      tokenAddress: 'ct_sale', accountAddress: 'ak_wallet', limit: 20,
    });

    mockListTransactions.mockResolvedValue({ items: [{ tx_hash: 'th_buy' }] });
    await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS);

    expect(listPendingTransactions({ kind: 'trade' })).toEqual([]);
  });

  it('then refetches the token, its trades and the wallet\'s holdings', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const trade = trackTokenTrade({
      account: 'ak_wallet', txHash: 'th_sell', saleAddress: 'ct_sale', side: 'sell',
    });

    refreshAfterTradeSettled(queryClient, trade);

    const keys = invalidate.mock.calls.map(([filters]: any[]) => JSON.stringify(filters?.queryKey));
    expect(keys).toEqual(expect.arrayContaining([
      '["TokensService.findByAddress"]',
      '["TransactionsService.listTransactions","ct_sale"]',
      '["MiddlewareService.getTxsByScope","ct_sale"]',
      JSON.stringify(OWNED_TOKENS_QUERY_KEY),
    ]));
  });
});
