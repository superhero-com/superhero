/**
 * X link changes on their way to the API, and ones it has only just caught up on.
 *
 * Linking or unlinking X is an on-chain transaction, and every screen that
 * shows whether X is linked reads the backend, which learns about the change
 * from its own indexer, minutes later. Anything that re-read the account in
 * that window would offer "Unlink" for an unlink already sent, or "Link" for a
 * link already sent.
 *
 * The waiting itself lives in the shared pending-transactions store (kinds
 * `link_x` / `unlink_x`), like every other transaction the app follows until
 * it is live. This module adds what is particular to X: when a change counts
 * as done (the account record agrees), and a short memory of changes that
 * just settled, for reads that started before they did.
 */

import { SuperheroApi, getLinkedXUsername } from '@/api/backend';
import {
  LEGACY_X_LINK_CHANGES_STORAGE_KEY,
  PENDING_TRANSACTION_POLL_MS,
  PENDING_TRANSACTION_TIMEOUT_MS,
  clearPendingTransactions,
  findPendingTransaction,
  onPendingTransactionSettled,
  pendingTransactionsVersion,
  registerPendingTransactionResolver,
  removePendingTransaction,
  resumePendingTransactions,
  subscribePendingTransactions,
  trackPendingTransaction,
  type PendingTransaction,
  type PendingTransactionResolver,
  type PendingTransactionStep,
} from '@/features/pending-transactions/store';

/** How often a pending change is checked. */
export const X_LINK_CHANGE_POLL_MS = PENDING_TRANSACTION_POLL_MS;

/** Past this, a change is no longer shown as on its way. */
export const X_LINK_CHANGE_TIMEOUT_MS = PENDING_TRANSACTION_TIMEOUT_MS;

/**
 * How long a settled change still overrides an older read. The editor's load
 * reads the account and then awaits more calls, so a read taken just before
 * the change settled can land just after it.
 */
export const CONFIRMED_X_LINK_TTL_MS = 10 * 60_000;

/**
 * Where the previous release kept pending X link changes. Still read (once,
 * then folded into the shared store) so a change pending across the update
 * is not lost.
 */
export const X_LINK_CHANGES_STORAGE_KEY = LEGACY_X_LINK_CHANGES_STORAGE_KEY;

export type XLinkChangeKind = 'link' | 'unlink';

export type PendingXLinkChange = {
  kind: XLinkChangeKind;
  txHash: string;
  /**
   * The handle being unlinked, for the screens that name it. Null for a link:
   * the claim may carry the X user id rather than the handle.
   */
  username: string | null;
  startedAt: number;
  /** `sent`, or `confirmed` once it is in a block. */
  step: PendingTransactionStep;
};

export type XLinkChangeOutcome = 'settled' | 'timed_out';

export type XLinkChangeSettledEvent = {
  address: string;
  change: PendingXLinkChange;
  outcome: XLinkChangeOutcome;
  /** The handle the API now shows, when settled. */
  username: string | null;
};

type ReadLinkedUsername = (address: string) => Promise<string | null>;

type ConfirmedChange = { username: string | null; at: number };

const X_KINDS: PendingTransaction['kind'][] = ['link_x', 'unlink_x'];

const confirmed = new Map<string, ConfirmedChange>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const normalize = (username: string | null | undefined) => (
  username ? username.replace(/^@/u, '').toLowerCase() : null
);

const isXKind = (transaction: PendingTransaction) => X_KINDS.includes(transaction.kind);

const toChange = (transaction: PendingTransaction): PendingXLinkChange => ({
  kind: transaction.kind === 'link_x' ? 'link' : 'unlink',
  txHash: transaction.txHash,
  username: transaction.kind === 'unlink_x' ? normalize(transaction.meta.username) : null,
  startedAt: transaction.startedAt,
  step: transaction.step,
});

// The account record, never a cached copy: this is the read that decides the
// wait is over.
const readLinkedUsernameFromApi: ReadLinkedUsername = async (address) => getLinkedXUsername(
  await SuperheroApi.getAccount(address, { cache: 'no-store' }),
);

// Live once the account record agrees: the handle gone for an unlink,
// present for a link.
const resolverFor = (read: ReadLinkedUsername): PendingTransactionResolver => (
  async (transaction) => {
    const linked = await read(transaction.account);
    const done = transaction.kind === 'unlink_x' ? !linked : Boolean(linked);
    return done ? { username: linked } : undefined;
  }
);

registerPendingTransactionResolver('link_x', resolverFor(readLinkedUsernameFromApi));
registerPendingTransactionResolver('unlink_x', resolverFor(readLinkedUsernameFromApi));

// Remembered as soon as it settles, before anything re-renders, so a read
// that started before the change settled cannot bring the old state back.
onPendingTransactionSettled(({ transaction, outcome, result }) => {
  if (!isXKind(transaction) || outcome !== 'settled') return;
  confirmed.set(transaction.account, { username: normalize(result.username), at: Date.now() });
});

