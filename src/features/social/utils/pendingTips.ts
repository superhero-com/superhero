/**
 * Tips on posts sent but not yet in the backend.
 *
 * A tip shows at once: the post's total is bumped in the browser, and the
 * backend counts it a while later. That bump used to live only in the query
 * cache, so a reload in between showed the old total. It is now kept in the
 * pending-transactions store, and a total loaded without it is raised back to
 * what it will be, until the backend has the tip.
 */

import type { QueryClient } from '@tanstack/react-query';
import { TipsService } from '@/api/generated';
import {
  listPendingTransactions,
  registerPendingTransactionResolver,
  trackPendingTransaction,
  type PendingTransaction,
} from '@/features/pending-transactions/store';
import { normalizePostId } from './pendingPosts';

// How far back the sender's tips are searched for this one. The tip was sent
// moments ago, so it is among the newest once the backend has it.
const RECENT_TIPS = 20;

// Live once the sender's tips list has this transaction.
registerPendingTransactionResolver('tip_post', async (transaction) => {
  const page: any = await TipsService.listTips({
    sender: transaction.account,
    orderBy: 'created_at',
    orderDirection: 'DESC',
    limit: RECENT_TIPS,
  });
  const items: any[] = Array.isArray(page?.items) ? page.items : [];
  return items.some((tip) => tip?.tx_hash === transaction.txHash)
    ? { postId: transaction.meta.postId }
    : undefined;
});

/**
 * Keep a mined tip on a post until the backend counts it. `expectedTotal` is
 * the post's total with this tip in it, as shown when it was sent.
 */
export function trackPostTip({
  account, txHash, postId, amount, expectedTotal,
}: {
  account: string;
  txHash: string;
  postId: string;
  amount: string;
  expectedTotal: number;
}): PendingTransaction {
  return trackPendingTransaction({
    kind: 'tip_post',
    account,
    txHash,
    // The wallet already waited for it to be mined.
    step: 'confirmed',
    meta: {
      postId: normalizePostId(postId),
      amount,
      expectedTotal: String(expectedTotal),
    },
  });
}

/**
 * The least the post's total can be while its tips are still on their way to
 * the backend, or null when none are.
 */
export function pendingTipFloor(postId: string): number | null {
  const id = normalizePostId(postId);
  const totals = listPendingTransactions({
    kind: 'tip_post',
    match: (transaction) => transaction.meta.postId === id,
  })
    .map((transaction) => Number(transaction.meta.expectedTotal))
    .filter(Number.isFinite);
  return totals.length ? Math.max(...totals) : null;
}

/**
 * Keep pending tips counted: whenever a post's tip total loads from the
 * backend below what its pending tips make it, raise it back. Returns the
 * unsubscribe.
 */
export function watchPendingTips(queryClient: QueryClient): () => void {
  return queryClient.getQueryCache().subscribe((event) => {
    // Only fetches: `setQueryData` (ours included) is marked manual.
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
    const [scope, postId] = event.query.queryKey as unknown[];
    if (scope !== 'post-tip-summary' || typeof postId !== 'string') return;
    const floor = pendingTipFloor(postId);
    if (floor === null) return;
    const data = event.query.state.data as { totalTips?: string } | undefined;
    const loaded = Number(data?.totalTips ?? 0);
    if (Number.isFinite(loaded) && loaded >= floor) return;
    queryClient.setQueryData(event.query.queryKey, { ...(data || {}), totalTips: String(floor) });
  });
}

/** Once the backend counts it (or it is given up on), load the real total. */
export function refreshAfterTipSettled(
  queryClient: QueryClient,
  transaction: PendingTransaction,
): void {
  queryClient.invalidateQueries({ queryKey: ['post-tip-summary', transaction.meta.postId] });
}
