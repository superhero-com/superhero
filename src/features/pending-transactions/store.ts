/**
 * Transactions on their way: sent, maybe mined, but not yet showing in the app.
 *
 * Most of what Superhero shows comes from the backend, which learns about a
 * transaction from its own indexer. Between broadcast and that moment the app
 * would show the state from before the transaction, as if it had not been
 * sent. Every transaction that can take that long is recorded here, from
 * broadcast until it is live, and kept in localStorage: a reload, or a visit
 * to another page, picks the wait back up instead of losing it.
 *
 * Each entry moves through the same steps, whatever it is:
 * - `sent`: broadcast, not yet in a block;
 * - `confirmed`: in a block, not yet showing in the app;
 * - then it is removed, and the settled listeners are told, once the resolver
 *   registered for its kind says it is live.
 *
 * Any page can ask "is something of mine still on its way?" with
 * `usePendingTransactions`. The one component that shows the wait is
 * `PendingTransaction`.
 */

import { isTransactionMined } from '@/utils/apiRead';

export const PENDING_TRANSACTIONS_STORAGE_KEY = 'superhero:pending-transactions:v1';

/** Where X link changes were kept before this store; read once and folded in. */
export const LEGACY_X_LINK_CHANGES_STORAGE_KEY = 'superhero:x-link-changes:v1';

/** How often a pending transaction is checked. */
export const PENDING_TRANSACTION_POLL_MS = 10_000;

/**
 * Past this, stop showing a transaction as on its way and let the app speak
 * for itself: it was dropped, or the indexer is down, and a wait that never
 * ends helps nobody.
 */
export const PENDING_TRANSACTION_TIMEOUT_MS = 20 * 60_000;

export type PendingTransactionKind =
  | 'link_x'
  | 'unlink_x'
  | 'create_token'
  | 'create_post'
  | 'create_comment'
  | 'tip_post'
  | 'trade';

export type PendingTransactionStep = 'sent' | 'confirmed';

export type PendingTransaction = {
  kind: PendingTransactionKind;
  /** The wallet that sent it. */
  account: string;
  txHash: string;
  startedAt: number;
  step: PendingTransactionStep;
  /** What the screens need to name it, e.g. a token name or an X handle. */
  meta: Record<string, string | null>;
};

export type PendingTransactionOutcome = 'settled' | 'timed_out';

export type PendingTransactionSettledEvent = {
  transaction: PendingTransaction;
  outcome: PendingTransactionOutcome;
  /** What the resolver reported, when settled. */
  result: Record<string, string | null>;
};

/**
 * Whether a transaction is live in the app yet: a result when it is,
 * undefined when not yet. Throwing means "no answer", and it is asked again.
 */
export type PendingTransactionResolver = (
  transaction: PendingTransaction,
) => Promise<Record<string, string | null> | undefined>;

type WatchOptions = {
  /** In place of the resolver registered for the kind (tests, one-offs). */
  resolve?: PendingTransactionResolver;
  isMined?: (txHash: string) => Promise<boolean>;
};

const KINDS: ReadonlySet<string> = new Set<PendingTransactionKind>([
  'link_x',
  'unlink_x',
  'create_token',
  'create_post',
  'create_comment',
  'tip_post',
  'trade',
]);

const transactions = new Map<string, PendingTransaction>();
type Watcher = {
  token: object;
  timer: ReturnType<typeof setInterval>;
  check: () => Promise<void>;
};

const watchers = new Map<string, Watcher>();
const resolvers = new Map<PendingTransactionKind, PendingTransactionResolver>();
const listeners = new Set<() => void>();
const settledListeners = new Set<(event: PendingTransactionSettledEvent) => void>();
let version = 0;
let loaded = false;

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const isPendingTransaction = (value: any): value is PendingTransaction => Boolean(
  value
  && KINDS.has(value.kind)
  && typeof value.account === 'string' && value.account
  && typeof value.txHash === 'string' && value.txHash
  && Number.isFinite(value.startedAt)
  && (value.step === 'sent' || value.step === 'confirmed')
  && value.meta && typeof value.meta === 'object',
);

