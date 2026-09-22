/**
 * X link changes the chain has confirmed but the API may not show yet.
 *
 * The indexer trails the node, so for a while after an unlink confirms, the
 * account record still lists the X handle. Anything that re-reads it in that
 * window (the profile editor does, every time it opens) would show the account
 * as linked again and offer to unlink it a second time. This remembers the
 * confirmed state per address until the API agrees, or until it is old enough
 * that the API is the better source again.
 *
 * In memory only: a reload starts clean, which is fine, since by then the
 * indexer has almost always caught up. It also means a note can never hide a
 * relink: linking X goes through X's sign-in page, a full-page redirect that
 * comes back to a fresh app.
 */

import { isTransactionMined } from '@/utils/apiRead';

/** Long enough to cover indexer lag; short enough never to mask a real change. */
export const CONFIRMED_X_LINK_TTL_MS = 10 * 60_000;

/** How often a tracked unlink checks whether its transaction is in a block. */
export const X_UNLINK_POLL_MS = 5_000;

/** A transaction not mined by then was dropped; stop showing it as on its way. */
export const X_UNLINK_TRACK_TIMEOUT_MS = 15 * 60_000;

type ConfirmedChange = { username: string | null; at: number };

const confirmed = new Map<string, ConfirmedChange>();

type PendingUnlink = { txHash: string; startedAt: number; timer: ReturnType<typeof setInterval> };

const pending = new Map<string, PendingUnlink>();

const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

/** For useSyncExternalStore: re-render when a tracked or confirmed change moves. */
export function subscribeXLinkChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Changes whenever any tracked or confirmed X link change does. */
export function xLinkChangesVersion(): number {
  return version;
}

const stopTracking = (address: string) => {
  const current = pending.get(address);
  if (current) clearInterval(current.timer);
  pending.delete(address);
};

const normalize = (username: string | null | undefined) => (
  username ? username.replace(/^@/u, '').toLowerCase() : null
);

/** Record a link state the chain has confirmed: a handle, or null for unlinked. */
export function rememberConfirmedXLink(address: string, username: string | null): void {
  stopTracking(address);
  confirmed.set(address, { username: normalize(username), at: Date.now() });
  emit();
}

/** The hash of an unlink for `address` still waiting to be mined, if any. */
export function pendingXUnlink(address: string): string | null {
  return pending.get(address)?.txHash ?? null;
}

/**
 * Watch an unlink transaction until it is mined, on its own.
 *
 * The top banner watches it too, but the banner holds one transaction at a
 * time: anything submitted afterwards (saving the profile, a tip) replaces it
 * and drops the unlink's confirmation. Kept here instead, the unlink shows as
 * on its way and then settles no matter what the banner is doing, and with
 * the editor open or closed.
 */
export function trackXUnlink(
  address: string,
  txHash: string,
  options: {
    onConfirmed?: () => void;
    isMined?: (hash: string) => Promise<boolean>;
  } = {},
): void {
  const isMined = options.isMined ?? isTransactionMined;
  stopTracking(address);
  let checking = false;

  const check = async () => {
    const current = pending.get(address);
    // Settled, replaced by a newer unlink, or cleared.
    if (!current || current.txHash !== txHash) return;
    if (Date.now() - current.startedAt > X_UNLINK_TRACK_TIMEOUT_MS) {
      stopTracking(address);
      emit();
      return;
    }
    if (checking) return;
    checking = true;
    let mined = false;
    try {
      mined = await isMined(txHash);
    } catch {
      // A failed read is not an answer; the next tick asks again.
    } finally {
      checking = false;
    }
    if (!mined || pending.get(address)?.txHash !== txHash) return;
    rememberConfirmedXLink(address, null);
    try {
      options.onConfirmed?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[x-unlink] onConfirmed failed', err);
    }
  };

  pending.set(address, {
    txHash,
    startedAt: Date.now(),
    timer: setInterval(check, X_UNLINK_POLL_MS),
  });
  emit();
  check();
}

/**
 * The X handle to show for `address`: what the API says, unless a change the
 * chain confirmed recently says otherwise. Stops overriding as soon as the API
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
  // The API still shows the state from before the confirmed change.
  return change.username;
}

type LinkState = { linked: boolean; username: string | null };

/**
 * The X link state to render, given whatever the component last loaded.
 *
 * Read-only, unlike {@link resolveXLink}: it never clears the note, because
 * local state agreeing proves nothing. A load that started before the chain
 * confirmed can still land afterwards with the old handle; resolving here, on
 * every render, keeps the confirmed state no matter which write came last.
 */
export function effectiveXLink(address: string, loaded: LinkState): LinkState {
  const change = confirmed.get(address);
  if (!change || Date.now() - change.at > CONFIRMED_X_LINK_TTL_MS) return loaded;
  return { linked: change.username !== null, username: change.username };
}

/** Test helper. */
export function clearConfirmedXLinks(): void {
  Array.from(pending.keys()).forEach(stopTracking);
  confirmed.clear();
  emit();
}
