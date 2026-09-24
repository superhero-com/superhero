/**
 * Trend token buys and sells mined but not yet in the backend.
 *
 * The trade screen reads the new balance from the chain, so it is right at
 * once. The token's price, holders and trades, and the wallet's holdings,
 * come from the backend, which indexes the trade a while later: refetching
 * them straight after the trade often gets the old numbers. Each trade is
 * kept in the pending-transactions store until the backend has it, reloads
 * included, and those views are refetched then.
 */

import type { QueryClient } from '@tanstack/react-query';
import { TransactionsService } from '@/api/generated';
import {
  registerPendingTransactionResolver,
  trackPendingTransaction,
  type PendingTransaction,
} from '@/features/pending-transactions/store';
import { OWNED_TOKENS_QUERY_KEY } from '@/hooks/useOwnedTokens';

// How far back the wallet's trades of this token are searched. The trade was
// made moments ago, so it is among the newest once the backend has it.
const RECENT_TRADES = 20;

// Live once the wallet's trades of this token include this transaction.
registerPendingTransactionResolver('trade', async (transaction) => {
  const { saleAddress } = transaction.meta;
  if (!saleAddress) return undefined;
  const page: any = await TransactionsService.listTransactions({
    tokenAddress: saleAddress,
    accountAddress: transaction.account,
    limit: RECENT_TRADES,
  });
  const items: any[] = Array.isArray(page?.items) ? page.items : [];
  return items.some((trade) => trade?.tx_hash === transaction.txHash)
    ? { saleAddress }
    : undefined;
});

/** Keep a mined buy or sell until the backend has it. */
export function trackTokenTrade({
  account, txHash, saleAddress, side,
}: {
  account: string;
  txHash: string;
  saleAddress: string;
  side: 'buy' | 'sell';
}): PendingTransaction {
  return trackPendingTransaction({
    kind: 'trade',
    account,
    txHash,
    // The wallet already waited for it to be mined.
    step: 'confirmed',
    meta: { saleAddress, side },
  });
}

/** Once the backend has it (or it is given up on), load the new numbers. */
export function refreshAfterTradeSettled(
  queryClient: QueryClient,
  transaction: PendingTransaction,
): void {
  const { saleAddress } = transaction.meta;
  queryClient.invalidateQueries({ queryKey: ['TokensService.findByAddress'] });
  queryClient.invalidateQueries({ queryKey: ['TransactionsService.listTransactions', saleAddress] });
  queryClient.invalidateQueries({ queryKey: ['MiddlewareService.getTxsByScope', saleAddress] });
  queryClient.invalidateQueries({ queryKey: OWNED_TOKENS_QUERY_KEY });
}
