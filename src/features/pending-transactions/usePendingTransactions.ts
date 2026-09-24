import { useSyncExternalStore } from 'react';
import {
  listPendingTransactions,
  pendingTransactionsVersion,
  subscribePendingTransactions,
  type PendingTransaction,
  type PendingTransactionFilter,
} from './store';

/** Re-render whenever anything pending moves. */
export function usePendingTransactionsVersion(): number {
  return useSyncExternalStore(
    subscribePendingTransactions,
    pendingTransactionsVersion,
    pendingTransactionsVersion,
  );
}

/**
 * The page-level check: what of this kind (for this wallet, this token…) is
 * still on its way, newest first, kept current as it moves. Reads what an
 * earlier page load left in localStorage too.
 */
export function usePendingTransactions(
  filter: PendingTransactionFilter = {},
): PendingTransaction[] {
  usePendingTransactionsVersion();
  return listPendingTransactions(filter);
}
