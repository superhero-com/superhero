import {
  TxPayloadType,
  type NotificationState,
  type TxPayload,
} from '@/features/transaction-notification/transaction-notification.context';
import { findPendingTransaction, type PendingTransaction } from './store';

type TrackedType =
  | typeof TxPayloadType.LinkX
  | typeof TxPayloadType.UnlinkX
  | typeof TxPayloadType.CreateToken;

type TrackedPayload = Extract<TxPayload, { type: TrackedType }>;

const TRACKED_TYPES: ReadonlySet<TxPayload['type']> = new Set([
  TxPayloadType.LinkX,
  TxPayloadType.UnlinkX,
  TxPayloadType.CreateToken,
]);

/** The top-banner payload for a pending transaction. */
export function pendingTransactionPayload(transaction: PendingTransaction): TrackedPayload {
  switch (transaction.kind) {
    case 'link_x':
      return { type: TxPayloadType.LinkX, startedAt: transaction.startedAt };
    case 'unlink_x':
      return { type: TxPayloadType.UnlinkX, startedAt: transaction.startedAt };
    case 'create_token':
    default:
      return {
        type: TxPayloadType.CreateToken,
        tokenName: transaction.meta.tokenName ?? '',
        startedAt: transaction.startedAt,
      };
  }
}

/** The banner payload for an X link change (see `pendingXLinkChange`). */
export function xLinkChangePayload(change: { kind: 'link' | 'unlink'; startedAt: number }): TrackedPayload {
  return change.kind === 'link'
    ? { type: TxPayloadType.LinkX, startedAt: change.startedAt }
    : { type: TxPayloadType.UnlinkX, startedAt: change.startedAt };
}

/** A payload for something the pending-transactions store follows until it is live. */
export function isTrackedPayload(
  payload: TxPayload,
): payload is TrackedPayload & { startedAt: number } {
  return TRACKED_TYPES.has(payload.type)
    && 'startedAt' in payload
    && typeof payload.startedAt === 'number';
}

/** The pending transaction a banner payload stands for, if it is still pending. */
export function transactionForPayload(payload: TxPayload): PendingTransaction | null {
  if (!isTrackedPayload(payload)) return null;
  return findPendingTransaction({
    match: (transaction) => transaction.startedAt === payload.startedAt
      && pendingTransactionPayload(transaction).type === payload.type,
  });
}

/**
 * Whether the banner is showing this transaction exactly, not just any
 * transaction of its kind: every stored wallet is polled, and one wallet's
 * transaction must never settle or clear another's.
 */
export function bannerShowsTransaction(
  banner: NotificationState,
  transaction: Pick<PendingTransaction, 'kind' | 'startedAt' | 'meta'>,
): boolean {
  if (banner.status !== 'pending') return false;
  const { payload } = banner;
  return payload.type === pendingTransactionPayload(transaction as PendingTransaction).type
    && 'startedAt' in payload
    && payload.startedAt === transaction.startedAt;
}

/** A tracked kind of transaction in the banner, still waiting or just announced. */
export function isTrackedBanner(banner: NotificationState): boolean {
  if (banner.status !== 'pending' && banner.status !== 'confirmed') return false;
  return TRACKED_TYPES.has(banner.payload.type);
}
