/**
 * X link changes on their way to the API, and ones it has only just caught up on.
 *
 * Linking or unlinking X is an on-chain transaction, and every screen that
 * shows whether X is linked reads the backend, which learns about the change
 * from its own indexer. That takes a few minutes (it waits on the chain), and
 * in that window the account record still shows the old state. Anything that
 * re-read it would offer "Unlink" for an unlink already sent, or "Link" for a
 * link already sent.
 *
 * So a change is tracked from the moment it is broadcast until the account
 * record agrees with it, and every screen shows it as on its way until then.
 * It is kept in localStorage, so a reload picks the wait back up instead of
 * showing the stale state as if nothing had happened.
 */

import { SuperheroApi, getLinkedXUsername } from '@/api/backend';

/** How often a pending change asks the API whether it has caught up. */
export const X_LINK_CHANGE_POLL_MS = 10_000;

/**
 * The top of the 2–6 minutes people are told to expect: the backend indexes
 * on the chain's key blocks. Past it, the wait is described as running long.
 */
export const X_LINK_CHANGE_EXPECTED_MAX_MS = 6 * 60_000;

/**
 * Past this, stop showing the change as on its way and let the API speak for
 * itself: the transaction was dropped, or the indexer is down, and a wait
 * that never ends helps nobody.
 */
export const X_LINK_CHANGE_TIMEOUT_MS = 20 * 60_000;

/**
 * How long a settled change still overrides an older read. The editor's load
 * reads the account and then awaits more calls, so a read taken just before
 * the change settled can land just after it.
 */
export const CONFIRMED_X_LINK_TTL_MS = 10 * 60_000;

export const X_LINK_CHANGES_STORAGE_KEY = 'superhero:x-link-changes:v1';

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

const confirmed = new Map<string, ConfirmedChange>();
const pending = new Map<string, PendingXLinkChange>();
const timers = new Map<string, ReturnType<typeof setInterval>>();

const listeners = new Set<() => void>();
const settledListeners = new Set<(event: XLinkChangeSettledEvent) => void>();
let version = 0;
let loaded = false;

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const normalize = (username: string | null | undefined) => (
  username ? username.replace(/^@/u, '').toLowerCase() : null
);

// The account record, never a cached copy: this is the read that decides the
// wait is over.
const readLinkedUsernameFromApi: ReadLinkedUsername = async (address) => getLinkedXUsername(
  await SuperheroApi.getAccount(address, { cache: 'no-store' }),
);

const isPendingChange = (value: any): value is PendingXLinkChange => Boolean(
  value
  && (value.kind === 'link' || value.kind === 'unlink')
  && typeof value.txHash === 'string' && value.txHash
  && (value.username === null || typeof value.username === 'string')
  && Number.isFinite(value.startedAt),
);

// Storage can be missing, full, or blocked (private mode); the in-memory
// state still works for this page load either way.
const persist = () => {
  try {
    if (!pending.size) {
      window.localStorage.removeItem(X_LINK_CHANGES_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      X_LINK_CHANGES_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(pending)),
    );
  } catch {
    // ignore
  }
};

const ensureLoaded = () => {
  if (loaded) return;
  loaded = true;
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(X_LINK_CHANGES_STORAGE_KEY) || '{}') || {};
  } catch {
    stored = {};
  }
  const now = Date.now();
  Object.entries(stored).forEach(([address, value]) => {
    if (isPendingChange(value) && now - value.startedAt <= X_LINK_CHANGE_TIMEOUT_MS) {
      pending.set(address, value);
    }
  });
  // Drops anything malformed or expired from storage too.
  persist();
};

const stopPolling = (address: string) => {
  const timer = timers.get(address);
  if (timer) clearInterval(timer);
  timers.delete(address);
};

