/**
 * Tips on posts sent but not yet in the backend.
 *
 * A tip shows at once: the post's total is bumped in the browser, and the
 * backend counts it a while later. That bump used to live only in the query
 * cache, so a reload in between showed the old total. It is now kept in the
 * pending-transactions store, and added to any total loaded without it, until
 * the backend has the tip.
 */

import type { QueryClient } from '@tanstack/react-query';
import { TipsService } from '@/api/generated';
import {
  listPendingTransactions,
  recheckPendingTransactions,
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
 * Keep a mined tip on a post until the backend counts it. `expectedTotal`,
 * the post's total with this tip in it as shown when it was sent, is kept for
 * the record; what is shown later is the backend's total plus pending tips.
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

/** Pending tips on `postId`: sent, not yet counted by the backend. */
const pendingTipsOn = (postId: string): PendingTransaction[] => {
  const id = normalizePostId(postId);
  return listPendingTransactions({
    kind: 'tip_post',
    match: (transaction) => transaction.meta.postId === id,
  });
};

/**
 * What the post's pending tips add to the total the backend reports, or null
 * when none are pending.
 */
export function pendingTipAmount(postId: string): number | null {
  const tips = pendingTipsOn(postId);
  if (!tips.length) return null;
  return tips
    .map((transaction) => Number(transaction.meta.amount))
    .filter(Number.isFinite)
    .reduce((sum, amount) => sum + amount, 0);
}

/**
 * Keep pending tips counted: whenever a post's tip total loads from the
 * backend, add the tips it does not count yet. Those are asked about again at
 * once, so one the backend has just counted settles (and the total refetches)
 * instead of being added twice until the next poll. Returns the unsubscribe.
 */
export function watchPendingTips(queryClient: QueryClient): () => void {
  return queryClient.getQueryCache().subscribe((event) => {
    // Only fetches: `setQueryData` (ours included) is marked manual.
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
    const [scope, postId] = event.query.queryKey as unknown[];
    if (scope !== 'post-tip-summary' || typeof postId !== 'string') return;
    const pending = pendingTipAmount(postId);
    if (!pending) return;
    const data = event.query.state.data as { totalTips?: string } | undefined;
    const loaded = Number(data?.totalTips ?? 0);
    const total = (Number.isFinite(loaded) ? loaded : 0) + pending;
    queryClient.setQueryData(event.query.queryKey, { ...(data || {}), totalTips: String(total) });
    const id = normalizePostId(postId);
    recheckPendingTransactions({
      kind: 'tip_post',
      match: (transaction) => transaction.meta.postId === id,
    });
  });
}

/** Once the backend counts it (or it is given up on), load the real total. */
export function refreshAfterTipSettled(
  queryClient: QueryClient,
  transaction: PendingTransaction,
): void {
  queryClient.invalidateQueries({ queryKey: ['post-tip-summary', transaction.meta.postId] });
}