const removeXChanges = (address: string) => {
  let transaction = findPendingTransaction({ kind: X_KINDS, account: address });
  while (transaction) {
    removePendingTransaction(transaction.txHash);
    transaction = findPendingTransaction({ kind: X_KINDS, account: address });
  }
};

/** For useSyncExternalStore: re-render when a pending or settled change moves. */
export function subscribeXLinkChanges(listener: () => void): () => void {
  const unsubscribe = subscribePendingTransactions(listener);
  listeners.add(listener);
  return () => {
    unsubscribe();
    listeners.delete(listener);
  };
}

/** Changes whenever any pending or settled X link change does. */
export function xLinkChangesVersion(): number {
  return pendingTransactionsVersion() + version;
}

/**
 * Runs once for each change that stops being pending: when the API has caught
 * up ('settled'), or when it is given up on ('timed_out').
 */
export function onXLinkChangeSettled(
  listener: (event: XLinkChangeSettledEvent) => void,
): () => void {
  return onPendingTransactionSettled(({ transaction, outcome, result }) => {
    if (!isXKind(transaction)) return;
    listener({
      address: transaction.account,
      change: toChange(transaction),
      outcome,
      username: result.username ?? null,
    });
  });
}

/** The X link change for `address` still on its way to the API, if any. */
export function pendingXLinkChange(address: string | null | undefined): PendingXLinkChange | null {
  if (!address) return null;
  const transaction = findPendingTransaction({ kind: X_KINDS, account: address });
  return transaction ? toChange(transaction) : null;
}

/**
 * Start tracking a broadcast link or unlink until the API shows it. Replaces
 * any change already tracked for the address.
 */
export function trackXLinkChange(
  address: string,
  change: { kind: XLinkChangeKind; txHash: string; username?: string | null },
  options: {
    readLinkedUsername?: ReadLinkedUsername;
    isMined?: (txHash: string) => Promise<boolean>;
  } = {},
): PendingXLinkChange {
  removeXChanges(address);
  // A newer change makes any earlier settled state moot.
  confirmed.delete(address);
  const transaction = trackPendingTransaction(
    {
      kind: change.kind === 'link' ? 'link_x' : 'unlink_x',
      account: address,
      txHash: change.txHash,
      meta: { username: change.kind === 'unlink' ? normalize(change.username) : null },
    },
    {
      resolve: options.readLinkedUsername ? resolverFor(options.readLinkedUsername) : undefined,
      isMined: options.isMined,
    },
  );
  return toChange(transaction);
}

/**
 * Pick up the changes a previous page load left pending. Safe to call more
 * than once: a change already being watched is left alone.
 */
export function resumeXLinkChanges(
  options: {
    readLinkedUsername?: ReadLinkedUsername;
    isMined?: (txHash: string) => Promise<boolean>;
  } = {},
): void {
  resumePendingTransactions({
    kind: X_KINDS,
    resolve: options.readLinkedUsername ? resolverFor(options.readLinkedUsername) : undefined,
    isMined: options.isMined,
  });
}

/**
 * Record a link state known to be final without waiting on the API: a handle,
 * or null for unlinked. Ends any pending change for the address.
 */
export function rememberConfirmedXLink(address: string, username: string | null): void {
  removeXChanges(address);
  confirmed.set(address, { username: normalize(username), at: Date.now() });
  emit();
}

/**
 * The X handle to show for `address`: what the API says, unless a change that
 * settled moments ago says otherwise. Stops overriding as soon as the API
 * agrees, so a later link or unlink made anywhere else shows normally.
 */
export function resolveXLink(address: string, apiUsername: string | null): string | null {
  const change = confirmed.get(address);
  if (!change) return apiUsername;
  if (Date.now() - change.at > CONFIRMED_X_LINK_TTL_MS) {
    confirmed.delete(address);
    return apiUsername;
  }
  if (normalize(apiUsername) === change.username) {
    confirmed.delete(address);
    return apiUsername;
  }
  // The read predates the settled change.
  return change.username;
}

type LinkState = { linked: boolean; username: string | null };

/**
 * The X link state to render, given whatever the component last loaded.
 *
 * Read-only, unlike {@link resolveXLink}: it never clears the note, because
 * local state agreeing proves nothing. A load that started before the change
 * settled can still land afterwards with the old handle; resolving here, on
 * every render, keeps the settled state no matter which write came last.
 */
export function effectiveXLink(address: string, loadedState: LinkState): LinkState {
  const change = confirmed.get(address);
  if (!change || Date.now() - change.at > CONFIRMED_X_LINK_TTL_MS) return loadedState;
  return { linked: change.username !== null, username: change.username };
}

/** Test helper: forget everything, in memory and in storage. */
export function clearConfirmedXLinks(): void {
  clearPendingTransactions();
  confirmed.clear();
  emit();
}