// Storage can be missing, full or blocked (private mode); the in-memory
// state still works for this page load either way.
const readStorage = (key: string): unknown => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persist = () => {
  try {
    if (!transactions.size) {
      window.localStorage.removeItem(PENDING_TRANSACTIONS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      PENDING_TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(Array.from(transactions.values())),
    );
  } catch {
    // ignore
  }
};

// X link changes pending in the shape the previous release stored them in.
const readLegacyXLinkChanges = (): PendingTransaction[] => {
  const stored = readStorage(LEGACY_X_LINK_CHANGES_STORAGE_KEY);
  try {
    window.localStorage.removeItem(LEGACY_X_LINK_CHANGES_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (!stored || typeof stored !== 'object') return [];
  return Object.entries(stored as Record<string, any>).flatMap(([account, value]) => {
    if (!value || (value.kind !== 'link' && value.kind !== 'unlink')) return [];
    return [{
      kind: value.kind === 'link' ? 'link_x' : 'unlink_x',
      account,
      txHash: value.txHash,
      startedAt: value.startedAt,
      step: 'sent',
      meta: { username: typeof value.username === 'string' ? value.username : null },
    } as PendingTransaction];
  });
};

const ensureLoaded = () => {
  if (loaded) return;
  loaded = true;
  const stored = readStorage(PENDING_TRANSACTIONS_STORAGE_KEY);
  const candidates = [
    ...(Array.isArray(stored) ? stored : []),
    ...readLegacyXLinkChanges(),
  ];
  const now = Date.now();
  candidates.forEach((value) => {
    if (isPendingTransaction(value) && now - value.startedAt <= PENDING_TRANSACTION_TIMEOUT_MS) {
      transactions.set(value.txHash, value);
    }
  });
  // Drops anything malformed or expired from storage too.
  persist();
};

const stopWatching = (txHash: string) => {
  const watcher = watchers.get(txHash);
  if (watcher) clearInterval(watcher.timer);
  watchers.delete(txHash);
};

const finish = (
  txHash: string,
  outcome: PendingTransactionOutcome,
  result: Record<string, string | null>,
) => {
  const transaction = transactions.get(txHash);
  stopWatching(txHash);
  if (!transaction) return;
  transactions.delete(txHash);
  persist();
  // Listeners first, so anything they record (a settled X handle, say) is in
  // place for the re-render the emit below triggers.
  const event = { transaction, outcome, result };
  settledListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[pending-transactions] settled listener failed', err);
    }
  });
  emit();
};

const watch = (txHash: string, options: WatchOptions = {}) => {
  stopWatching(txHash);
  const token = {};
  let checking = false;
  // A recheck asked for while a check was in flight: that check may have
  // asked before what prompted the recheck, so ask once more after it.
  let recheckQueued = false;
  // Undefined once it is finished, removed, or watched by a newer loop.
  const current = () => (
    watchers.get(txHash)?.token === token ? transactions.get(txHash) : undefined
  );

  const check = async (recheck = false) => {
    const transaction = current();
    if (!transaction) return;
    if (Date.now() - transaction.startedAt > PENDING_TRANSACTION_TIMEOUT_MS) {
      finish(txHash, 'timed_out', {});
      return;
    }
    if (checking) {
      if (recheck) recheckQueued = true;
      return;
    }
    checking = true;
    try {
      if (transaction.step === 'sent') {
        let mined = false;
        try {
          mined = await (options.isMined ?? isTransactionMined)(txHash);
        } catch {
          // A failed read is not an answer; the next tick asks again.
        }
        const latest = current();
        if (mined && latest?.step === 'sent') {
          transactions.set(txHash, { ...latest, step: 'confirmed' });
          persist();
          emit();
        }
      }
      const latest = current();
      const resolve = options.resolve ?? (latest && resolvers.get(latest.kind));
      if (!latest || !resolve) return;
      let result: Record<string, string | null> | undefined;
      try {
        result = await resolve(latest);
      } catch {
        return;
      }
      if (result && current()) finish(txHash, 'settled', result);
    } finally {
      checking = false;
      if (recheckQueued) {
        recheckQueued = false;
        check(true);
      }
    }
  };

  watchers.set(txHash, {
    token,
    // Polls skip while a check is in flight; only rechecks queue up.
    timer: setInterval(() => { check(); }, PENDING_TRANSACTION_POLL_MS),
    check: () => check(true),
  });
  check();
};