const finish = (
  address: string,
  change: PendingXLinkChange,
  outcome: XLinkChangeOutcome,
  username: string | null,
) => {
  stopPolling(address);
  pending.delete(address);
  persist();
  if (outcome === 'settled') {
    confirmed.set(address, { username: normalize(username), at: Date.now() });
  }
  emit();
  const event = {
    address, change, outcome, username,
  };
  settledListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[x-link] settled listener failed', err);
    }
  });
};

const startPolling = (
  address: string,
  change: PendingXLinkChange,
  readLinkedUsername: ReadLinkedUsername,
) => {
  stopPolling(address);
  let checking = false;

  const check = async () => {
    // Settled, replaced by a newer change, or cleared.
    if (pending.get(address) !== change) return;
    if (Date.now() - change.startedAt > X_LINK_CHANGE_TIMEOUT_MS) {
      finish(address, change, 'timed_out', null);
      return;
    }
    if (checking) return;
    checking = true;
    let linked: string | null;
    try {
      linked = await readLinkedUsername(address);
    } catch {
      // A failed read is not an answer; the next tick asks again.
      return;
    } finally {
      checking = false;
    }
    if (pending.get(address) !== change) return;
    const done = change.kind === 'unlink' ? !linked : Boolean(linked);
    if (done) finish(address, change, 'settled', linked);
  };

  timers.set(address, setInterval(check, X_LINK_CHANGE_POLL_MS));
  check();
};

/** For useSyncExternalStore: re-render when a pending or settled change moves. */
export function subscribeXLinkChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Changes whenever any pending or settled X link change does. */
export function xLinkChangesVersion(): number {
  return version;
}

/**
 * Runs once for each change that stops being pending: when the API has caught
 * up ('settled'), or when it is given up on ('timed_out').
 */
export function onXLinkChangeSettled(
  listener: (event: XLinkChangeSettledEvent) => void,
): () => void {
  settledListeners.add(listener);
  return () => { settledListeners.delete(listener); };
}

/** The X link change for `address` still on its way to the API, if any. */
export function pendingXLinkChange(address: string | null | undefined): PendingXLinkChange | null {
  if (!address) return null;
  ensureLoaded();
  return pending.get(address) ?? null;
}

/**
 * Start tracking a broadcast link or unlink until the API shows it. Replaces
 * any change already tracked for the address.
 */
export function trackXLinkChange(
  address: string,
  change: { kind: XLinkChangeKind; txHash: string; username?: string | null },
  options: { readLinkedUsername?: ReadLinkedUsername } = {},
): PendingXLinkChange {
  ensureLoaded();
  const entry: PendingXLinkChange = {
    kind: change.kind,
    txHash: change.txHash,
    username: change.kind === 'unlink' ? normalize(change.username) : null,
    startedAt: Date.now(),
  };
  pending.set(address, entry);
  // A newer change makes any earlier settled state moot.
  confirmed.delete(address);
  persist();
  emit();
  startPolling(address, entry, options.readLinkedUsername ?? readLinkedUsernameFromApi);
  return entry;
}

/**
 * Pick up the changes a previous page load left pending. Safe to call more
 * than once: a change already being polled is left alone.
 */
export function resumeXLinkChanges(
  options: { readLinkedUsername?: ReadLinkedUsername } = {},
): void {
  ensureLoaded();
  Array.from(pending.entries()).forEach(([address, change]) => {
    if (timers.has(address)) return;
    startPolling(address, change, options.readLinkedUsername ?? readLinkedUsernameFromApi);
  });
}

/**
 * Record a link state known to be final without waiting on the API: a handle,
 * or null for unlinked. Ends any pending change for the address.
 */
export function rememberConfirmedXLink(address: string, username: string | null): void {
  ensureLoaded();
  stopPolling(address);
  if (pending.delete(address)) persist();
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
  Array.from(timers.keys()).forEach(stopPolling);
  pending.clear();
  confirmed.clear();
  loaded = false;
  try {
    window.localStorage.removeItem(X_LINK_CHANGES_STORAGE_KEY);
  } catch {
    // ignore
  }
  emit();
}
