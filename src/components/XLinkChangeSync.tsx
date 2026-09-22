import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { useRefreshXLinkState } from '@/hooks/useRefreshXLinkState';
import {
  TxPayloadType,
  useTransactionNotification,
  type NotificationState,
  type TxPayload,
} from '@/features/transaction-notification';
import {
  onXLinkChangeSettled,
  pendingXLinkChange,
  resumeXLinkChanges,
  type PendingXLinkChange,
} from '@/utils/confirmedXLink';

/** The banner payload for a pending X link change. */
export function xLinkChangePayload(change: PendingXLinkChange): TxPayload {
  return change.kind === 'link'
    ? { type: TxPayloadType.LinkX, startedAt: change.startedAt }
    : { type: TxPayloadType.UnlinkX, startedAt: change.startedAt };
}

/**
 * Whether the banner is showing this change exactly, not just any link or
 * unlink: every stored wallet is polled, and one wallet's change must never
 * settle or clear another's.
 */
function bannerShowsChange(banner: NotificationState, change: PendingXLinkChange): boolean {
  if (banner.status !== 'pending') return false;
  const { payload } = banner;
  return payload.type === xLinkChangePayload(change).type
    && 'startedAt' in payload
    && payload.startedAt === change.startedAt;
}

/** An X link or unlink in the banner, still waiting or just announced. */
function isXLinkBanner(banner: NotificationState): boolean {
  if (banner.status !== 'pending' && banner.status !== 'confirmed') return false;
  return banner.payload.type === TxPayloadType.LinkX
    || banner.payload.type === TxPayloadType.UnlinkX;
}

/**
 * Carries X link changes across the whole app, and across reloads.
 *
 * - Picks up changes a previous page load left pending, so a reload keeps
 *   waiting on them instead of showing the account's old state as current.
 * - When one settles, refetches everything that shows the X link, whichever
 *   page is open, and turns the banner into "X account linked/unlinked".
 * - After a reload, puts the pending change back in the banner for the
 *   connected wallet, with how long it has been so far.
 */
export const XLinkChangeSync = () => {
  const refreshXLinkState = useRefreshXLinkState();
  const activeAccount = useAtomValue(activeAccountAtom);
  const {
    notificationState, notifyPending, notifyConfirmed, dismissNotification,
  } = useTransactionNotification();
  // Read at settle time, not captured when the listener was registered.
  const bannerRef = useRef(notificationState);
  bannerRef.current = notificationState;
  const accountRef = useRef(activeAccount);
  accountRef.current = activeAccount;

  useEffect(() => { resumeXLinkChanges(); }, []);

  useEffect(() => onXLinkChangeSettled(({ address, change, outcome }) => {
    refreshXLinkState(address);
    const payload = xLinkChangePayload(change);
    const banner = bannerRef.current;
    const bannerShowsIt = bannerShowsChange(banner, change);
    if (outcome === 'timed_out') {
      // Nothing true to announce; stop claiming it is on its way.
      if (bannerShowsIt) dismissNotification();
      return;
    }
    // Only ever to the wallet it happened to. Another wallet connected: the
    // screens update, and a wait still showing for this change is cleared
    // rather than left spinning (it can get there when the wallet is
    // switched while this one's signature is still out). Another
    // transaction owning the banner: it is left alone.
    if (address !== accountRef.current) {
      if (bannerShowsIt) dismissNotification();
      return;
    }
    if (bannerShowsIt || banner.status === 'idle') notifyConfirmed(payload);
  }), [dismissNotification, notifyConfirmed, refreshXLinkState]);

  // On a switch to another wallet (or none), an X link banner left by the
  // previous one, still waiting or just announcing "linked/unlinked", is not
  // this wallet's: clear it. Then, once per visit to a wallet, show its own
  // wait if it has one: after a reload the banner starts empty, and after a
  // switch it is this wallet's turn. If another transaction holds the
  // banner, the wait is shown when it lets go. Not again once dismissed.
  const switchedTo = useRef<string | null | undefined>(undefined);
  const restoredFor = useRef<string | null | undefined>(undefined);
  const bannerStatus = notificationState.status;
  useEffect(() => {
    const account = activeAccount || null;
    const change = pendingXLinkChange(account);
    let banner = bannerRef.current;
    if (switchedTo.current !== account) {
      // The first wallet seen is not a switch away from anything.
      const switched = switchedTo.current !== undefined;
      switchedTo.current = account;
      // Every visit to a wallet gets its own restore. Otherwise a restore put
      // off for one wallet leaves the last wallet marked as done, and
      // switching back to it would never show its wait again.
      restoredFor.current = undefined;
      if (switched && isXLinkBanner(banner) && !(change && bannerShowsChange(banner, change))) {
        dismissNotification();
        banner = { status: 'idle' };
      }
    }
    if (restoredFor.current === account) return;
    if (!change || bannerShowsChange(banner, change)) {
      restoredFor.current = account;
      return;
    }
    // Held by another transaction: wait for it to let go.
    if (banner.status !== 'idle') return;
    restoredFor.current = account;
    notifyPending(xLinkChangePayload(change));
  }, [activeAccount, bannerStatus, dismissNotification, notifyPending]);

  return null;
};

export default XLinkChangeSync;