/** For useSyncExternalStore: re-render when anything pending moves. */
export function subscribePendingTransactions(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Changes whenever anything pending does. */
export function pendingTransactionsVersion(): number {
  return version;
}

/** Runs once for each transaction that stops being pending. */
export function onPendingTransactionSettled(
  listener: (event: PendingTransactionSettledEvent) => void,
): () => void {
  settledListeners.add(listener);
  return () => { settledListeners.delete(listener); };
}

/** How to tell that a kind of transaction is live. One per kind. */
export function registerPendingTransactionResolver(
  kind: PendingTransactionKind,
  resolver: PendingTransactionResolver,
): void {
  resolvers.set(kind, resolver);
}

export type PendingTransactionFilter = {
  kind?: PendingTransactionKind | PendingTransactionKind[];
  account?: string | null;
  match?: (transaction: PendingTransaction) => boolean;
};

/** Everything pending that matches, newest first. */
export function listPendingTransactions(
  filter: PendingTransactionFilter = {},
): PendingTransaction[] {
  ensureLoaded();
  const kinds = filter.kind && (Array.isArray(filter.kind) ? filter.kind : [filter.kind]);
  return Array.from(transactions.values())
    .filter((transaction) => (!kinds || kinds.includes(transaction.kind))
      && (filter.account === undefined || transaction.account === filter.account)
      && (!filter.match || filter.match(transaction)))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** The newest pending transaction that matches, if any. */
export function findPendingTransaction(
  filter: PendingTransactionFilter = {},
): PendingTransaction | null {
  return listPendingTransactions(filter)[0] ?? null;
}

/**
 * Record a broadcast transaction and watch it until it is live. Replaces an
 * entry with the same hash. `step: 'confirmed'` for one the wallet already
 * waited to see mined: what is left is the backend catching up.
 */
export function trackPendingTransaction(
  input: {
    kind: PendingTransactionKind;
    account: string;
    txHash: string;
    meta?: Record<string, string | null>;
    step?: PendingTransactionStep;
  },
  options: WatchOptions = {},
): PendingTransaction {
  ensureLoaded();
  const transaction: PendingTransaction = {
    kind: input.kind,
    account: input.account,
    txHash: input.txHash,
    startedAt: Date.now(),
    step: input.step ?? 'sent',
    meta: input.meta ?? {},
  };
  transactions.set(transaction.txHash, transaction);
  persist();
  emit();
  watch(transaction.txHash, options);
  return transaction;
}

/** Forget a pending transaction without announcing it (it is known final). */
export function removePendingTransaction(txHash: string): void {
  ensureLoaded();
  stopWatching(txHash);
  if (!transactions.delete(txHash)) return;
  persist();
  emit();
}

/**
 * Pick up what a previous page load left pending. Safe to call more than
 * once: a transaction already being watched is left alone.
 */
/**
 * Ask now, rather than at the next poll, whether what matches is live yet:
 * for when a screen has just loaded data that may already include it.
 */
export function recheckPendingTransactions(filter: PendingTransactionFilter = {}): void {
  listPendingTransactions(filter).forEach(({ txHash }) => {
    watchers.get(txHash)?.check();
  });
}

export function resumePendingTransactions(
  options: WatchOptions & { kind?: PendingTransactionKind | PendingTransactionKind[] } = {},
): void {
  listPendingTransactions({ kind: options.kind }).forEach(({ txHash }) => {
    if (!watchers.has(txHash)) watch(txHash, options);
  });
}

/** Test helper: forget everything, in memory and in storage. */
export function clearPendingTransactions(): void {
  Array.from(watchers.keys()).forEach(stopWatching);
  transactions.clear();
  loaded = false;
  try {
    window.localStorage.removeItem(PENDING_TRANSACTIONS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_X_LINK_CHANGES_STORAGE_KEY);
  } catch {
    // ignore
  }
  emit();
}
