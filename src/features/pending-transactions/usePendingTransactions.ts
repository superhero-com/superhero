import { useSyncExternalStore } from 'react';
import { pendingTransactionsVersion, subscribePendingTransactions } from './store';

/** Re-render whenever anything pending moves. */
export function usePendingTransactionsVersion(): number {
  return useSyncExternalStore(
    subscribePendingTransactions,
    pendingTransactionsVersion,
    pendingTransactionsVersion,
  );
}
